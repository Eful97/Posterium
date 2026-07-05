import { NextRequest } from "next/server"
import { getJWRankings } from "@/lib/justwatch"
import { buildPosterPublicUrl } from "@/lib/poster-public-url"
import { getServerDefaults } from "@/lib/server-defaults"
import { buildStremioPosterSearchParams } from "@/lib/stremio-poster-params"
import { getAll } from "@/lib/store"
import { getTrending } from "@/lib/tmdb"

const WARMUP_TOKEN = process.env.ADMIN_TOKEN || process.env.WARMUP_TOKEN

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
  readonly apiKey?: string
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
  const url = buildPosterPublicUrl(`/api/poster/${input.target.type}/${input.target.id}`, {
    origin: input.req.nextUrl.origin,
    preferCdn: input.req.nextUrl.searchParams.get("edge") !== "0",
  })
  const defaults = getServerDefaults()
  const params = buildStremioPosterSearchParams({
    apiKey: input.apiKey,
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

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "")
  if (WARMUP_TOKEN && auth !== WARMUP_TOKEN) {
    return new Response("Unauthorized", { status: 401 })
  }

  const apiKey = req.nextUrl.searchParams.get("api_key") || process.env.TMDB_API_KEY || undefined
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
          const res = await fetch(buildPosterUrl({ req, target, apiKey, lang }), { signal: AbortSignal.timeout(20_000) })
          if (!res.ok) return { ...target, status: "fail", statusCode: res.status }
          await res.arrayBuffer()
          return { ...target, status: "ok" }
        } catch (error: unknown) {
          if (error instanceof Error) console.error("[warmup] Poster failed:", error.message)
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
    if (error instanceof Error) console.error("[warmup] Failed:", error.message)
    return new Response("Warmup failed", { status: 500 })
  }
}
