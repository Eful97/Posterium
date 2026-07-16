import type { NextRequest } from "next/server"
import { cacheGetStale, cacheSet } from "@/lib/cache"

export const POSTER_REFRESH_PARAM = "__poster_refresh"

const POSTER_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
const POSTER_IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, s-maxage=31536000, immutable"
const POSTER_CDN_CACHE_CONTROL = POSTER_CACHE_CONTROL

export interface PosterCachePayload {
  readonly buffer: Buffer
  readonly etag: string
}

export type PosterHeaders = Readonly<Record<string, string>>

export interface ImmutablePosterRequestState {
  readonly hasMapping?: boolean
  readonly isRotating?: boolean
  readonly mappingVersionMatches?: boolean
}

const inflight = new Map<string, Promise<PosterCachePayload | null>>()

export function normalizePosterCacheParams(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(searchParams)
  params.delete("rv")
  params.delete("v")
  params.delete(POSTER_REFRESH_PARAM)
  return params
}

export function isPosterRefreshRequest(searchParams: URLSearchParams): boolean {
  return searchParams.get(POSTER_REFRESH_PARAM) === "1"
}

export function isImmutablePosterRequest(searchParams: URLSearchParams, state: ImmutablePosterRequestState = {}): boolean {
  if (!searchParams.has("rv") || state.isRotating) return false
  if (!state.hasMapping) return true
  return state.mappingVersionMatches === true
}

export function posterHeaders(etag: string, immutable: boolean): PosterHeaders {
  return {
    "Content-Type": "image/jpeg",
    "Cache-Control": immutable ? POSTER_IMMUTABLE_CACHE_CONTROL : POSTER_CACHE_CONTROL,
    "CDN-Cache-Control": immutable ? POSTER_IMMUTABLE_CACHE_CONTROL : POSTER_CDN_CACHE_CONTROL,
    "Surrogate-Control": immutable ? "max-age=31536000" : "max-age=86400, stale-while-revalidate=604800",
    "ETag": etag,
  }
}

export function posterNotModifiedHeaders(etag: string, immutable: boolean): PosterHeaders {
  return {
    "Cache-Control": immutable ? POSTER_IMMUTABLE_CACHE_CONTROL : POSTER_CACHE_CONTROL,
    "CDN-Cache-Control": immutable ? POSTER_IMMUTABLE_CACHE_CONTROL : POSTER_CDN_CACHE_CONTROL,
    "Surrogate-Control": immutable ? "max-age=31536000" : "max-age=86400, stale-while-revalidate=604800",
    "ETag": etag,
  }
}

export function posterResponse(payload: PosterCachePayload, immutable: boolean): Response {
  return new Response(new Uint8Array(payload.buffer), { headers: posterHeaders(payload.etag, immutable) })
}

export function readCachedPoster(cacheKey: string): { readonly payload: PosterCachePayload | null; readonly stale: boolean } {
  const cached = cacheGetStale<Buffer>(cacheKey)
  const cachedHeaders = cacheGetStale<{ etag: string }>(`${cacheKey}:headers`)
  if (!cached.data || !cachedHeaders.data) return { payload: null, stale: false }
  return {
    payload: { buffer: cached.data, etag: cachedHeaders.data.etag },
    stale: cached.stale || cachedHeaders.stale,
  }
}

export function writeCachedPoster(cacheKey: string, payload: PosterCachePayload): void {
  cacheSet(cacheKey, payload.buffer, ["poster"])
  cacheSet(`${cacheKey}:headers`, { etag: payload.etag }, ["poster"])
}

export function getPendingPoster(cacheKey: string): Promise<PosterCachePayload | null> | null {
  return inflight.get(cacheKey) ?? null
}

export function beginPosterRender(cacheKey: string): (payload: PosterCachePayload | null) => void {
  let resolveRender: (payload: PosterCachePayload | null) => void = () => {}
  const promise = new Promise<PosterCachePayload | null>((resolve) => {
    resolveRender = resolve
  })
  inflight.set(cacheKey, promise)
  return (payload) => {
    resolveRender(payload)
    inflight.delete(cacheKey)
  }
}

export function schedulePosterRefresh(req: NextRequest): void {
  const url = new URL(req.url)
  url.searchParams.set(POSTER_REFRESH_PARAM, "1")
  void fetch(url, { signal: AbortSignal.timeout(60_000) })
    .then((res) => res.arrayBuffer())
    .catch((error: unknown) => {
      if (error instanceof Error) {
        console.error("[poster] Background refresh failed:", error.message)
        return
      }
      console.error("[poster] Background refresh failed")
    })
}
