/**
 * Shared poster truth for badge computation.
 * Used by both the server route and client hooks, ensuring the same badge
 * logic applies in preview (WYSIWYG) and final poster.
 */
import { computeBadge, computeAbsoluteCinema, type BadgeResult } from "./badge-priority"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "./awards"
import { getUpcomingReleaseLabel } from "./release-badge"
import { getSubGenreLabel } from "./subgenres"

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
  keywords?: string[]
  /** IMDb Top 250 badge flag — resolved externally (async fetch). */
  imdbTop250?: boolean
}

export interface ComputedTopBadge {
  readonly badge: BadgeResult | null
  readonly upcomingRelease: string | null
  readonly isNewMovie: boolean
  readonly isNewSeries: boolean
  readonly extraFallback: string | null
  readonly awardBadge: string | null
  readonly studioBadge: string | null
  readonly subGenreBadge: string | null
}

export function isNetworkStudio(studioName: string | null): boolean {
  if (!studioName) return false
  const lower = studioName.toLowerCase().trim()
  return !!(
    lower.includes("netflix") ||
    lower.includes("hbo") || lower === "max" ||
    lower.includes("disney") ||
    lower.includes("prime") || lower.includes("amazon") ||
    lower.includes("apple") ||
    lower.includes("paramount") ||
    lower === "rai" || lower.startsWith("rai ") ||
    lower.includes("crunchyroll")
  )
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
  const isNetStudio = isNetworkStudio(studioBadge)
  const studio = (input.networkLogoMatched || isNetStudio) ? null : studioBadge
  const extraFallback = computeAbsoluteCinema({
    mediaType: input.mediaType,
    imdbTop250: !!input.imdbTop250,
  }, t)

  const upcomingRelease = getUpcomingReleaseLabel({
    mediaType: input.mediaType,
    releaseDate: input.releaseDate,
    firstAirDate: input.firstAirDate,
    locale: locale || "it",
  })

  const subGenreBadge = getSubGenreLabel(input.keywords || [], locale)

  const badge = computeBadge({
    upcomingRelease,
    isNewMovie,
    isNewSeries,
    animeRank: input.animeRank,
    trendRank: input.trendRank,
    award: awardBadge,
    franchise: input.franchise,
    nomination,
    studio,
    director: input.director,
    subGenre: subGenreBadge,
    imdbTop250: !!input.imdbTop250,
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
    subGenreBadge,
  }
}
