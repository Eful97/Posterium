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

/**
 * Costruisce i video da TheTVDB (ordinamento Aired).
 */
export async function buildVideosFromTvdb(
  imdbId: string | null,
  tmdbId: number | null,
  primaryId: string,
  tvdbApiKey: string
): Promise<PreviewVideo[]> {
  if (!tvdbApiKey) return []
  let tvdbSeriesId: number | null = null
  if (imdbId) tvdbSeriesId = await getTvdbSeriesId(imdbId, tvdbApiKey)
  if (!tvdbSeriesId && tmdbId) tvdbSeriesId = await getTvdbSeriesId(String(tmdbId), tvdbApiKey)
  if (!tvdbSeriesId) return []
  const tvdbEps = await getTvdbEpisodes(tvdbSeriesId, "ita", tvdbApiKey)
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
