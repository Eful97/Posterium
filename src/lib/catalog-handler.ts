import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getTop10 } from "@/lib/flixpatrol"
import { getServerDefaults } from "@/lib/server-defaults"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getById } from "@/lib/store"
import { getFullProfileData } from "@/lib/profile-store"
import { decodeConfig } from "@/lib/config-token"
import { getDetails, getExternalIds, resolveRequestApiKey, searchMovies, searchTV, tmdbFindByImdb, type TMDBDetails } from "@/lib/tmdb"
import { fetchCustomMDBList, fetchMDBList } from "@/lib/mdblist"
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

export interface CatalogExtraParams {
  search?: string
  skip?: number
  genre?: string
}

/**
 * Estrae parametri extra da Stremio (sia da segmenti di path es. `search=Avatar&skip=0.json`
 * sia da query string `?search=Avatar`).
 */
export function parseCatalogExtra(
  extraSegments?: string[] | string | null,
  searchParams?: URLSearchParams | null,
): CatalogExtraParams {
  const result: CatalogExtraParams = {}

  if (searchParams) {
    const s = searchParams.get("search")
    if (s && s.trim()) result.search = s.trim()
    const sk = searchParams.get("skip")
    if (sk) {
      const parsed = parseInt(sk, 10)
      if (!Number.isNaN(parsed) && parsed >= 0) result.skip = parsed
    }
    const g = searchParams.get("genre")
    if (g && g.trim()) result.genre = g.trim()
  }

  if (extraSegments) {
    const rawList = Array.isArray(extraSegments) ? extraSegments : [extraSegments]
    for (const seg of rawList) {
      if (!seg) continue
      const cleaned = seg.replace(/\.json$/, "")
      const pairs = cleaned.split("&")
      for (const pair of pairs) {
        const eqIdx = pair.indexOf("=")
        if (eqIdx !== -1) {
          try {
            const key = decodeURIComponent(pair.slice(0, eqIdx))
            const val = decodeURIComponent(pair.slice(eqIdx + 1))
            if (key === "search" && val.trim()) {
              result.search = val.trim()
            } else if (key === "skip") {
              const parsed = parseInt(val, 10)
              if (!Number.isNaN(parsed) && parsed >= 0) result.skip = parsed
            } else if (key === "genre" && val.trim()) {
              result.genre = val.trim()
            }
          } catch {
            // Ignora frammenti non decodificabili
          }
        }
      }
    }
  }

  return result
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
  now: "now",
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
  extraSegments?: string[] | string | null,
): Promise<Response> {
  const rl = rateLimit(rateLimitKey(req), "catalog")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const catalogId = rawId.replace(/\.json$/, "")
  if (catalogId.length > 80) return catalogResponse({ metas: [] })
  const stType = normalizeCatalogType(mediaType)
  const extra = parseCatalogExtra(extraSegments, req.nextUrl.searchParams)
  const mdblistKeyParam = req.nextUrl.searchParams.get("mdblist_key") || undefined
  // Chiave TMDB della richiesta: parte del cache key così un catalogo vuoto
  // servito a una richiesta senza chiave non avvelena quelle keyed (D3).
  let apiKey = resolveRequestApiKey(req)
  // Chiave MDBList della richiesta (anime/custom): può arrivare dal profilo o, come
  // fallback per istanze personali, dall'env POSTERIUM_MDBLIST_KEY.
  let mdblistKey = mdblistKeyParam || process.env.POSTERIUM_MDBLIST_KEY
  let userConfig = null
  if (userParam) {
    const fullProfile = await getFullProfileData(userParam).catch(() => null)
    if (fullProfile?.apiKeys?.tmdbKey) apiKey = fullProfile.apiKeys.tmdbKey
    if (!mdblistKey && fullProfile?.apiKeys?.mdblistApiKey) mdblistKey = fullProfile.apiKeys.mdblistApiKey
    if (fullProfile?.config) userConfig = fullProfile.config
  }
  if (!userConfig && configParam) {
    userConfig = decodeConfig(configParam)
  }

  // --- Gestione Ricerca Stremio (sia via barra di ricerca che catalogo dedicato) ---
  if (extra.search) {
    if (!apiKey) return catalogResponse({ metas: [] })
    const page = Math.floor((extra.skip || 0) / 20) + 1
    const searchCacheKey = `stremio:search:${stType}:${hashFragment(extra.search)}:p${page}:pv${POSTER_URL_VERSION}${userParam ? `:u${userParam}` : ""}:ak${hashFragment(apiKey)}${configParam ? `:cfg${hashFragment(configParam)}` : ""}${mdblistKey ? `:mk${hashFragment(mdblistKey)}` : ""}`
    const cachedSearch = cacheGet<{ metas: StremioMeta[] }>(searchCacheKey)
    if (cachedSearch) return catalogResponse(cachedSearch)

    try {
      const searchRes = stType === "movie"
        ? await searchMovies(extra.search, "it-IT", apiKey, page)
        : await searchTV(extra.search, "it-IT", apiKey, page)

      const items = (searchRes?.results || []).slice(0, 20)
      const results: (StremioMeta | null)[] = await Promise.all(items.map(async (item) => {
        if (!item.id) return null
        const imdbId = await resolveImdbId(stType === "movie" ? "movie" : "tv", item.id, apiKey)
        const poster = await posteriumPosterUrl(req, stType, item.id, configParam, userParam, mdblistKeyParam)
        const releaseInfo = (item.release_date || item.first_air_date || "").slice(0, 4) || undefined
        return {
          id: catalogMetaId(imdbId, item.id),
          type: stType,
          name: item.title || item.name || "",
          poster,
          releaseInfo,
        }
      }))
      const metas = results.filter((m): m is StremioMeta => m !== null)
      const body = { metas }
      cacheSet(searchCacheKey, body, ["stremio", "search"], 10 * 60 * 1000)
      return catalogResponse(body)
    } catch (e) {
      log.error("Search failed", { error: e instanceof Error ? e.message : String(e) })
      return catalogResponse({ metas: [] })
    }
  }

  // Se è un catalogo di ricerca dedicato ma non è stata passata alcuna query
  if (catalogId.startsWith("posterium-search-")) {
    return catalogResponse({ metas: [] })
  }

  const cacheKey = `stremio:catalog:${stType}:${catalogId}:pv${POSTER_URL_VERSION}${userParam ? `:u${userParam}` : ""}:ak${apiKey ? hashFragment(apiKey) : "none"}${configParam ? `:cfg${hashFragment(configParam)}` : ""}${mdblistKey ? `:mk${hashFragment(mdblistKey)}` : ""}`
  const cached = cacheGet<{ metas: StremioMeta[] }>(cacheKey)
  if (cached) return catalogResponse(cached)

  try {
    let metas: StremioMeta[] = []

    if (catalogId.startsWith("posterium-custom-")) {
      let customId = catalogId.replace(/^posterium-custom-/, "")
      if (customId.startsWith("movie-")) customId = customId.slice(6)
      else if (customId.startsWith("series-")) customId = customId.slice(7)

      const customCat = userConfig?.customCatalogs?.find((c) => c.id === customId)
      if (customCat && customCat.enabled !== false) {
        let items = await fetchCustomMDBList(customCat.url, mdblistKey, 40)
        // Se la lista è mista o contiene mediatype, filtra in base al tipo di catalogo richiesto
        if (customCat.type === "mixed") {
          if (stType === "movie") {
            items = items.filter((it) => it.mediatype !== "show" && it.mediatype !== "tv" && it.mediatype !== "anime")
          } else {
            items = items.filter((it) => it.mediatype !== "movie")
          }
        }
        items = items.slice(0, 20)

        const results = await Promise.all(items.map(async (item, idx) => {
          let tmdbId = Number(item.tmdb)
          if (!tmdbId && item.imdb) {
            tmdbId = await tmdbFindByImdb(item.imdb, stType === "movie" ? "movie" : "tv", apiKey) || 0
          }
          if (!tmdbId) return null
          try {
            const d = await getDetails(stType === "movie" ? "movie" : "tv", tmdbId, "it-IT", apiKey)
            if (!d?.id) return null
            return { d, tmdbId, imdb: item.imdb, rank: idx + 1 }
          } catch {
            return null
          }
        }))
        const validResults = results.filter((r): r is { d: TMDBDetails; tmdbId: number; imdb: string; rank: number } => r !== null)
        metas = await Promise.all(validResults.map(async (r) => {
          const imdbId = r.imdb || await resolveImdbId(stType === "movie" ? "movie" : "tv", r.tmdbId, apiKey)
          return {
            id: catalogMetaId(imdbId, r.tmdbId),
            type: stType,
            name: r.d.title || r.d.name || "",
            poster: await posteriumPosterUrl(req, stType, r.tmdbId, configParam, userParam, mdblistKeyParam, r.rank),
            releaseInfo: (r.d.release_date || r.d.first_air_date || "").slice(0, 4) || undefined,
          }
        }))
      }
    } else if (catalogId.startsWith("posterium-jw")) {
      // Fix L12: la chiave si controlla PRIMA del fetch JustWatch — prima i
      // 15s del fetch JW venivano sprecati su ogni cache-miss senza chiave
      // (risultato comunque vuoto).
      if (!apiKey) return catalogResponse({ metas: [] })
      const rows = await getJustWatchRankings(stType === "movie" ? "MOVIE" : "SHOW")
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
