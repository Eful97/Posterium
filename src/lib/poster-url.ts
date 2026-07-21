import { getDomain } from "./utils"
import { resolveLabel, isRankKey, t as tFn } from "./i18n"
import { getPosterPublicBaseUrl } from "./poster-public-url"
import { buildStremioPosterSearchParams } from "./stremio-poster-params"
import { RENDER_VERSION } from "./render-version"
import type { SearchResult, TMDBImage } from "./types"
import type { EnrichedAnimeItem } from "./validation"

interface BadgeParams {
  globalBadges: boolean
  rankingBadges: boolean
  badgeStyle: string
  rankingBadgeStyle: string
  customBadge: string | null
  gradientHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  blurEnabled: boolean
  networkLogo?: boolean
}

interface PosterState {
  selected: SearchResult | null
  previewPoster: TMDBImage | null
  selectedLogo: TMDBImage | null
  selectedBackdrop: TMDBImage | null
  logoScale: number
  logoOffsetX: number
  logoOffsetY: number
  backdropScale: number
  backdropOffsetX: number
  backdropOffsetY: number
  metaInfo: {
    genres: { id: number; name: string }[]
    voteAverage: number
    release_date?: string
    first_air_date?: string
    awards?: string[]
    nominations?: string[]
    studios?: string[]
    franchise?: string | null
    director?: string | null
    type?: string
    status?: string
  }
  trendRank: number | null
  mdblistAnimeList: EnrichedAnimeItem[]
  topEdgeColor: string
  accentColor?: string
  lang: string
  tmdbKey: string
}

export function buildUrlPattern(bp: BadgeParams & { tmdbKey: string; lang: string }): string {
  let url = `${getPosterPublicBaseUrl()}/api/poster/{type}/{tmdb_id}`
  const params = buildStremioPosterSearchParams({
    apiKey: bp.tmdbKey,
    lang: bp.lang,
    globalBadges: bp.globalBadges,
    rankingBadges: bp.rankingBadges,
    badgeStyle: bp.badgeStyle,
    rankingBadgeStyle: bp.rankingBadgeStyle,
    gradientHeight: bp.gradientHeight,
    blurIntensity: bp.blurIntensity,
    blurFade: bp.blurFade,
    blurDarkness: bp.blurDarkness,
    blurEnabled: bp.blurEnabled,
  })
  url += "?" + params.toString()
  return url
}

export function buildPreviewUrl(ps: PosterState, bp: BadgeParams): string {
  if (!ps.selected) return ""
  const params: string[] = [`rv=${RENDER_VERSION}`]
  if (ps.tmdbKey) params.push(`api_key=${encodeURIComponent(ps.tmdbKey)}`)
  if (!bp.globalBadges) params.push("badges=0")
  if (!bp.rankingBadges) params.push("ranking=0")
  if (ps.previewPoster) {
    params.push(`poster=${encodeURIComponent(ps.previewPoster.file_path)}`)
    const genre = ps.metaInfo.genres[0]?.name
    if (genre) params.push(`genreName=${encodeURIComponent(genre)}`)
    if (ps.metaInfo.voteAverage > 0) params.push(`voteAverage=${ps.metaInfo.voteAverage}`)
  }
  if (ps.selectedLogo && ps.previewPoster?.iso_639_1 === null) {
    params.push(`logo=${encodeURIComponent(ps.selectedLogo.file_path)}`)
    params.push(`scale=${ps.logoScale}`)
    params.push(`ox=${ps.logoOffsetX}`)
    params.push(`oy=${ps.logoOffsetY}`)
  }
  if (ps.selectedBackdrop) {
    params.push(`backdrop=${encodeURIComponent(ps.selectedBackdrop.file_path)}`)
    params.push(`bscale=${ps.backdropScale}`)
    params.push(`box=${ps.backdropOffsetX}`)
    params.push(`boy=${ps.backdropOffsetY}`)
  }
  if (ps.lang) params.push(`lang=${ps.lang}`)
  params.push(`gradHeight=${bp.gradientHeight}`)
  params.push(`blur=${bp.blurIntensity}`)
  params.push(`bf=${bp.blurFade}`)
  params.push(`bd=${bp.blurDarkness}`)
  params.push(`bs=${bp.badgeStyle}`)
  params.push(`rs=${bp.rankingBadgeStyle}`)
  if (!bp.blurEnabled) params.push("be=0")
  if (bp.networkLogo === false) params.push("netLogo=0")
  if (ps.accentColor && ps.accentColor !== "#555555") params.push(`ac=${encodeURIComponent(ps.accentColor)}`)
  const topLight = computeTopLight(ps.topEdgeColor)
  params.push(`tl=${topLight ? "1" : "0"}`)
  if (bp.rankingBadges) {
    const badgeParams = computeBadgeParams(ps, bp)
    params.push(...badgeParams)
  }
  params.push("preview=1")
  const qs = "?" + params.join("&")
  return `${getDomain()}/api/poster/${ps.selected.media_type}/${ps.selected.id}${qs}`
}

function computeTopLight(hexColor: string): boolean {
  const h = hexColor
  if (h.length < 7) return true
  if (h === "#555555") return true
  const r = parseInt(h.slice(1, 3), 16) / 255
  const g = parseInt(h.slice(3, 5), 16) / 255
  const b = parseInt(h.slice(5, 7), 16) / 255
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.60
}

function computeBadgeParams(ps: PosterState, bp: BadgeParams): string[] {
  const params: string[] = []
  if (bp.customBadge) {
    const selected = ps.selected
    const animeRank = selected && ps.mdblistAnimeList.length > 0
      ? (ps.mdblistAnimeList.find((a) => a.id === selected.id)?.rank ?? null) : null
    const rankKey = isRankKey(bp.customBadge)
    if (rankKey === "badge.today" && ps.trendRank) params.push(`rank=${ps.trendRank}&label=${encodeURIComponent(tFn("badge.today"))}`)
    else if (rankKey === "badge.anime" && animeRank) params.push(`rank=${animeRank}&label=${encodeURIComponent(tFn("badge.anime"))}`)
    else params.push(`extra=${encodeURIComponent(resolveLabel(bp.customBadge))}`)
  }
  // For auto badges, let the server compute from its own TMDB data
  return params
}
