export interface SearchResult {
  id: number
  media_type: "movie" | "tv"
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  imdb_id?: string | null
}

export interface TMDBImage {
  file_path: string
  iso_639_1: string | null
  vote_average: number
  width: number
  height: number
}

export interface FlixPatrolItem {
  rank: number
  title: string
  days: number
  tmdbId: number | null
  mediaType: "movie" | "tv"
  posterPath: string | null
}

export interface FlixPatrolChart {
  platform: string
  platformName: string
  movies: FlixPatrolItem[]
  tv: FlixPatrolItem[]
}

export interface Mapping {
  tmdbId: number
  mediaType: "movie" | "tv"
  title: string
  posterPath: string
  logoPath: string | null
  originalPosterPath: string | null
  language: string | null
  updatedAt: string
  logoScale?: number
  logoOffsetX?: number
  logoOffsetY?: number
  backdropPath?: string | null
  backdropScale?: number
  backdropOffsetX?: number
  backdropOffsetY?: number
  showBadges?: boolean
  genreName?: string
  voteAverage?: number
  trendRank?: number
  trendPeriod?: string
  accentColor?: string
  tvType?: string
  tvStatus?: string
  badgeExtra?: string
  badgeRank?: number
  badgeLabel?: string
  customBadge?: string | null
  releaseDate?: string
  firstAirDate?: string
  rankingBadges?: boolean
  badgeStyle?: string
  rankingBadgeStyle?: string
  blurEnabled?: boolean
  blurIntensity?: number
  blurFade?: number
  blurDarkness?: number
  gradientHeight?: number
  cleanPosters?: string[]
  cleanPosterIndex?: number
  cleanPosterUpdatedAt?: string
  autoRotateClean?: boolean
  defaultBadgeStyle?: string
  defaultRankingBadgeStyle?: string
}
