import type { NextRequest } from "next/server"
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

/**
 * Extract the public origin from a request, accounting for reverse proxies
 * (Koyeb, HF Spaces, etc.) that forward via internal IPs.
 */
export function getOriginFromRequest(req: NextRequest): string {
  const forwardedHost = req.headers.get("X-Forwarded-Host")
  const forwardedProto = req.headers.get("X-Forwarded-Proto") || "https"
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }
  return req.nextUrl.origin
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
