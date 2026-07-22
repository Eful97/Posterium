import { POSTER_URL_VERSION } from "@/lib/render-version"

export interface StremioPosterParamsInput {
  readonly apiKey?: string
  readonly lang?: string | null
  readonly globalBadges?: boolean
  readonly rankingBadges?: boolean
  readonly badgeStyle?: string
  readonly rankingBadgeStyle?: string
  readonly gradientHeight?: number
  readonly blurIntensity?: number
  readonly blurFade?: number
  readonly blurDarkness?: number
  readonly blurEnabled?: boolean
  readonly networkLogo?: boolean
}

const DEFAULT_STREMIO_POSTER_PARAMS = {
  globalBadges: true,
  rankingBadges: true,
  badgeStyle: "shadow",
  rankingBadgeStyle: "netflix",
  gradientHeight: 30,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  blurEnabled: true,
  networkLogo: true,
} as const

export function buildStremioPosterSearchParams(input: StremioPosterParamsInput): URLSearchParams {
  const params = new URLSearchParams()
  const globalBadges = input.globalBadges ?? DEFAULT_STREMIO_POSTER_PARAMS.globalBadges
  const rankingBadges = input.rankingBadges ?? DEFAULT_STREMIO_POSTER_PARAMS.rankingBadges
  const blurEnabled = input.blurEnabled ?? DEFAULT_STREMIO_POSTER_PARAMS.blurEnabled
  const networkLogo = input.networkLogo ?? DEFAULT_STREMIO_POSTER_PARAMS.networkLogo

  if (input.apiKey) params.set("api_key", input.apiKey)
  if (!globalBadges) params.set("badges", "0")
  if (!rankingBadges) params.set("ranking", "0")
  if (!networkLogo) params.set("netLogo", "0")
  params.set("lang", input.lang || "it")
  if (!blurEnabled) params.set("be", "0")
  params.set("gradHeight", String(input.gradientHeight ?? DEFAULT_STREMIO_POSTER_PARAMS.gradientHeight))
  params.set("blur", String(input.blurIntensity ?? DEFAULT_STREMIO_POSTER_PARAMS.blurIntensity))
  params.set("bf", String(input.blurFade ?? DEFAULT_STREMIO_POSTER_PARAMS.blurFade))
  params.set("bd", String(input.blurDarkness ?? DEFAULT_STREMIO_POSTER_PARAMS.blurDarkness))
  params.set("bs", input.badgeStyle || DEFAULT_STREMIO_POSTER_PARAMS.badgeStyle)
  params.set("rs", input.rankingBadgeStyle || DEFAULT_STREMIO_POSTER_PARAMS.rankingBadgeStyle)
  params.set("rv", String(POSTER_URL_VERSION))
  return params
}
