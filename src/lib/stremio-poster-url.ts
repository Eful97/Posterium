import { buildPosterPublicUrl } from "@/lib/poster-public-url"
import { buildStremioPosterSearchParams } from "@/lib/stremio-poster-params"
import type { ServerDefaults } from "@/lib/server-defaults"
import type { Mapping } from "@/lib/types"

export type StremioPosterType = "movie" | "series"

export interface BuildStremioPosterUrlInput {
  readonly origin: string
  readonly type: StremioPosterType
  readonly id: number
  readonly defaults: ServerDefaults
  readonly mapping?: Mapping | null
  readonly apiKey?: string
  readonly lang?: string | null
}

export function mappingVersionParam(mapping: Mapping | null | undefined): string | null {
  if (!mapping?.updatedAt) return null
  const timestamp = Date.parse(mapping.updatedAt)
  return Number.isFinite(timestamp) ? String(timestamp) : null
}

export function buildStremioPosterUrl(input: BuildStremioPosterUrlInput): URL {
  const url = buildPosterPublicUrl(`/api/poster/${input.type}/${input.id}`, {
    origin: input.origin,
  })

  const params = buildStremioPosterSearchParams({
    apiKey: input.apiKey,
    lang: input.lang || "it",
    globalBadges: input.defaults.globalBadges,
    rankingBadges: input.defaults.rankingBadges,
    badgeStyle: input.defaults.badgeStyle,
    gradientHeight: input.defaults.gradientHeight,
    blurIntensity: input.defaults.blurIntensity,
    blurFade: input.defaults.blurFade,
    blurDarkness: input.defaults.blurDarkness,
    blurEnabled: input.defaults.blurEnabled,
    networkLogo: (input.defaults.networkLogo !== false) && (input.mapping?.networkLogo !== false),
  })

  params.forEach((value, key) => url.searchParams.set(key, value))
  const mappingVersion = mappingVersionParam(input.mapping)
  if (mappingVersion) url.searchParams.set("mv", mappingVersion)
  return url
}
