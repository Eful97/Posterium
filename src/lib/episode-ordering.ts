import type { TMDBEpisodeGroupDetails } from "@/lib/tmdb"
import type { StremioVideo } from "@/lib/meta-handler"
import { posterUrl } from "@/lib/tmdb"
import { getTvdbEpisodes, getTvdbSeriesId, formatTvdbImageUrl } from "@/lib/tvdb"

type PreviewVideo = StremioVideo

/**
 * Risolve il seasonNumber per un gruppo TMDB considerando
 * la quirks "order 0 vs 1" e lo special 0 → S0.
 * Estratta da meta-handler + preview per evitare drift (Re:ZERO fix).
 */
export function resolveSeasonNumbers(groups: TMDBEpisodeGroupDetails["groups"]): {
  sorted: TMDBEpisodeGroupDetails["groups"]
  hasZero: boolean
  hasSpecials: boolean
} {
  const sorted = [...groups].sort((a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0))
  const hasZero = sorted.some((g) => g.order === 0)
  const hasSpecials = sorted.some((g) => g.name?.toLowerCase().includes("special"))
  return { sorted, hasZero, hasSpecials }
}

export function seasonNumberForGroup(
  grp: TMDBEpisodeGroupDetails["groups"][number],
  idx: number,
  sorted: TMDBEpisodeGroupDetails["groups"],
  hasZero: boolean,
  hasSpecials: boolean
): number {
  if (typeof grp.order === "number") {
    if (hasSpecials && grp.name?.toLowerCase().includes("special") && grp.order === 0) return 0
    if (hasZero) return hasSpecials ? grp.order : grp.order + 1
    return grp.order
  }
  return idx + 1
}

/**
 * Costruisce i video Stremio da un Episode Group TMDB.
 * Condivisa tra meta-handler e preview per WYSIWYG sync.
 */
export function buildVideosFromGroups(
  groupDetails: TMDBEpisodeGroupDetails,
  primaryId: string
): PreviewVideo[] {
  const videos: PreviewVideo[] = []
  const nonEmpty = groupDetails.groups.filter((g) => g.episodes && g.episodes.length > 0)
  const groupsForMeta = nonEmpty.length > 0 ? nonEmpty : groupDetails.groups
  const { sorted, hasZero, hasSpecials } = resolveSeasonNumbers(groupsForMeta)

  for (let gIdx = 0; gIdx < sorted.length; gIdx++) {
    const grp = sorted[gIdx]
    const seasonNumber = seasonNumberForGroup(grp, gIdx, sorted, hasZero, hasSpecials)
    const sortedEps = [...(grp.episodes || [])].sort((a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0))
    for (let epIdx = 0; epIdx < sortedEps.length; epIdx++) {
      const ep = sortedEps[epIdx]
      const episodeNumber = typeof ep.order === "number" ? ep.order + 1 : epIdx + 1
      videos.push({
        id: `${primaryId}:${seasonNumber}:${episodeNumber}`,
        name: ep.name || `Episodio ${episodeNumber}`,
        season: seasonNumber,
        episode: episodeNumber,
        overview: ep.overview || undefined,
        thumbnail: ep.still_path ? posterUrl(ep.still_path, "w500") : undefined,
        released: ep.air_date ? `${ep.air_date}T00:00:00.000Z` : undefined,
        rating: ep.vote_average ? ep.vote_average.toFixed(1) : undefined,
      })
    }
  }
  return videos
}

/**
 * Esegue una mappatura concorrente limitata (default 5) per evitare burst TMDB
 * su serie con molte stagioni (es. One Piece 20+ stagioni).
 */
export async function concurrentMap<T, R>(items: T[], fn: (item: T, idx: number) => Promise<R>, limit = 5): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[]
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

const ANIZIP_CACHE = new Map<string, { value: unknown; expiry: number }>()
const ANIZIP_TTL_MS = 6 * 60 * 60 * 1000
const ANIZIP_MAX = 200

function anizipCacheGet(key: string): unknown | undefined {
  const e = ANIZIP_CACHE.get(key)
  if (!e || Date.now() > e.expiry) {
    if (e) ANIZIP_CACHE.delete(key)
    return undefined
  }
  return e.value
}
function anizipCacheSet(key: string, value: unknown) {
  if (ANIZIP_CACHE.size >= ANIZIP_MAX) {
    const oldest = ANIZIP_CACHE.keys().next().value as string | undefined
    if (oldest) ANIZIP_CACHE.delete(oldest)
  }
  ANIZIP_CACHE.set(key, { value, expiry: Date.now() + ANIZIP_TTL_MS })
}

interface AnizipEpisode {
  tvdbShowId?: number
  seasonNumber?: number
  episodeNumber?: number
  absoluteEpisodeNumber?: number
  title?: Record<string, string>
  overview?: string
  summary?: string
  image?: string
  airDate?: string
  rating?: string | number
}

interface AnizipPayload {
  episodes?: Record<string, AnizipEpisode>
  mappings?: Record<string, unknown>
}

async function fetchAnizip(tmdbId: number): Promise<AnizipPayload | null> {
  const key = `tmdb:${tmdbId}`
  const cached = anizipCacheGet(key) as AnizipPayload | undefined
  if (cached) return cached
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`https://api.ani.zip/mappings?themoviedb_id=${tmdbId}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const data = (await res.json()) as AnizipPayload
    if (!data || !data.episodes) return null
    anizipCacheSet(key, data)
    return data
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export async function buildVideosFromAnizip(tmdbId: number, primaryId: string): Promise<PreviewVideo[]> {
  const payload = await fetchAnizip(tmdbId)
  if (!payload?.episodes) return []
  const eps = Object.values(payload.episodes)
  // filtra S* specials, ordina per assoluto o stagione/episodio
  const regular = eps.filter((e) => typeof e.seasonNumber === "number" && typeof e.episodeNumber === "number" && e.seasonNumber !== 0)
  const sorted = regular.sort((a, b) => (a.seasonNumber! - b.seasonNumber!) || (a.episodeNumber! - b.episodeNumber!))
  const videos: PreviewVideo[] = []
  for (const ep of sorted) {
    const title = ep.title?.en || ep.title?.["x-jat"] || ep.title?.ja || `Episodio ${ep.episodeNumber}`
    videos.push({
      id: `${primaryId}:${ep.seasonNumber}:${ep.episodeNumber}`,
      name: title,
      season: ep.seasonNumber!,
      episode: ep.episodeNumber!,
      overview: ep.overview || ep.summary || undefined,
      thumbnail: ep.image || undefined,
      released: ep.airDate ? `${ep.airDate}T00:00:00.000Z` : undefined,
      rating: ep.rating ? String(ep.rating) : undefined,
    })
  }
  return videos
}

/**
 * Costruisce i video da TheTVDB (ordinamento Aired).
 */
export async function buildVideosFromTvdb(
  imdbId: string | null,
  tmdbId: number | null,
  primaryId: string,
  tvdbApiKey: string,
  seasonType: string = "default"
): Promise<PreviewVideo[]> {
  if (!tvdbApiKey) return []
  let tvdbSeriesId: number | null = null
  if (imdbId) tvdbSeriesId = await getTvdbSeriesId(imdbId, tvdbApiKey)
  if (!tvdbSeriesId && tmdbId) tvdbSeriesId = await getTvdbSeriesId(String(tmdbId), tvdbApiKey)
  if (!tvdbSeriesId) return []
  const tvdbEps = await getTvdbEpisodes(tvdbSeriesId, "ita", tvdbApiKey, seasonType)
  const sorted = [...tvdbEps].sort((a, b) => a.seasonNumber - b.seasonNumber || a.number - b.number)
  const videos: PreviewVideo[] = []
  for (const ep of sorted) {
    if (typeof ep.seasonNumber !== "number" || typeof ep.number !== "number") continue
    videos.push({
      id: `${primaryId}:${ep.seasonNumber}:${ep.number}`,
      name: ep.name || `Episodio ${ep.number}`,
      season: ep.seasonNumber,
      episode: ep.number,
      overview: ep.overview || undefined,
      thumbnail: formatTvdbImageUrl(ep.image) || undefined,
      released: ep.aired ? `${ep.aired}T00:00:00.000Z` : undefined,
    })
  }
  return videos
}
