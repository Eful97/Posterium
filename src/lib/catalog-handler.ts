import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getTop10 } from "@/lib/flixpatrol"
import { getServerDefaults } from "@/lib/server-defaults"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getById } from "@/lib/store"
import { getDetails, getExternalIds, resolveRequestApiKey, type TMDBDetails } from "@/lib/tmdb"
import { fetchMDBList } from "@/lib/mdblist"
import { buildStremioPosterUrl } from "@/lib/stremio-poster-url"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { getJWRankings } from "@/lib/justwatch"
import { createLogger } from "@/lib/logger"

const log = createLogger("catalog")

interface StremioMeta {
  id: string
  type: string
  name: string
  poster: string | null
  releaseInfo?: string
}

/** Riutilizza getJWRankings (cache condivisa 30 min + mock server nei test). */
async function getJustWatchRankings(type: "MOVIE" | "SHOW"): Promise<number[]> {
  try {
    const rows = await getJWRankings(type, "IT", 20)
    return rows.map((r) => r.tmdbId)
  } catch {
    return []
  }
}

/** Hash breve e stabile di una chiave per i cache key — mai il frammento grezzo. */
function hashFragment(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 8)
}

const PLATFORM_SLUGS: Record<string, string> = {
  netflix: "netflix", prime: "amazon-prime", disney: "disney",
  apple: "apple-tv", hbo: "hbo-max", paramount: "paramount-plus",
}

type StremioCatalogType = "movie" | "series"

function catalogResponse(body: { metas: StremioMeta[] }): Response {
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

function normalizeCatalogType(type: string): StremioCatalogType {
  return type === "movie" ? "movie" : "series"
}

async function posteriumPosterUrl(req: NextRequest, type: "movie" | "series", id: number, configParam?: string | null, userParam?: string | null): Promise<string> {
  const defaults = getServerDefaults()
  const mapping = await getById(type === "series" ? "tv" : "movie", id)
  return buildStremioPosterUrl({
    origin: getOriginFromRequest(req),
    type,
    id,
    defaults,
    mapping,
    lang: "it",
    config: configParam || undefined,
    user: userParam || undefined,
  }).toString()
}

/** Cache locale per la risoluzione IMDb ID — evita chiamate duplicate a TMDB */
const imdbIdCache = new Map<number, string | null>()
const IMDB_ID_CACHE_MAX = 2000
function imdbIdCacheSet(tmdbId: number, value: string | null) {
  if (imdbIdCache.size >= IMDB_ID_CACHE_MAX) {
    const oldest = imdbIdCache.keys().next().value
    if (oldest !== undefined) imdbIdCache.delete(oldest)
  }
  imdbIdCache.set(tmdbId, value)
}

/** TMDB /tv/{id} non include imdb_id — serve chiamata extra a external_ids */
async function resolveImdbId(mediaType: "movie" | "tv", tmdbId: number): Promise<string | null> {
  if (mediaType === "movie") return null
  const cached = imdbIdCache.get(tmdbId)
  if (cached !== undefined) return cached
  try {
    const result = await getExternalIds("tv", tmdbId).then(r => r.imdb_id ?? null)
    imdbIdCacheSet(tmdbId, result)
    return result
  } catch {
    return null
  }
}

/**
 * Risposta catalogo Stremio. Il profilo arriva da query (`?u=`) o dal path
 * (`/u/<uuid>/catalog/...`): il parametro è esplicito così entrambi i route
 * condividono la stessa logica.
 */
export async function posteriumCatalog(
  req: NextRequest,
  mediaType: string,
  rawId: string,
  userParam: string | null,
  configParam: string | null,
): Promise<Response> {
  const rl = rateLimit(rateLimitKey(req), "catalog")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const catalogId = rawId.replace(/\.json$/, "")
  if (catalogId.length > 80) return catalogResponse({ metas: [] })
  const stType = normalizeCatalogType(mediaType)
  const mdblistKeyParam = req.nextUrl.searchParams.get("mdblist_key") || undefined

  const cacheKey = `stremio:catalog:${stType}:${catalogId}:pv${POSTER_URL_VERSION}${userParam ? `:u${userParam}` : ""}${configParam ? `:cfg${hashFragment(configParam)}` : ""}${mdblistKeyParam ? `:mk${hashFragment(mdblistKeyParam)}` : ""}`
  const cached = cacheGet<{ metas: StremioMeta[] }>(cacheKey)
  if (cached) return catalogResponse(cached)

  try {
    let metas: StremioMeta[] = []

    if (catalogId.startsWith("posterium-jw")) {
      const ids = await getJustWatchRankings(stType === "movie" ? "MOVIE" : "SHOW")
      const apiKey = resolveRequestApiKey(req)
      if (!apiKey) return catalogResponse({ metas: [] })
      const results = await Promise.all(ids.slice(0, 20).map(async (id) => {
        try {
          const d = await getDetails(stType === "movie" ? "movie" : "tv", id, "it-IT", apiKey)
          if (!d?.id) return null
          return { d, tmdbId: id }
        } catch {
          return null
        }
      }))
      const validResults = results.filter((r): r is { d: TMDBDetails; tmdbId: number } => r !== null)
      metas = await Promise.all(validResults.map(async (r) => {
        const imdbId = stType === "series" ? await resolveImdbId("tv", r.tmdbId) : null
        return {
          id: imdbId || r.tmdbId.toString(),
          type: stType,
          name: r.d.title || r.d.name || "",
          poster: await posteriumPosterUrl(req, stType, r.tmdbId, configParam, userParam),
          releaseInfo: (r.d.release_date || r.d.first_air_date || "").slice(0, 4) || undefined,
        }
      }))
    } else if (catalogId.startsWith("posterium-anime")) {
      const key = mdblistKeyParam || process.env.MDBLIST_API_KEY
      if (key) {
        const items = await fetchMDBList("mdblistAnime", key)
        const results = await Promise.all(items.map(async (item) => {
          const tmdbId = Number(item.tmdb)
          if (!tmdbId) return null
          try {
            const d = await getDetails("tv", tmdbId, "it-IT", resolveRequestApiKey(req))
            if (!d?.id) return null
            return { d, tmdbId, imdb: item.imdb }
          } catch {
            return null
          }
        }))
        const validResults = results.filter((r): r is { d: TMDBDetails; tmdbId: number; imdb: string } => r !== null)
        metas = await Promise.all(validResults.map(async (r) => {
          const imdbId = r.imdb || await resolveImdbId("tv", r.tmdbId)
          return {
            id: imdbId || r.tmdbId.toString(),
            type: "series",
            name: r.d.name || "",
            poster: await posteriumPosterUrl(req, "series", r.tmdbId, configParam, userParam),
            releaseInfo: (r.d.first_air_date || "").slice(0, 4) || undefined,
          }
        }))
      }
    } else {
      let slug = ""
      for (const [k, v] of Object.entries(PLATFORM_SLUGS)) {
        if (catalogId.includes(k)) { slug = v; break }
      }
      if (slug) {
        const apiKey = process.env.TMDB_API_KEY
        const data = apiKey ? await getTop10(slug, "italy", apiKey).catch(() => null) : null
        if (data) {
          const items = stType === "movie" ? data.movies : data.tv
          const itemsWithTmdb = items.slice(0, 10).flatMap((item) => (
            item.tmdbId ? [{ ...item, tmdbId: item.tmdbId }] : []
          ))
          metas = await Promise.all(itemsWithTmdb.map(async (item) => {
            const imdbId = stType === "series" ? await resolveImdbId("tv", item.tmdbId) : null
            return {
              id: imdbId || item.tmdbId.toString(),
              type: stType,
              name: item.title,
              poster: await posteriumPosterUrl(req, stType, item.tmdbId, configParam, userParam),
              releaseInfo: item.releaseDate?.slice(0, 4) || undefined,
            }
          }))
        }
      }
    }

    const body = { metas }
    cacheSet(cacheKey, body, ["stremio", "catalog"], metas.length > 0 ? undefined : 60_000)
    return catalogResponse(body)
  } catch (e) {
    log.error("Catalog error", { error: e instanceof Error ? e.message : String(e) })
    return catalogResponse({ metas: [] })
  }
}
