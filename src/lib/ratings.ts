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
  const key = apiKey || process.env.MDBLIST_API_KEY
  if (!key || !imdbId) return null

  const cacheKey = `mdb:ratings:${imdbId}`
  const cached = cacheGet<AggregatedRatings>(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(
      `${MDBLIST}/?apikey=${encodeURIComponent(key)}&i=${encodeURIComponent(imdbId)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()

    const ratings = data?.ratings
    if (!Array.isArray(ratings) || ratings.length === 0) return null

    // Prefer MDBList's own weighted score (may be 0-100 or 0-10)
    const mdbScore = data?.score ?? data?.mdblist_score ?? data?.mdblist
    if (typeof mdbScore === "number" && mdbScore > 0) {
      const normalized = toTen(mdbScore)
      if (normalized > 0 && normalized <= 10) {
        const result: AggregatedRatings = {
          sources: { mdblist: normalized },
          average: normalized,
          count: 1,
        }
        cacheSet(cacheKey, result, ["mdb"])
        return result
      }
    }

    // Fallback: average of major sources only
    const MAJOR = new Set(["imdb", "tmdb", "metacritic", "rotten_tomatoes", "letterboxd", "trakt"])
    const sources: Record<string, number> = {}
    const values: number[] = []

    for (const item of ratings) {
      const src = (item?.source || item?.name || item?.provider || "").toLowerCase()
      if (!MAJOR.has(src)) continue
      const raw = item?.value ?? item?.rating ?? item?.score
      const v = typeof raw === "number" ? raw : parseFloat(raw)
      if (isNaN(v) || v <= 0) continue
      if (!sources[src]) {
        const normalized = toTen(v)
        sources[src] = normalized
        values.push(normalized)
      }
    }

    if (values.length === 0) return null

    const result: AggregatedRatings = {
      sources,
      average: avg(values),
      count: values.length,
    }
    cacheSet(cacheKey, result, ["mdb"])
    return result
  } catch {
    return null
  }
}
