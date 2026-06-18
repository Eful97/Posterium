export interface BadgeResult {
  type: "extra" | "rank"
  label: string
  rank?: number
  rankLabel?: string
}

export function computeBadge(params: {
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
}): BadgeResult | null {
  if (params.isNewMovie) return { type: "extra", label: "Nuovo film" }
  if (params.isNewSeries) return { type: "extra", label: "Nuova serie" }
  if (params.animeRank) return { type: "rank", label: "Anime", rank: params.animeRank }
  if (params.trendRank) return { type: "rank", label: "Oggi", rank: params.trendRank }
  if (params.award) return { type: "extra", label: params.award }
  if (params.franchise) return { type: "extra", label: params.franchise }
  if (params.nomination) return { type: "extra", label: params.nomination }
  if (params.studio) return { type: "extra", label: params.studio }
  if (params.director) return { type: "extra", label: params.director }
  if (params.extra) return { type: "extra", label: params.extra }
  return null
}

export function computeExtraFallback(params: {
  mediaType: "movie" | "tv"
  voteAverage: number
  tvType: string | null | undefined
  tvStatus: string | null | undefined
}): string | null {
  if (params.mediaType === "movie") {
    return params.voteAverage >= 8.5 ? "Il più votato" : null
  }
  if (params.tvType === "Miniseries") return "Miniserie"
  if (params.tvStatus === "Returning Series") return "Ritorna"
  if (params.voteAverage >= 8.5) return "Da divorare"
  return null
}
