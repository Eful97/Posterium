import { getDomain } from "@/lib/utils"

export interface PosterBaseUrlInput {
  readonly origin?: string
  readonly preferCdn?: boolean
}

function cleanBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.replace(/\/+$/, "")
}

export function getPosterPublicBaseUrl(input: PosterBaseUrlInput = {}): string {
  const cdnBase = input.preferCdn !== false
    ? cleanBaseUrl(process.env.NEXT_PUBLIC_POSTER_CDN_URL || process.env.POSTER_CDN_URL)
    : null
  if (cdnBase) return cdnBase
  const explicitOrigin = cleanBaseUrl(input.origin)
  if (explicitOrigin) return explicitOrigin
  return getDomain()
}

export function buildPosterPublicUrl(path: string, input: PosterBaseUrlInput = {}): URL {
  const baseUrl = getPosterPublicBaseUrl(input)
  if (baseUrl) return new URL(path, `${baseUrl}/`)
  return new URL(path, "http://localhost")
}
