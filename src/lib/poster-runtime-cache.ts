import type { NextRequest } from "next/server"
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache"
import { createLogger } from "@/lib/logger"

const log = createLogger("poster-cache")

export const POSTER_REFRESH_PARAM = "__poster_refresh"

const POSTER_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
const POSTER_IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, s-maxage=31536000, immutable"
const POSTER_DYNAMIC_CACHE_CONTROL = "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400"
const POSTER_CDN_CACHE_CONTROL = POSTER_CACHE_CONTROL
const POSTER_DYNAMIC_CDN_CACHE_CONTROL = POSTER_DYNAMIC_CACHE_CONTROL
const PREVIEW_CACHE_CONTROL = "no-cache, no-store, must-revalidate, max-age=0"

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

const refreshInFlight = new Set<string>()
const lastRefreshAt = new Map<string, number>()
const MIN_REFRESH_INTERVAL_MS = 60_000
const MAX_REFRESH_TRACKED = 500

// Se un render in flight muore (crash/timeout serverless) senza chiamare la
// funzione di completamento, la promise resterebbe appesa nella map per sempre
// bloccando ogni richiesta successiva con la stessa cache key su await.
// Timeout difensivo: dopo N secondi risolve con null e libera la map.
const INFLIGHT_TIMEOUT_MS = 60_000

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
  // Senza mapping il poster NON può essere immutable per un anno: viene composto
  // al volo con dati dinamici (rank JustWatch, premi, IMDb Top 250) che cambiano
  // di settimana in settimana — un header immutable li congelerebbe alla CDN.
  // Con mapping, l'immutable richiede anche che il versionamento del mapping
  // (mv) corrisponda, altrimenti la cache edge può servire un poster stantio.
  return state.hasMapping === true && state.mappingVersionMatches === true
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "ETag, Cache-Control",
}

export function posterHeaders(etag: string, immutable: boolean, isPreview: boolean = false, dynamic: boolean = false): PosterHeaders {
  if (isPreview) {
    return {
      ...CORS_HEADERS,
      "Content-Type": "image/jpeg",
      "Cache-Control": PREVIEW_CACHE_CONTROL,
      "Pragma": "no-cache",
      "Expires": "0",
      "ETag": etag,
    }
  }
  const cacheControl = immutable ? POSTER_IMMUTABLE_CACHE_CONTROL : dynamic ? POSTER_DYNAMIC_CACHE_CONTROL : POSTER_CACHE_CONTROL
  const cdnCacheControl = immutable ? POSTER_IMMUTABLE_CACHE_CONTROL : dynamic ? POSTER_DYNAMIC_CDN_CACHE_CONTROL : POSTER_CDN_CACHE_CONTROL
  const surrogate = immutable ? "max-age=31536000" : dynamic ? "max-age=21600, stale-while-revalidate=86400" : "max-age=86400, stale-while-revalidate=604800"
  return {
    ...CORS_HEADERS,
    "Content-Type": "image/jpeg",
    "Cache-Control": cacheControl,
    "CDN-Cache-Control": cdnCacheControl,
    "Surrogate-Control": surrogate,
    "ETag": etag,
  }
}

export function posterNotModifiedHeaders(etag: string, immutable: boolean, dynamic: boolean = false): PosterHeaders {
  const cacheControl = immutable ? POSTER_IMMUTABLE_CACHE_CONTROL : dynamic ? POSTER_DYNAMIC_CACHE_CONTROL : POSTER_CACHE_CONTROL
  const cdnCacheControl = immutable ? POSTER_IMMUTABLE_CACHE_CONTROL : dynamic ? POSTER_DYNAMIC_CDN_CACHE_CONTROL : POSTER_CDN_CACHE_CONTROL
  const surrogate = immutable ? "max-age=31536000" : dynamic ? "max-age=21600, stale-while-revalidate=86400" : "max-age=86400, stale-while-revalidate=604800"
  return {
    ...CORS_HEADERS,
    "Cache-Control": cacheControl,
    "CDN-Cache-Control": cdnCacheControl,
    "Surrogate-Control": surrogate,
    "ETag": etag,
  }
}

export function posterResponse(payload: PosterCachePayload, immutable: boolean, isPreview: boolean = false, dynamic: boolean = false): Response {
  return new Response(new Uint8Array(payload.buffer), { headers: posterHeaders(payload.etag, immutable, isPreview, dynamic) })
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

// Poster non-mappati (composti al volo con dati dinamici): TTL esplicito 6h
// (fix M3). Prima writeCachedPoster non passava alcun TTL → il tag "poster"
// finiva nel refresh schedulato giornaliero alle 3 UTC (cache.ts) e l'header
// HTTP dynamic (6h) mentiva: in memoria il payload restava fino al refresh
// delle 3, con rank/IMDb Top 250 potenzialmente stantii per un giorno intero.
const DYNAMIC_POSTER_TTL_MS = 6 * 60 * 60 * 1000

export function writeCachedPoster(cacheKey: string, payload: PosterCachePayload, mappingTag?: string): void {
  const tags = mappingTag ? ["poster", mappingTag] : ["poster"]
  // TTL esplicito solo per i non-mappati: per i mappati resta il refresh
  // schedulato giornaliero (immutable per un anno alla CDN, invalido per tag).
  const ttl = mappingTag ? undefined : DYNAMIC_POSTER_TTL_MS
  cacheSet(cacheKey, payload.buffer, tags, ttl)
  cacheSet(`${cacheKey}:headers`, { etag: payload.etag }, tags, ttl)
}

// ---------------------------------------------------------------------------
// Negative cache (F3): un errore 500/503 recente evita di ri-rendere la stessa
// cache key per il TTL, altrimenti ogni retry ricolpisce upstream e slot con la
// pipeline completa. TTL breve: si svuota da sola, senza invalidation esplicita.
// ---------------------------------------------------------------------------

export type PosterErrorStatus = 500 | 503 | 404

export interface PosterErrorRecord {
  readonly status: PosterErrorStatus
}

const NEGATIVE_TTL_MS = (() => {
  const raw = process.env.POSTERIUM_NEGATIVE_CACHE_TTL_MS
  const n = raw ? parseInt(raw, 10) : 5000
  return Number.isFinite(n) && n >= 1000 && n <= 60000 ? n : 5000
})()

let negativeWrites = 0
let negativeHits = 0

export function writePosterError(cacheKey: string, status: PosterErrorStatus): void {
  negativeWrites++
  cacheSet(`${cacheKey}:err`, { status } satisfies PosterErrorRecord, ["poster-error"], NEGATIVE_TTL_MS)
}

export function readPosterError(cacheKey: string): PosterErrorRecord | null {
  const rec = cacheGet<PosterErrorRecord>(`${cacheKey}:err`)
  if (rec) negativeHits++
  return rec
}

/** Contatori della negative cache per /status. */
export function posterErrorStats(): { readonly writes: number; readonly hits: number } {
  return { writes: negativeWrites, hits: negativeHits }
}

export function getPendingPoster(cacheKey: string): Promise<PosterCachePayload | null> | null {
  return inflight.get(cacheKey) ?? null
}

export function beginPosterRender(cacheKey: string): (payload: PosterCachePayload | null) => void {
  // Race guard: non sovrascrivere un render già in corso. Chi arriva dopo
  // con la stessa cache key ha già atteso getPendingPoster(); se la promise
  // esiste ancora qui, il complete no-op evita di toccare la map dell'altro.
  if (inflight.has(cacheKey)) return () => {}

  let resolveRender: (payload: PosterCachePayload | null) => void = () => {}
  const promise = new Promise<PosterCachePayload | null>((resolve) => {
    resolveRender = resolve
  })
  const timer = setTimeout(() => {
    resolveRender(null)
    inflight.delete(cacheKey)
  }, INFLIGHT_TIMEOUT_MS)
  if (typeof timer.unref === "function") timer.unref()
  inflight.set(cacheKey, promise)
  return (payload) => {
    clearTimeout(timer)
    resolveRender(payload)
    inflight.delete(cacheKey)
  }
}

export function schedulePosterRefresh(req: NextRequest, isPreview: boolean = false): void {
  // Le preview (`preview=1`) non vengono servite alle CDN: rigenerarle in
  // background è inutile. Il refresh serve solo per riscaldare la cache edge.
  if (isPreview) return
  const url = new URL(req.url)
  url.searchParams.set(POSTER_REFRESH_PARAM, "1")
  const key = url.toString()
  // Dedup: non avviare due refresh concorrenti per la stessa URL.
  if (refreshInFlight.has(key)) return
  // Min-interval: evita che un titolo sotto attacco (o una catena di stale hit)
  // generi un self-fetch a ogni richiesta — la cache locale viene comunque
  // rigenerata dalla prima richiesta che arriva con il param di refresh.
  const now = Date.now()
  const last = lastRefreshAt.get(key)
  if (last !== undefined && now - last < MIN_REFRESH_INTERVAL_MS) return
  if (lastRefreshAt.size >= MAX_REFRESH_TRACKED) lastRefreshAt.delete(lastRefreshAt.keys().next().value!)
  lastRefreshAt.set(key, now)
  refreshInFlight.add(key)
  void fetch(url, { signal: AbortSignal.timeout(60_000) })
    .then((res) => res.arrayBuffer())
    .catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error)
      log.warn("Background refresh failed", { error: msg })
    })
    .finally(() => { refreshInFlight.delete(key) })
}

// ---------------------------------------------------------------------------
// Render concurrency limiter (anti-OOM)
// ---------------------------------------------------------------------------
// Un cache-miss tiene in memoria poster originali + logo + backdrop + buffer
// RGBA e i risultati delle composizioni sharp (decine di MB per richiesta).
// Su istanze con heap limitato (Docker: --max-old-space-size=384) un burst di
// miss su titoli diversi può portare a OOM senza backpressure. Questo limiter
// serializza i render costosi: le richieste in eccesso attendono un posto per
// un tempo limitato, poi ricevono 503 invece di accodarsi all'infinito.

const MAX_CONCURRENT_RENDERS = (() => {
  const raw = process.env.POSTERIUM_MAX_CONCURRENT_RENDERS
  const n = raw ? parseInt(raw, 10) : 4
  return Number.isFinite(n) && n > 0 && n <= 32 ? n : 4
})()
// Attesa massima di un posto di render prima del 503 (F5). Lettura a module
// level: un cambio env richiede restart, non hot-reload.
// Default 15000: le griglie catalogo (Stremio/AIOMetadata) richiedono ~20 poster
// in parallelo su cache fredda; con 4 slot e 5s molti ricevevano 503 (poster
// mancanti). I waiter non tengono buffer immagini (i fetch avvengono dentro lo
// slot), quindi allungare l'attesa è memory-neutral.
export const RENDER_SLOT_WAIT_MS = (() => {
  const raw = process.env.POSTERIUM_RENDER_SLOT_WAIT_MS
  const n = raw ? parseInt(raw, 10) : 15000
  return Number.isFinite(n) && n >= 500 && n <= 60000 ? n : 15000
})()
// Coda bounded (opzionale): con 0 il comportamento è attuale (i waiter oltre i
// posti attendono fino a RENDER_SLOT_WAIT_MS). Con N>0 i waiter oltre N
// ricevono 503 immediato invece di accodarsi: backpressure senza code infinite.
const RENDER_QUEUE_LIMIT = (() => {
  const raw = process.env.POSTERIUM_RENDER_QUEUE
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) && n >= 0 && n <= 128 ? n : 0
})()

let activeRenders = 0
const renderWaiters: Array<() => void> = []

function releaseRenderSlot(): void {
  activeRenders = Math.max(0, activeRenders - 1)
  const next = renderWaiters.shift()
  if (next) next()
}

/** Acquisisce un posto di render. Risolve con la release function, o null se il timeout scade. */
export async function acquirePosterRenderSlot(): Promise<(() => void) | null> {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders++
    return releaseRenderSlot
  }
  if (RENDER_QUEUE_LIMIT > 0 && renderWaiters.length >= RENDER_QUEUE_LIMIT) {
    return null
  }
  return new Promise<(() => void) | null>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      const i = renderWaiters.indexOf(handoff)
      if (i >= 0) renderWaiters.splice(i, 1)
      resolve(null)
    }, RENDER_SLOT_WAIT_MS)
    const handoff = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(releaseRenderSlot)
    }
    renderWaiters.push(handoff)
  })
}

/** Solo per i test: svuota lo stato del limiter. */
export function __resetPosterRenderLimiter(): void {
  activeRenders = 0
  renderWaiters.length = 0
}
