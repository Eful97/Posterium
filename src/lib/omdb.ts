import { cacheGet, cacheSet } from "./cache"

const OMDb = "https://www.omdbapi.com"

export async function fetchImdbRating(imdbId: string): Promise<number | null> {
  if (!imdbId) return null
  const key = process.env.OMDB_API_KEY
  if (!key) return null
  const cacheKey = `imdb:rating:${imdbId}`
  const cached = cacheGet<number>(cacheKey)
  if (cached !== undefined && cached !== null) return cached

  try {
    const res = await fetch(`${OMDb}/?i=${imdbId}&apikey=${key}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.Response === "False") return null
    const r = parseFloat(data.imdbRating)
    if (isNaN(r)) return null
    cacheSet(cacheKey, r, ["imdb"])
    return r
  } catch {
    return null
  }
}
