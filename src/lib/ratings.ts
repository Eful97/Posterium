import { cacheGet, cacheSet } from "./cache"

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
  apiKey?: string
): Promise<AggregatedRatings | null> {
  if (!imdbId) return null

  const cacheKey = `mdb:ratings:${imdbId}`
  const cached = cacheGet<AggregatedRatings>(cacheKey)
  if (cached) return cached

  const key = apiKey || process.env.MDBLIST_API_KEY
  const qs = key ? `?apikey=${encodeURIComponent(key)}&i=${encodeURIComponent(imdbId)}` : `?i=${encodeURIComponent(imdbId)}`

  try {
    const res = await fetch(
      `${MDBLIST}/${qs}`,
      { signal: AbortSignal.timeout(8000) }
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
  } catch (e) { console.error("[ratings] MDBList fetch failed:", e) }

  return null
}
