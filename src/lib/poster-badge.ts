/**
 * Shared poster truth for badge computation.
 * Used by both the server route and client hooks, ensuring the same badge
 * logic applies in preview (WYSIWYG) and final poster.
 */
import { computeBadge, computeExtraFallback, type BadgeResult } from "./badge-priority"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "./awards"
import { getUpcomingReleaseLabel } from "./release-badge"

export type BadgeT = (key: string, params?: Record<string, string | number>) => string

export interface BadgeInput {
  mediaType: "movie" | "tv"
  releaseDate: string | null
  firstAirDate: string | null
  voteAverage: number
  trendRank: number | null
  animeRank: number | null
  awards: string[]
  nominations: string[]
  franchise: string | null
  studios: string[]
  director: string | null
  tvType: string | null | undefined
  tvStatus: string | null | undefined
  networkLogoMatched?: boolean
}

export interface ComputedTopBadge {
  readonly badge: BadgeResult | null
  readonly upcomingRelease: string | null
  readonly isNewMovie: boolean
  readonly isNewSeries: boolean
  readonly extraFallback: string | null
  readonly awardBadge: string | null
  readonly studioBadge: string | null
}

/**
 * Single entry point for badge computation — shared by server (route.ts)
 * and client (usePosterSave.ts, poster-url.ts).
 * Returns both the final badge and intermediate values so callers can
 * use them for save logic without recomputing.
 */
export function computeTopBadge(input: BadgeInput, t: BadgeT, locale?: string): ComputedTopBadge {
  const now = Date.now()
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
  const isNewMovie = input.mediaType === "movie" && input.releaseDate
    ? (now - new Date(input.releaseDate).getTime()) < TWO_WEEKS_MS
    : false
  const isNewSeries = input.mediaType === "tv" && input.firstAirDate
    ? (now - new Date(input.firstAirDate).getTime()) < TWO_WEEKS_MS
    : false

  const awardBadge = input.awards.length ? getAwardBadgeLabel(input.awards, t) : null
  const nomination = !awardBadge && input.nominations.length
    ? getNominationBadgeLabel(input.nominations, t)
    : null
  const studioBadge = input.studios.length ? input.studios[0] : null
  const extraFallback = computeExtraFallback({
    mediaType: input.mediaType,
    voteAverage: input.voteAverage,
    tvType: input.tvType,
    tvStatus: input.tvStatus,
  }, t)

  const upcomingRelease = getUpcomingReleaseLabel({
    mediaType: input.mediaType,
    releaseDate: input.releaseDate,
    firstAirDate: input.firstAirDate,
    locale: locale || "it",
  })

  const badge = computeBadge({
    upcomingRelease,
    isNewMovie,
    isNewSeries,
    animeRank: input.animeRank,
    trendRank: input.trendRank,
    award: awardBadge,
    franchise: input.franchise,
    nomination,
    studio: input.networkLogoMatched ? null : studioBadge,
    director: input.director,
    extra: extraFallback,
  }, t)

  return {
    badge,
    upcomingRelease,
    isNewMovie,
    isNewSeries,
    extraFallback,
    awardBadge,
    studioBadge,
  }
}
