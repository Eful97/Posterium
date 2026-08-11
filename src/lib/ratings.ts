import crypto from "node:crypto"
import { cacheGet, cacheSet } from "./cache"
import { createLogger } from "@/lib/logger"

const log = createLogger("ratings")

const MDBLIST = "https://mdblist.com/api"

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
    const res = await fetch(
      `${MDBLIST}/${qs}`,
      { signal: signal ?? AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const raw = await res.json()
      const data = raw?.data ?? raw

      const ratings = data?.ratings
      if (Array.isArray(ratings) && ratings.length > 0) {
        const MAJOR = new Set(["imdb", "tmdb"])
        const sources: Record<string, number> = {}
        const values: number[] = []

        for (const item of ratings) {
          const src = (item?.source || item?.name || item?.provider || "").toLowerCase()
          if (!MAJOR.has(src)) continue
          const rawV = item?.value ?? item?.rating ?? item?.score
          const v = typeof rawV === "number" ? rawV : parseFloat(rawV)
          if (isNaN(v) || v <= 0) continue
          if (!sources[src]) {
            const normalized = toTen(v)
            sources[src] = normalized
            values.push(normalized)
          }
        }

        if (values.length > 0) {
          const result: AggregatedRatings = {
            sources,
            average: avg(values),
            count: values.length,
          }
          cacheSet(cacheKey, result, ["mdb"])
          return result
        }
      }
    }
  } catch (e) { log.error("MDBList fetch failed", { error: e instanceof Error ? e.message : String(e) }) }

  return null
}
