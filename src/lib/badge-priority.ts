import { BADGE_KEY_PREFIX } from "./i18n"

export interface BadgeResult {
  type: "extra" | "rank"
  label: string
  rank?: number
  rankLabel?: string
}

type T = (key: string, params?: Record<string, string | number>) => string

const _idT: T = (k) => k

function franchiseKey(name: string): string {
  return `franchise.${name.toLowerCase().replace(/[\s-]+/g, '_')}`
}

export function computeBadge(params: {
  upcomingRelease: string | null
  isNewMovie: boolean
  isNewSeries: boolean
  animeRank: number | null
  trendRank: number | null
  award: string | null
  franchise: string | null
  nomination: string | null
  studio: string | null
  director: string | null
  subGenre?: string | null
  extra: string | null
}, _t?: T): BadgeResult | null {
  const t = _t || _idT
  if (params.upcomingRelease) return { type: "extra", label: params.upcomingRelease }
  if (params.animeRank) return { type: "rank", label: t("badge.anime"), rank: params.animeRank }
  if (params.trendRank) return { type: "rank", label: t("badge.today"), rank: params.trendRank }
  if (params.isNewMovie) return { type: "extra", label: t("badge.newMovie") }
  if (params.isNewSeries) return { type: "extra", label: t("badge.newSeries") }
  if (params.award) return { type: "extra", label: params.award }
  if (params.franchise) return { type: "extra", label: t(franchiseKey(params.franchise)) }
  if (params.nomination) return { type: "extra", label: params.nomination }
  if (params.studio) return { type: "extra", label: params.studio }
  if (params.director) return { type: "extra", label: params.director }
  if (params.subGenre) return { type: "extra", label: params.subGenre }
  if (params.extra) return { type: "extra", label: params.extra }
  return null
}

export function computeExtraFallback(params: {
  mediaType: "movie" | "tv"
  voteAverage: number
  tvType: string | null | undefined
  tvStatus: string | null | undefined
}, _t?: T): string | null {
  const t = _t || _idT
  if (params.mediaType === "movie") {
    return params.voteAverage >= 8.5 ? t("badge.topRated") : null
  }
  const tvTypeLower = (params.tvType || "").toLowerCase()
  const tvStatusLower = (params.tvStatus || "").toLowerCase()
  if (tvTypeLower === "miniseries" || tvTypeLower === "miniserie") return t("badge.miniseries")
  if (tvStatusLower === "returning series" || tvStatusLower === "in corso") return t("badge.returning")
  if (params.voteAverage >= 8.5) return t("badge.bingeWorthy")
  return null
}

function keyed(key: string): string {
  return `${BADGE_KEY_PREFIX}${key}`
}

export function getAllBadgeOptions(params: {
  upcomingRelease: string | null
  isNewMovie: boolean
  isNewSeries: boolean
  animeRank: number | null
  trendRank: number | null
  award: string | null
  franchise: string | null
  nomination: string | null
  studio: string | null
  director: string | null
  extra: string | null
  mediaType: "movie" | "tv"
  voteAverage: number
  tvType: string | null | undefined
  tvStatus: string | null | undefined
}): string[] {
  const options = new Set<string>()
  if (params.upcomingRelease) options.add(params.upcomingRelease)
  if (params.isNewMovie) options.add(keyed("badge.newMovie"))
  if (params.isNewSeries) options.add(keyed("badge.newSeries"))
  if (params.trendRank) options.add(keyed("badge.today"))
  if (params.animeRank) options.add(keyed("badge.anime"))
  if (params.award) options.add(params.award)
  if (params.franchise) options.add(keyed(franchiseKey(params.franchise)))
  if (params.nomination) options.add(params.nomination)
  if (params.studio) options.add(params.studio)
  if (params.director) options.add(params.director)
  if (params.mediaType === "movie" && params.voteAverage >= 8.5) options.add(keyed("badge.topRated"))
  if (params.mediaType === "tv") {
    const tLower = (params.tvType || "").toLowerCase()
    const sLower = (params.tvStatus || "").toLowerCase()
    if (tLower === "miniseries" || tLower === "miniserie") options.add(keyed("badge.miniseries"))
    if (sLower === "returning series" || sLower === "in corso") options.add(keyed("badge.returning"))
    if (params.voteAverage >= 8.5) options.add(keyed("badge.bingeWorthy"))
  }
  options.delete("")
  return [...options]
}
