import crypto from "node:crypto"
import { cacheGet, cacheSet } from "./cache"
import { createLogger } from "@/lib/logger"

const log = createLogger("ratings")

const MDBLIST = "https://mdblist.com/api"

export const SUPPORTED_RATING_SOURCES = [
  "imdb",
  "tmdb",
  "mdblist",
  "tomatoes",
  "popcorntime",
  "letterboxd",
  "metacritic",
  "metacriticuser",
  "trakt",
  "simkl",
  "filmweb",
  "filmwebcritics",
  "rogerebert",
  "mal",
  "anilist",
  "kitsu",
] as const

export type RatingSource = (typeof SUPPORTED_RATING_SOURCES)[number]

export const DEFAULT_RATING_SOURCES: RatingSource[] = ["imdb", "tmdb"]

export const UI_RATING_SOURCES: { id: RatingSource; labelKey: string; emoji: string }[] = [
  { id: "imdb", labelKey: "ui.source_imdb", emoji: "⭐" },
  { id: "tmdb", labelKey: "ui.source_tmdb", emoji: "🌐" },
  { id: "mdblist", labelKey: "ui.source_mdblist", emoji: "📊" },
  { id: "tomatoes", labelKey: "ui.source_tomatoes", emoji: "🍅" },
  { id: "popcorntime", labelKey: "ui.source_popcorntime", emoji: "🍿" },
  { id: "letterboxd", labelKey: "ui.source_letterboxd", emoji: "👁️" },
  { id: "metacritic", labelKey: "ui.source_metacritic", emoji: "🎯" },
  { id: "metacriticuser", labelKey: "ui.source_metacriticuser", emoji: "👥" },
  { id: "trakt", labelKey: "ui.source_trakt", emoji: "📺" },
  { id: "simkl", labelKey: "ui.source_simkl", emoji: "⚡" },
  { id: "filmweb", labelKey: "ui.source_filmweb", emoji: "🎥" },
  { id: "filmwebcritics", labelKey: "ui.source_filmwebcritics", emoji: "🖋️" },
  { id: "rogerebert", labelKey: "ui.source_rogerebert", emoji: "🎖️" },
  { id: "mal", labelKey: "ui.source_mal", emoji: "🌸" },
  { id: "anilist", labelKey: "ui.source_anilist", emoji: "💫" },
  { id: "kitsu", labelKey: "ui.source_kitsu", emoji: "🦊" },
]

export interface AggregatedRatings {
  sources: Record<string, number>
  average: number
  count: number
}

function toTen(v: number): number {
  return v > 10 ? v / 10 : v
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function calculateAverageRating(
  ratings: AggregatedRatings | null,
  requestedSources?: string[]
): number | null {
  if (!ratings || !ratings.sources) return null
  const targetSources = requestedSources && requestedSources.length > 0
    ? requestedSources.map((s) => {
        const lower = s.toLowerCase()
        if (lower === "tomatoesaudience" || lower === "popcorn") return "popcorntime"
        if (lower === "myanimelist") return "mal"
        return lower
      })
    : DEFAULT_RATING_SOURCES

  const values: number[] = []
  for (const src of targetSources) {
    const val = ratings.sources[src]
    if (typeof val === "number" && !isNaN(val) && val > 0) {
      values.push(val)
    }
  }

  if (values.length === 0) return null
  return avg(values)
}

export async function fetchAggregatedRating(
  imdbId: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<AggregatedRatings | null> {
  if (!imdbId) return null

  // Solo la chiave esplicita della richiesta: non esiste più chiave d'istanza.
  const key = apiKey
  // La key MDBList cambia il voto aggregato → parte del cache key (hash, mai
  // plaintext). Altrimenti due contesti con key diverse collidono (D4).
  const keyHash = key ? crypto.createHash("sha1").update(key).digest("hex").slice(0, 8) : "nomk"
  const cacheKey = `mdb:ratings:${imdbId}:${keyHash}`
  const cached = cacheGet<AggregatedRatings>(cacheKey)
  if (cached) return cached

  const qs = key ? `?apikey=${encodeURIComponent(key)}&i=${encodeURIComponent(imdbId)}` : `?i=${encodeURIComponent(imdbId)}`

  try {
    const timeoutSignal = AbortSignal.timeout(8000)
    let combined: AbortSignal = timeoutSignal
    if (signal) {
      if (typeof (AbortSignal as unknown as { any?: unknown }).any === "function") {
        combined = (AbortSignal as unknown as { any: (s: AbortSignal[]) => AbortSignal }).any([signal, timeoutSignal])
      } else {
        const ctrl = new AbortController()
        const onAbort = () => ctrl.abort((signal as unknown as { reason?: unknown })?.reason ?? timeoutSignal.reason)
        if (signal.aborted || timeoutSignal.aborted) ctrl.abort()
        else {
          signal.addEventListener("abort", onAbort, { once: true })
          timeoutSignal.addEventListener("abort", onAbort, { once: true })
        }
        combined = ctrl.signal
      }
    }
    const res = await fetch(
      `${MDBLIST}/${qs}`,
      { signal: combined }
    )
    if (res.ok) {
      const raw = await res.json()
      const data = raw?.data ?? raw

      const ratings = data?.ratings
      const sources: Record<string, number> = {}
      const defaultValues: number[] = []

      // If root data has mdblist score/rating
      const rootScore = typeof data?.score === "number" ? data.score : parseFloat(data?.score)
      if (!isNaN(rootScore) && rootScore > 0) {
        sources.mdblist = Math.round((rootScore > 10 ? rootScore / 10 : rootScore) * 10) / 10
      }

      if (Array.isArray(ratings) && ratings.length > 0) {
        const ALL_SOURCES = new Set<string>(SUPPORTED_RATING_SOURCES)

        for (const item of ratings) {
          let src = (item?.source || item?.name || item?.provider || "").toLowerCase().replace(/[-_]/g, "")
          if (src === "myanimelist") src = "mal"
          if (src === "popcorn" || src === "rtaudience" || src === "audience" || src === "tomatoesaudience") src = "popcorntime"
          if (!ALL_SOURCES.has(src)) continue

          let normalized: number | null = null
          const rawScore = item?.score
          const scoreNum = typeof rawScore === "number" ? rawScore : parseFloat(rawScore)
          if (!isNaN(scoreNum) && scoreNum > 0) {
            normalized = scoreNum > 10 ? scoreNum / 10 : scoreNum
          } else {
            const rawV = item?.value ?? item?.rating
            const v = typeof rawV === "number" ? rawV : parseFloat(rawV)
            if (!isNaN(v) && v > 0) {
              if (src === "letterboxd" && v <= 5) {
                normalized = v * 2
              } else if (src === "rogerebert" && v <= 4) {
                normalized = v * 2.5
              } else {
                normalized = toTen(v)
              }
            }
          }

          if (normalized !== null && !isNaN(normalized) && normalized > 0 && !sources[src]) {
            sources[src] = Math.round(normalized * 10) / 10
            if (src === "imdb" || src === "tmdb") {
              defaultValues.push(sources[src])
            }
          }
        }
      }

      if (Object.keys(sources).length > 0) {
        const fallbackValues = Object.values(sources)
        const valuesToAvg = defaultValues.length > 0 ? defaultValues : fallbackValues
        const result: AggregatedRatings = {
          sources,
          average: avg(valuesToAvg),
          count: Object.keys(sources).length,
        }
        cacheSet(cacheKey, result, ["mdb"])
        return result
      }
    }
  } catch (e) { log.error("MDBList fetch failed", { error: e instanceof Error ? e.message : String(e) }) }

  return null
}
