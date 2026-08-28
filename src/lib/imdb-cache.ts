import { getExternalIds } from "@/lib/tmdb"

interface ImdbCacheEntry {
  value: string | null
  expiry: number
}

const IMDB_ID_CACHE_MAX = 2000
const imdbIdCache = new Map<string, ImdbCacheEntry>()

function imdbIdCacheSet(key: string, value: string | null, ttlMs: number): void {
  if (imdbIdCache.size >= IMDB_ID_CACHE_MAX) {
    const oldest = imdbIdCache.keys().next().value
    if (oldest !== undefined) imdbIdCache.delete(oldest)
  }
  imdbIdCache.set(key, { value, expiry: Date.now() + ttlMs })
}

export async function resolveImdbId(mediaType: "movie" | "tv", tmdbId: number, apiKey?: string): Promise<string | null> {
  const cacheKey = `${mediaType}:${tmdbId}`
  const cached = imdbIdCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) return cached.value
  try {
    const result = await getExternalIds(mediaType, tmdbId, apiKey).then((r) => r.imdb_id ?? null)
    const ttl = result !== null ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    imdbIdCacheSet(cacheKey, result, ttl)
    return result
  } catch {
    imdbIdCacheSet(cacheKey, null, 60_000)
    return null
  }
}

export function __clearImdbCache(): void {
  imdbIdCache.clear()
}
