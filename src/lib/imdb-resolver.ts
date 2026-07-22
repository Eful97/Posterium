import { cacheGet, cacheSet } from "./cache"

export async function resolveImdbToTmdb(imdbId: string, mediaType: "movie" | "tv"): Promise<number | null> {
  const cleanId = imdbId.trim()
  if (!cleanId.startsWith("tt")) return null

  const cacheKey = `imdb:tmdb:${cleanId}:${mediaType}`
  const cached = cacheGet<number>(cacheKey)
  if (cached) return cached

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return null

  try {
    const url = `https://api.themoviedb.org/3/find/${cleanId}?api_key=${apiKey}&external_source=imdb_id`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()

    let tmdbId: number | undefined
    if (mediaType === "movie") {
      tmdbId = data.movie_results?.[0]?.id
    } else {
      tmdbId = data.tv_results?.[0]?.id || data.movie_results?.[0]?.id
    }

    if (tmdbId && typeof tmdbId === "number" && tmdbId > 0) {
      cacheSet(cacheKey, tmdbId, ["tmdb", "imdb"], 86400 * 7)
      return tmdbId
    }
  } catch (e) {
    console.error(`[imdb-resolver] Failed to resolve ${cleanId}:`, e)
  }

  return null
}
