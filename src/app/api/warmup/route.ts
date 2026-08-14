import { NextRequest } from "next/server"
import crypto from "node:crypto"
import { getJWRankings } from "@/lib/justwatch"

// Vercel: il warmup itera decine di poster in batch → richiede il massimo
// consentito. Su Hobby (10s) non completa comunque; su Pro vale 60s.
export const maxDuration = 60
import { buildPosterPublicUrl } from "@/lib/poster-public-url"
import { getServerDefaults } from "@/lib/server-defaults"
import { buildStremioPosterSearchParams } from "@/lib/stremio-poster-params"
import { getAll } from "@/lib/store"
import { getTrending, resolveRequestApiKey } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { checkAdminToken, adminAuthResponse, isSameOrigin, originMismatchResponse } from "@/lib/auth"
import { createLogger } from "@/lib/logger"

const log = createLogger("warmup")

type PosterRouteType = "movie" | "series"
type WarmupStatus = "ok" | "fail"

interface WarmupTarget {
  readonly type: PosterRouteType
  readonly id: number
  readonly source: string
}

interface WarmupResult extends WarmupTarget {
  readonly status: WarmupStatus
  readonly statusCode?: number
}

interface BoundedIntInput {
  readonly value: string | null
  readonly fallback: number
  readonly min: number
  readonly max: number
}

interface BuildPosterUrlInput {
  readonly req: NextRequest
  readonly target: WarmupTarget
  readonly lang: string
}

function boundedInt(input: BoundedIntInput): number {
  const parsed = Number(input.value)
  if (!Number.isFinite(parsed)) return input.fallback
  return Math.min(Math.max(Math.floor(parsed), input.min), input.max)
}

function routeTypeForMedia(mediaType: "movie" | "tv"): PosterRouteType {
  return mediaType === "tv" ? "series" : "movie"
}

function dedupeTargets(targets: readonly WarmupTarget[]): WarmupTarget[] {
  const seen = new Set<string>()
  const unique: WarmupTarget[] = []
  for (const target of targets) {
    const key = `${target.type}:${target.id}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(target)
  }
  return unique
}

function addTarget(targets: WarmupTarget[], target: WarmupTarget): void {
  if (target.id > 0) targets.push(target)
}

function buildPosterUrl(input: BuildPosterUrlInput): URL {
  // Self-fetch con origin interno fisso (127.0.0.1), come le route
  // defaults/mappings: l'origin derivato dagli header di richiesta
  // (X-Forwarded-Host / Host) è controllabile dal client → host header
  // injection / SSRF. Un CDN configurato via env (preferCdn) resta il primo
  // target quando presente: è configurazione fidata.
  const url = buildPosterPublicUrl(`/api/poster/${input.target.type}/${input.target.id}`, {
    origin: `http://127.0.0.1:${process.env.PORT || "3000"}`,
    preferCdn: input.req.nextUrl.searchParams.get("edge") !== "0",
  })
  const defaults = getServerDefaults()
  const params = buildStremioPosterSearchParams({
    lang: input.lang,
    globalBadges: defaults.globalBadges,
    rankingBadges: defaults.rankingBadges,
    badgeStyle: defaults.badgeStyle,
    rankingBadgeStyle: defaults.rankingBadgeStyle,
    gradientHeight: defaults.gradientHeight,
    blurIntensity: defaults.blurIntensity,
    blurFade: defaults.blurFade,
    blurDarkness: defaults.blurDarkness,
    blurEnabled: defaults.blurEnabled,
  })
  params.forEach((value, key) => url.searchParams.set(key, value))
  return url
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function POST(req: NextRequest) {
  // Auth coerente con le altre route admin: fail-open su istanza pubblica senza
  // ADMIN_TOKEN (HF Spaces), fail-closed quando un token è configurato.
  // Finding 16: POSTERIUM_WARMUP_TOKEN opzionale — se configurato, il warmup
  // richiede quel token (header x-warmup-token) O l'admin token. Così un'istanza
  // condivisa può proteggere l'endpoint-amplificatore senza rompere il
  // self-warmup dell'entrypoint (che lo invia se configurato).
  const warmupToken = process.env.POSTERIUM_WARMUP_TOKEN
  // Se POSTERIUM_WARMUP_TOKEN e' configurato, il warmup richiede quel token
  // (header x-warmup-token) O l'admin token. Se NON e' configurato, la guardia
  // resta checkAdminToken come prima (fail-open solo su istanza pubblica,
  // fail-closed sulle istanze private con ADMIN_TOKEN). NB: un primo ||
  // qui avrebbe aperto l'endpoint su ogni istanza senza warmup token -- il
  // checkAdminToken va consultato SEMPRE.
  const warmupHeaderOk = !warmupToken
    ? undefined
    : (() => {
        const header = req.headers.get("x-warmup-token")
        return !!header && constantTimeEqual(header, warmupToken)
      })()
  if (warmupHeaderOk !== true && !checkAdminToken(req)) return adminAuthResponse()
  const rl = rateLimit(rateLimitKey(req), "warmup")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!isSameOrigin(req)) return originMismatchResponse()

  const apiKey = resolveRequestApiKey(req)
  const lang = req.nextUrl.searchParams.get("lang") || "it"
  const concurrency = boundedInt({ value: req.nextUrl.searchParams.get("concurrency"), fallback: 3, min: 1, max: 8 })
  const trendingLimit = boundedInt({ value: req.nextUrl.searchParams.get("trending"), fallback: 50, min: 0, max: 100 })
  const justWatchLimit = boundedInt({ value: req.nextUrl.searchParams.get("justwatch"), fallback: 20, min: 0, max: 50 })
  const mappingLimit = boundedInt({ value: req.nextUrl.searchParams.get("mappings"), fallback: 200, min: 0, max: 500 })

  try {
    const [movies, tv, jwMovies, jwShows, mappings] = await Promise.allSettled([
      getTrending("movie", "day", apiKey, 1),
      getTrending("tv", "day", apiKey, 1),
      justWatchLimit > 0 ? getJWRankings("MOVIE", "IT", justWatchLimit) : Promise.resolve([]),
      justWatchLimit > 0 ? getJWRankings("SHOW", "IT", justWatchLimit) : Promise.resolve([]),
      getAll(),
    ])

    const targets: WarmupTarget[] = []
    if (movies.status === "fulfilled") {
      for (const item of movies.value.results.slice(0, trendingLimit)) {
        addTarget(targets, { type: "movie", id: item.id, source: "trending" })
      }
    }
    if (tv.status === "fulfilled") {
      for (const item of tv.value.results.slice(0, trendingLimit)) {
        addTarget(targets, { type: "series", id: item.id, source: "trending" })
      }
    }
    if (jwMovies.status === "fulfilled") {
      for (const item of jwMovies.value) {
        addTarget(targets, { type: "movie", id: item.tmdbId, source: "justwatch" })
      }
    }
    if (jwShows.status === "fulfilled") {
      for (const item of jwShows.value) {
        addTarget(targets, { type: "series", id: item.tmdbId, source: "justwatch" })
      }
    }
    if (mappings.status === "fulfilled") {
      for (const mapping of mappings.value.slice(0, mappingLimit)) {
        addTarget(targets, { type: routeTypeForMedia(mapping.mediaType), id: mapping.tmdbId, source: "mapping" })
      }
    }

    const queue = dedupeTargets(targets)
    const results: WarmupResult[] = []

    for (let i = 0; i < queue.length; i += concurrency) {
      const batch = queue.slice(i, i + concurrency)
      const batchResults = await Promise.all(batch.map(async (target): Promise<WarmupResult> => {
        try {
          const res = await fetch(buildPosterUrl({ req, target, lang }), { signal: AbortSignal.timeout(20_000) })
          if (!res.ok) return { ...target, status: "fail", statusCode: res.status }
          await res.arrayBuffer()
          return { ...target, status: "ok" }
        } catch (error: unknown) {
          if (error instanceof Error) log.error("Poster failed", { error: error.message })
          return { ...target, status: "fail" }
        }
      }))
      results.push(...batchResults)
    }

    return Response.json({
      total: queue.length,
      ok: results.filter((result) => result.status === "ok").length,
      fail: results.filter((result) => result.status === "fail").length,
      results,
    })
  } catch (error: unknown) {
    if (error instanceof Error) log.error("Failed", { error: error.message })
    return new Response("Warmup failed", { status: 500 })
  }
}
