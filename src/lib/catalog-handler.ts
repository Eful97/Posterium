import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getTop10 } from "@/lib/flixpatrol"
import { getServerDefaults } from "@/lib/server-defaults"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getById } from "@/lib/store"
import { getFullProfileData } from "@/lib/profile-store"
import { getDetails, getExternalIds, resolveRequestApiKey, type TMDBDetails } from "@/lib/tmdb"
import { fetchMDBList } from "@/lib/mdblist"
import { buildStremioPosterUrl } from "@/lib/stremio-poster-url"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { getJWRankings, type JWRankEntry } from "@/lib/justwatch"
import { createLogger } from "@/lib/logger"

const log = createLogger("catalog")

interface StremioMeta {
  id: string
  type: string
  name: string
  poster: string | null
  releaseInfo?: string
}

/** Riutilizza getJWRankings (cache condivisa 30 min + mock server nei test).
 *  Ritorna le righe complete: JustWatch fornisce già l'imdbId, così il
 *  catalogo non deve rifare una chiamata extra a TMDB per ogni titolo. */
async function getJustWatchRankings(type: "MOVIE" | "SHOW"): Promise<JWRankEntry[]> {
  try {
    return await getJWRankings(type, "IT", 20)
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

async function posteriumPosterUrl(req: NextRequest, type: "movie" | "series", id: number, configParam?: string | null, userParam?: string | null, mdblistKeyParam?: string | null, animeRankParam?: number | null): Promise<string> {
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
    mdblistKey: mdblistKeyParam || undefined,
    animerank: animeRankParam ?? undefined,
  }).toString()
}

/** Cache locale per la risoluzione IMDb ID — evita chiamate duplicate a TMDB */
const imdbIdCache = new Map<string, string | null>()
const IMDB_ID_CACHE_MAX = 2000
function imdbIdCacheSet(key: string, value: string | null) {
  if (imdbIdCache.size >= IMDB_ID_CACHE_MAX) {
    const oldest = imdbIdCache.keys().next().value
    if (oldest !== undefined) imdbIdCache.delete(oldest)
  }
  imdbIdCache.set(key, value)
}

/** TMDB /tv/{id} non include imdb_id — serve chiamata extra a external_ids.
 *  Anche i film devono esporre id IMDb (tt...) nei cataloghi: AIOMetadata e
 *  gli altri addon risolvono i metadati solo da id tt/provider:id, non da id
 *  numerici TMDB (altrimenti "no metadata").
 *  `apiKey` è la chiave della richiesta (header/query): senza, la chiamata
 *  external_ids cade (non esiste più una chiave d'istanza di fallback). */
async function resolveImdbId(mediaType: "movie" | "tv", tmdbId: number, apiKey?: string): Promise<string | null> {
  const cacheKey = `${mediaType}:${tmdbId}`
  const cached = imdbIdCache.get(cacheKey)
  if (cached !== undefined) return cached
  try {
    const result = await getExternalIds(mediaType, tmdbId, apiKey).then(r => r.imdb_id ?? null)
    imdbIdCacheSet(cacheKey, result)
    return result
  } catch {
    return null
  }
}

/** Ultima risorsa per l'id del catalogo: se manca l'imdbId, esporre un id
 *  provider (`tmdb:<id>`) che AIOMetadata sa risolvere — mai un numero nudo
 *  (che darebbe "no metadata" al click). */
function catalogMetaId(imdbId: string | null | undefined, tmdbId: number): string {
  return imdbId || `tmdb:${tmdbId}`
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
  // Chiave TMDB della richiesta: parte del cache key così un catalogo vuoto
  // servito a una richiesta senza chiave non avvelena quelle keyed (D3).
  let apiKey = resolveRequestApiKey(req)
  // Chiave MDBList della richiesta (anime): può arrivare dal profilo.
  let mdblistKey = mdblistKeyParam
  // Profilo utente (?u=): config + apiKeys (tmdbKey/mdblistApiKey) risiedono
  // lato server. Come nel poster route, la chiave del profilo vince su quella
  // della richiesta (header/query), così i cataloghi keyed con profilo non
  // restano vuoti per mancanza di chiave esplicita nella URL.
  if (userParam) {
    const fullProfile = await getFullProfileData(userParam).catch(() => null)
    if (fullProfile?.apiKeys?.tmdbKey) apiKey = fullProfile.apiKeys.tmdbKey
    if (!mdblistKey && fullProfile?.apiKeys?.mdblistApiKey) mdblistKey = fullProfile.apiKeys.mdblistApiKey
  }

  const cacheKey = `stremio:catalog:${stType}:${catalogId}:pv${POSTER_URL_VERSION}${userParam ? `:u${userParam}` : ""}:ak${apiKey ? hashFragment(apiKey) : "none"}${configParam ? `:cfg${hashFragment(configParam)}` : ""}${mdblistKey ? `:mk${hashFragment(mdblistKey)}` : ""}`
  const cached = cacheGet<{ metas: StremioMeta[] }>(cacheKey)
  if (cached) return catalogResponse(cached)

  try {
    let metas: StremioMeta[] = []

    if (catalogId.startsWith("posterium-jw")) {
      const rows = await getJustWatchRankings(stType === "movie" ? "MOVIE" : "SHOW")
      if (!apiKey) return catalogResponse({ metas: [] })
      const results = await Promise.all(rows.slice(0, 20).map(async (row) => {
        try {
          const d = await getDetails(stType === "movie" ? "movie" : "tv", row.tmdbId, "it-IT", apiKey)
          if (!d?.id) return null
          return { d, tmdbId: row.tmdbId, imdbId: row.imdbId }
        } catch {
          return null
        }
      }))
      const validResults = results.filter((r): r is { d: TMDBDetails; tmdbId: number; imdbId: string | null } => r !== null)
      metas = await Promise.all(validResults.map(async (r) => {
        const imdbId = r.imdbId || await resolveImdbId(stType === "movie" ? "movie" : "tv", r.tmdbId, apiKey)
        return {
          id: catalogMetaId(imdbId, r.tmdbId),
          type: stType,
          name: r.d.title || r.d.name || "",
          // La chiave MDBList esplicita (query) va nell'URL poster: un titolo
          // anime dentro un catalogo non-anime deve poter risolvere il proprio
          // rank su Stremio (precedenza animerank > fetch live > mapping).
          poster: await posteriumPosterUrl(req, stType, r.tmdbId, configParam, userParam, mdblistKeyParam),
          releaseInfo: (r.d.release_date || r.d.first_air_date || "").slice(0, 4) || undefined,
        }
      }))
    } else if (catalogId.startsWith("posterium-anime")) {
      const key = mdblistKey
      if (key) {
        const items = await fetchMDBList("mdblistAnime", key)
        const results = await Promise.all(items.map(async (item, idx) => {
          const tmdbId = Number(item.tmdb)
          if (!tmdbId) return null
          try {
            const d = await getDetails("tv", tmdbId, "it-IT", apiKey)
            if (!d?.id) return null
            return { d, tmdbId, imdb: item.imdb, rank: idx + 1 }
          } catch {
            return null
          }
        }))
        const validResults = results.filter((r): r is { d: TMDBDetails; tmdbId: number; imdb: string; rank: number } => r !== null)
        metas = await Promise.all(validResults.map(async (r) => {
          const imdbId = r.imdb || await resolveImdbId("tv", r.tmdbId, apiKey)
          return {
            id: catalogMetaId(imdbId, r.tmdbId),
            type: "series",
            name: r.d.name || "",
            poster: await posteriumPosterUrl(req, "series", r.tmdbId, configParam, userParam, mdblistKeyParam, r.rank),
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
        // C6: enrich:false — il catalogo non usa né posterPath né il titolo
        // TMDB it-IT (il poster lo costruisce posteriumPosterUrl): evitiamo i
        // ~2 fetch TMDB per titolo dell'enrichment, tenendo solo external_ids
        // per l'imdbId. Il nome resta quello del catalogo flixpatrol.
        const data = apiKey ? await getTop10(slug, "italy", apiKey, { enrich: false }).catch(() => null) : null
        if (data) {
          const items = stType === "movie" ? data.movies : data.tv
          const itemsWithTmdb = items.slice(0, 10).flatMap((item) => (
            item.tmdbId ? [{ ...item, tmdbId: item.tmdbId }] : []
          ))
          metas = await Promise.all(itemsWithTmdb.map(async (item) => {
            const imdbId = await resolveImdbId(stType === "movie" ? "movie" : "tv", item.tmdbId, apiKey)
            return {
              id: catalogMetaId(imdbId, item.tmdbId),
              type: stType,
              name: item.title,
              poster: await posteriumPosterUrl(req, stType, item.tmdbId, configParam, userParam, mdblistKeyParam),
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
