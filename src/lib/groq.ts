import crypto from "node:crypto"
import { cacheGet, cacheSet } from "@/lib/cache"
import { searchMulti, searchMovies, searchTV, type TMDBMediaResult } from "@/lib/tmdb"
import { toSearchResult, type SearchResult } from "@/lib/types"
import { createLogger } from "@/lib/logger"

const log = createLogger("groq")

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const PRIMARY_MODEL = "groq/compound"
const FALLBACK_MODEL = "groq/compound-mini"

export interface GroqRecommendation {
  title: string
  original_title?: string
  year?: number
  type?: "movie" | "tv"
}

export interface GroqAiResponse {
  thought?: string
  recommendations: GroqRecommendation[]
}

export interface AiSearchResult {
  results: SearchResult[]
  explanation: string
  query: string
  model: string
  error?: string
}

function getGroqApiKey(): string {
  return process.env.POSTERIUM_GROQ_KEY || process.env.GROQ_API_KEY || ""
}

function hashKey(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 12)
}

/**
 * Estrae il JSON dalla risposta del modello. Alcuni modelli Groq (es.
 * `groq/compound`) possono ignorare `response_format: json_object` e
 * incapsulare il JSON in fenced block (```json ... ```) o aggiungere testo.
 * Prima tenta un parse diretto; se fallisce, estrae il primo oggetto/array
 * JSON racchiuso tra { } (o [ ]) e riprova.
 */
function extractJsonObject(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // rimuovi eventuali fenced code block (```json ... ```)
    const stripped = text.replace(/```(?:json)?/gi, "").trim()
    // trova il primo { e l'ultimo } come oggetto JSON più esterno
    const firstBrace = stripped.indexOf("{")
    const lastBrace = stripped.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = stripped.slice(firstBrace, lastBrace + 1)
      try {
        return JSON.parse(candidate)
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Interroga l'API Groq per ottenere raccomandazioni semantiche in linguaggio naturale
 */
async function fetchGroqCompletion(
  prompt: string,
  apiKey: string,
  model: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string } | null> {
  const systemPrompt = `You are a film and television recommendation expert for Posterium, a cinematic poster generator and Stremio addon.
Given a user query in any language (Italian, English, Spanish, etc.), understand the user's intent (genres, plot concepts, visual aesthetic, mood, similar movies/series, directors, actors, awards, time period).
Identify 10 to 15 real, high-quality matching movies and TV series that best answer the query.

You MUST reply with valid JSON only matching this schema:
{
  "thought": "A concise 1-2 sentence explanation in the user's language describing why these titles were picked.",
  "recommendations": [
    {
      "title": "Main Title (English or International for accurate database search)",
      "original_title": "Original title if different",
      "year": 2021,
      "type": "movie" | "tv"
    }
  ]
}`

  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1024,
  }

  // Hard timeout: groq/compound è un sistema agentico più lento e rate-limitato
  // (200 RPM su developer). Meglio fallire veloce e ricadere sul modello/percorso
  // normale piuttosto che bloccare una ricerca Stremio sincrona.
  const timeout = AbortSignal.timeout(8000)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let res: Response
  try {
    res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: combined,
    })
  } catch (e) {
    // Timeout/abort/network: fallback al modello successivo senza sollevare.
    log.warn(`Groq request aborted/failed for model ${model}: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "")
    log.warn(`Groq request failed for model ${model} [${res.status}]: ${errorText.slice(0, 200)}`)
    return null
  }

  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content
  if (!text) return null
  return { text, model }
}

/**
 * Cerca un titolo consigliato su TMDB per ottenere la scheda completa con poster
 */
async function resolveRecommendationToTmdb(
  rec: GroqRecommendation,
  language: string,
  tmdbApiKey?: string
): Promise<SearchResult | null> {
  try {
    const query = (rec.title || rec.original_title || "").trim()
    if (!query) return null

    let candidates: TMDBMediaResult[] = []

    if (rec.type === "movie") {
      const res = await searchMovies(query, language, tmdbApiKey, 1)
      candidates = (res?.results || []).filter((r) => r.poster_path)
    } else if (rec.type === "tv") {
      const res = await searchTV(query, language, tmdbApiKey, 1)
      candidates = (res?.results || []).filter((r) => r.poster_path)
    } else {
      const res = await searchMulti(query, language, tmdbApiKey, 1)
      candidates = (res?.results || []).filter(
        (r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path
      )
    }

    if (!candidates || candidates.length === 0) {
      if (rec.original_title && rec.original_title !== rec.title) {
        const fallbackRes = await searchMulti(rec.original_title, language, tmdbApiKey, 1)
        candidates = (fallbackRes?.results || []).filter(
          (r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path
        )
      }
    }

    if (!candidates || candidates.length === 0) return null

    // Se abbiamo l'anno, cerca corrispondenza ravvicinata
    if (rec.year) {
      const matchYear = candidates.find((c) => {
        const date = c.release_date || c.first_air_date
        if (!date) return false
        const year = parseInt(date.slice(0, 4), 10)
        return Math.abs(year - rec.year!) <= 1
      })
      if (matchYear) return toSearchResult(matchYear)
    }

    // Altrimenti prendi il primo risultato valido con poster
    return toSearchResult(candidates[0])
  } catch {
    return null
  }
}

/**
 * Esegue la ricerca semantica con Groq AI e arricchisce i risultati con TMDB
 */
export async function searchAi(
  query: string,
  language = "it-IT",
  tmdbApiKey?: string,
  signal?: AbortSignal
): Promise<AiSearchResult> {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    return { results: [], explanation: "", query: cleanQuery, model: "" }
  }

  const groqApiKey = getGroqApiKey()
  if (!groqApiKey) {
    return {
      results: [],
      explanation: "",
      query: cleanQuery,
      model: "",
      error: "missing_api_key",
    }
  }

  const cacheKey = `groq:ai_search:${hashKey(cleanQuery.toLowerCase() + ":" + language)}`
  const cached = cacheGet<AiSearchResult>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // 1. Chiama Groq LLM (modello primario, fallback se fallisce)
    let completion = await fetchGroqCompletion(cleanQuery, groqApiKey, PRIMARY_MODEL, signal)
    if (!completion) {
      log.info(`Attempting fallback model ${FALLBACK_MODEL}...`)
      completion = await fetchGroqCompletion(cleanQuery, groqApiKey, FALLBACK_MODEL, signal)
    }

    if (!completion) {
      return {
        results: [],
        explanation: "",
        query: cleanQuery,
        model: "",
        error: "groq_api_error",
      }
    }

    // 2. Parsa il JSON restituito da Groq (tollerante a fenced block / testo extra)
    const parsedRaw = extractJsonObject(completion.text)
    if (parsedRaw === null || typeof parsedRaw !== "object") {
      log.warn("Failed to parse Groq JSON response:", { sample: completion.text.slice(0, 200) })
      return {
        results: [],
        explanation: "",
        query: cleanQuery,
        model: completion.model,
        error: "invalid_response",
      }
    }
    const parsed = parsedRaw as GroqAiResponse

    const recommendations = Array.isArray(parsed?.recommendations) ? parsed.recommendations : []
    const explanation = parsed?.thought || ""

    if (recommendations.length === 0) {
      return {
        results: [],
        explanation,
        query: cleanQuery,
        model: completion.model,
      }
    }

    // 3. Risoluzione parallela su TMDB
    const promises = recommendations.slice(0, 15).map((rec) =>
      resolveRecommendationToTmdb(rec, language, tmdbApiKey)
    )

    const settled = await Promise.allSettled(promises)
    const seen = new Set<string>()
    const results: SearchResult[] = []

    for (const item of settled) {
      if (item.status === "fulfilled" && item.value && item.value.id) {
        const key = `${item.value.media_type}:${item.value.id}`
        if (!seen.has(key)) {
          seen.add(key)
          results.push(item.value)
        }
      }
    }

    const payload: AiSearchResult = {
      results,
      explanation,
      query: cleanQuery,
      model: completion.model,
    }

    // Cache per 1 ora
    cacheSet(cacheKey, payload, ["ai", "groq", "search"], 3600)
    return payload
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error(`AI Search exception: ${message}`)
    return {
      results: [],
      explanation: "",
      query: cleanQuery,
      model: "",
      error: message,
    }
  }
}
