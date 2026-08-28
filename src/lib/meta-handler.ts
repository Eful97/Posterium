import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getServerDefaults } from "@/lib/server-defaults"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getById } from "@/lib/store"
import { decodeConfig, type PosteriumUserConfig } from "@/lib/config-token"
import {
  getFullDetails,
  getExternalIds,
  getImages,
  getTVSeason,
  getTVEpisodeGroups,
  getTVEpisodeGroup,
  type TMDBEpisodeGroupDetails,
  posterUrl,
  posterUrlOriginal,
  resolveRequestApiKey,
  tmdbFindByImdb,
  tmdbFindByTvdb,
} from "@/lib/tmdb"
import { buildStremioPosterUrl } from "@/lib/stremio-poster-url"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { enrichVideosWithTvdb } from "@/lib/tvdb"
import { createLogger } from "@/lib/logger"

const log = createLogger("meta")

export interface StremioVideo {
  id: string
  name: string
  season: number
  episode: number
  overview?: string
  thumbnail?: string
  released?: string
  rating?: string
}

export interface StremioTrailer {
  source: string
  type: string
}

export interface StremioMetaDetail {
  id: string
  imdb_id?: string
  type: "movie" | "series"
  name: string
  genres: string[]
  poster: string | null
  posterShape?: "poster"
  background?: string
  logo?: string
  description?: string
  releaseInfo?: string
  released?: string
  runtime?: string
  imdbRating?: string
  cast?: string[]
  director?: string[]
  writer?: string[]
  trailers?: StremioTrailer[]
  behaviorHints?: {
    defaultVideoId?: string
  }
  videos?: StremioVideo[]
}

function metaResponse(body: { meta: StremioMetaDetail | null }): Response {
  return Response.json(body, {
    headers: {
      // Stremio Web usa CDN con cache lunga: 12h rendeva invisibile il cambio
      // ordinamento (Re:ZERO: funzionava su Nuvio/bypass, non su Stremio web).
      // 5 min + SWR breve è sufficiente per le performance e permette al
      // cambio episodeGroupId di propagarsi velocemente. Il server invalida
      // comunque la cache interna su PUT/POST mapping.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

function hashFragment(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 8)
}

function normalizeMediaType(type: string): "movie" | "series" {
  const t = type.toLowerCase()
  return (t === "movie" || t === "anime.movie") ? "movie" : "series"
}

async function posteriumPosterUrl(
  req: NextRequest,
  type: "movie" | "series",
  id: number,
  configParam?: string | null,
  userParam?: string | null,
  mdblistKeyParam?: string | null,
): Promise<string> {
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
  }).toString()
}

/** Cache locale per la risoluzione IMDb ID */
interface ImdbCacheEntry {
  value: string | null
  expiry: number
}
const imdbIdCache = new Map<string, ImdbCacheEntry>()
const IMDB_ID_CACHE_MAX = 2000
function imdbIdCacheSet(key: string, value: string | null, ttlMs: number) {
  if (imdbIdCache.size >= IMDB_ID_CACHE_MAX) {
    const oldest = imdbIdCache.keys().next().value
    if (oldest !== undefined) imdbIdCache.delete(oldest)
  }
  imdbIdCache.set(key, { value, expiry: Date.now() + ttlMs })
}

async function resolveImdbId(mediaType: "movie" | "tv", tmdbId: number, apiKey?: string): Promise<string | null> {
  const cacheKey = `${mediaType}:${tmdbId}`
  const cached = imdbIdCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) return cached.value
  try {
    const result = await getExternalIds(mediaType, tmdbId, apiKey).then((r) => r.imdb_id ?? null)
    const ttl = result !== null ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    imdbIdCacheSet(cacheKey, result, ttl)
    return result
  } catch {
    imdbIdCacheSet(cacheKey, null, 60_000)
    return null
  }
}

/**
 * Gestore principale della risorsa `meta` di Stremio.
 * Fornisce schede complete (dettagli, cast, trailer, trame, logo e lista episodi)
 * con il poster nativo di Posterium.
 */
export async function posteriumMeta(
  req: NextRequest,
  mediaType: string,
  rawId: string,
  userParam: string | null,
  configParam: string | null,
): Promise<Response> {
  const rl = rateLimit(rateLimitKey(req), "catalog")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const cleanId = rawId.replace(/\.json$/, "")
  if (cleanId.length > 80) return metaResponse({ meta: null })

  const stType = normalizeMediaType(mediaType)
  const tmdbMediaType = stType === "movie" ? "movie" : "tv"
  const mdblistKeyParam = req.nextUrl.searchParams.get("mdblist_key") || undefined
  const tvdbKeyParam = req.nextUrl.searchParams.get("tvdb_key") || undefined

  const apiKey = resolveRequestApiKey(req)
  const mdblistKey = mdblistKeyParam || process.env.POSTERIUM_MDBLIST_KEY
  const tvdbApiKey = tvdbKeyParam || process.env.POSTERIUM_TVDB_API_KEY || process.env.TVDB_API_KEY
  let userConfig: Partial<PosteriumUserConfig> | null = null

  if (configParam) {
    userConfig = decodeConfig(configParam)
  }
  if (!userConfig) {
    userConfig = getServerDefaults()
  }

  const episodeMetadataSource = userConfig?.episodeMetadataSource || (tvdbApiKey ? "tvdb" : "tmdb")

  // Risoluzione ID TMDB e IMDb
  let tmdbId: number | null = null
  let imdbId: string | null = null

  if (cleanId.startsWith("tt")) {
    imdbId = cleanId
    tmdbId = await tmdbFindByImdb(cleanId, tmdbMediaType, apiKey)
  } else if (cleanId.startsWith("tmdb:")) {
    const parsed = parseInt(cleanId.slice(5), 10)
    if (!Number.isNaN(parsed) && parsed > 0) tmdbId = parsed
  } else if (cleanId.startsWith("tvdb:")) {
    const tvdbRaw = cleanId.slice(5)
    tmdbId = await tmdbFindByTvdb(tvdbRaw, tmdbMediaType, apiKey)
  } else if (cleanId.startsWith("tvdbc:")) {
    const tvdbRaw = cleanId.slice(6)
    tmdbId = await tmdbFindByTvdb(tvdbRaw, tmdbMediaType, apiKey)
  } else if (/^\d+$/.test(cleanId)) {
    const parsed = parseInt(cleanId, 10)
    if (!Number.isNaN(parsed) && parsed > 0) tmdbId = parsed
  }

  if (!tmdbId) {
    return metaResponse({ meta: null })
  }

  // Per le serie, il meta videos dipende dal mapping episodeGroupId: includilo nella
  // cache key (fetch pre-cache) altrimenti dopo un cambio ordinamento si serve lo
  // stale per 12h. Il lookup è cached (memCache/KV 500ms) quindi costo minimo.
  let preMappingForCache: { episodeGroupId?: string | null; updatedAt?: string } | null = null
  if (stType === "series") {
    try {
      const pre = await getById("tv", tmdbId)
      if (pre) preMappingForCache = { episodeGroupId: pre.episodeGroupId ?? null, updatedAt: pre.updatedAt }
    } catch { /* ignore — fallback a auto */ }
  }
  const egKey = preMappingForCache ? `${preMappingForCache.episodeGroupId ?? "auto"}:${preMappingForCache.updatedAt ?? ""}` : "auto"
  const cacheKey = `stremio:meta:${stType}:${cleanId}:pv${POSTER_URL_VERSION}${userParam ? `:u${hashFragment(userParam)}` : ""}:ak${apiKey ? hashFragment(apiKey) : "none"}${configParam ? `:cfg${hashFragment(configParam)}` : ""}${mdblistKey ? `:mk${hashFragment(mdblistKey)}` : ""}${tvdbApiKey ? `:tk${hashFragment(tvdbApiKey)}` : ""}:es${episodeMetadataSource}:eg${hashFragment(egKey)}`
  const cached = cacheGet<{ meta: StremioMetaDetail }>(cacheKey)
  if (cached) return metaResponse(cached)

  try {
    const details = await getFullDetails(tmdbMediaType, tmdbId, "it-IT", apiKey)
    if (!details || !details.id) {
      return metaResponse({ meta: null })
    }

    if (!imdbId && details.external_ids?.imdb_id) {
      imdbId = details.external_ids.imdb_id
    }
    if (!imdbId) {
      imdbId = await resolveImdbId(tmdbMediaType, tmdbId, apiKey)
    }

    const primaryId = imdbId || `tmdb:${tmdbId}`
    const poster = await posteriumPosterUrl(req, stType, tmdbId, configParam, userParam, mdblistKeyParam)
    const background = details.backdrop_path ? posterUrlOriginal(details.backdrop_path) : undefined

    // Risoluzione Logo
    let logo: string | undefined
    try {
      const images = await getImages(tmdbMediaType, tmdbId, "it,en,null", apiKey)
      if (images?.logos && images.logos.length > 0) {
        // Preferisci logo italiano, altrimenti primo disponibile
        const itLogo = images.logos.find((l) => l.iso_639_1 === "it") || images.logos[0]
        if (itLogo?.file_path) {
          logo = posterUrlOriginal(itLogo.file_path)
        }
      }
    } catch {
      // Logo opzionale
    }

    const cast = (details.credits?.cast || []).slice(0, 10).map((c) => c.name)
    const director = (details.credits?.crew || []).filter((c) => c.job === "Director").map((c) => c.name)
    const writers = (details.credits?.crew || []).filter((c) => c.job === "Writer" || c.job === "Screenplay").map((c) => c.name)

    const trailers: StremioTrailer[] = (details.videos?.results || [])
      .filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
      .slice(0, 3)
      .map((v) => ({ source: v.key, type: "Trailer" }))

    let videos: StremioVideo[] | undefined

    if (stType === "series") {
      videos = []
      const mapping = await getById("tv", tmdbId)

      let groupDetails: TMDBEpisodeGroupDetails | null = null

      if (mapping?.episodeGroupId && mapping.episodeGroupId !== "standard") {
        groupDetails = await getTVEpisodeGroup(mapping.episodeGroupId, "it-IT", apiKey)
      } else if (!mapping?.episodeGroupId) {
        // Controlla se esistono Episode Groups alternativi (es. Italian Parts, Netflix Order, Digital, ecc.)
        const epGroups = await getTVEpisodeGroups(tmdbId, apiKey)
        // Filtra gruppi vuoti (episode_count 0 => selezione inutile, Re:ZERO ne ha 2)
        const validGroups = epGroups.filter((g) => (g.episode_count ?? 0) > 0 && (g.group_count ?? 0) > 0)
        const candidatePool = validGroups.length > 0 ? validGroups : epGroups
        const preferredGroup = candidatePool.find((g) => {
          const n = (g.name ?? "").toLowerCase()
          return (n.includes("italian") || n.includes("italia") || n.includes("italy")) && (g.group_count ?? 0) > 1
        }) || candidatePool.find((g) => {
          const n = (g.name ?? "").toLowerCase()
          return (n.includes("part") || n.includes("digital")) && (g.group_count ?? 0) >= 4
        }) || candidatePool.find((g) => {
          const n = (g.name ?? "").toLowerCase()
          return n.includes("netflix") && !n.includes("seasons (edited")
        }) || candidatePool.find((g) => {
          const n = (g.name ?? "").toLowerCase()
          return (n.includes("digital") || n.includes("part") || n.includes("streaming") || (g.type === 1 && (g.group_count ?? 0) > 1))
        }) || (() => {
          // Fallback per anime/titoli senza match euristici (Re:ZERO: 8 gruppi,
          // nessuno matcha sopra → prima fallback a standard 1 stagione con 85 ep.
          // Scegli il gruppo valido con più episodi e più parti, preferendo
          // type 6 (Production/Seasons) che di solito è l'ordinamento a stagioni.
          const sortedByEpisodes = [...candidatePool].sort((a, b) => (b.episode_count ?? 0) - (a.episode_count ?? 0))
          const prodSeasons = sortedByEpisodes.find((g) => g.type === 6 && (g.group_count ?? 0) > 1)
          if (prodSeasons) return prodSeasons
          // altrimenti il più popolato con almeno 2 parti
          return sortedByEpisodes.find((g) => (g.group_count ?? 0) > 1) || null
        })()

        if (preferredGroup) {
          groupDetails = await getTVEpisodeGroup(preferredGroup.id, "it-IT", apiKey)
        }
      }

      if (groupDetails?.groups && groupDetails.groups.length > 0) {
        // Filtra gruppi vuoti (es. Chapter Arc con 3 parti vuote su 6) per non creare stagioni vuote
        const nonEmptyGroups = groupDetails.groups.filter((g) => g.episodes && g.episodes.length > 0)
        const groupsForMeta = nonEmptyGroups.length > 0 ? nonEmptyGroups : groupDetails.groups
        const sortedGroups = [...groupsForMeta].sort((a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0))
        // TMDB gruppi hanno order 1-indexed in molti casi (es. Netflix Collections 1..6) ma
        // 0-indexed in altri (es. 0..4). Rileva in base alla presenza di uno 0: se c'è
        // uno 0, tutti i valori sono 0-based e va aggiunto +1, altrimenti sono già 1-based.
        // Eccezione: se c'è un gruppo "Specials" a order 0, quello va mappato a stagione 0
        // (Stremio season 0 = Specials), non a 1 — altrimenti Re:ZERO shifta tutto di 1.
        const hasZeroGroupOrder = sortedGroups.some((g) => g.order === 0)
        const hasSpecialsGroup = sortedGroups.some((g) => g.name?.toLowerCase().includes("special"))
        for (let gIdx = 0; gIdx < sortedGroups.length; gIdx++) {
          const grp = sortedGroups[gIdx]
          let seasonNumber: number
          if (typeof grp.order === "number") {
            if (hasSpecialsGroup && grp.name?.toLowerCase().includes("special") && grp.order === 0) {
              seasonNumber = 0
            } else if (hasZeroGroupOrder) {
              seasonNumber = hasSpecialsGroup ? grp.order : grp.order + 1
            } else {
              seasonNumber = grp.order
            }
          } else {
            seasonNumber = gIdx + 1
          }
          const sortedEpisodes = [...(grp.episodes || [])].sort((a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0))
          for (let epIdx = 0; epIdx < sortedEpisodes.length; epIdx++) {
            const ep = sortedEpisodes[epIdx]
            const episodeNumber = typeof ep.order === "number" ? ep.order + 1 : epIdx + 1
            videos.push({
              id: `${primaryId}:${seasonNumber}:${episodeNumber}`,
              name: ep.name || `Episodio ${episodeNumber}`,
              season: seasonNumber,
              episode: episodeNumber,
              overview: ep.overview || undefined,
              thumbnail: ep.still_path ? posterUrl(ep.still_path, "w500") : undefined,
              released: ep.air_date ? `${ep.air_date}T00:00:00.000Z` : undefined,
              rating: ep.vote_average ? ep.vote_average.toFixed(1) : undefined,
            })
          }
        }
      }

      // Fallback alle stagioni standard se non ci sono Episode Groups alternativi
      if (videos.length === 0 && details.seasons && details.seasons.length > 0) {
        const regularSeasons = details.seasons.filter((s) => s.season_number > 0)
        const seasonsData = await Promise.all(
          regularSeasons.map(async (s) => {
            return getTVSeason(tmdbId, s.season_number, "it-IT", apiKey)
          })
        )

        for (const sData of seasonsData) {
          if (!sData || !sData.episodes) continue
          for (const ep of sData.episodes) {
            videos.push({
              id: `${primaryId}:${ep.season_number}:${ep.episode_number}`,
              name: ep.name || `Episodio ${ep.episode_number}`,
              season: ep.season_number,
              episode: ep.episode_number,
              overview: ep.overview || undefined,
              thumbnail: ep.still_path ? posterUrl(ep.still_path, "w500") : undefined,
              released: ep.air_date ? `${ep.air_date}T00:00:00.000Z` : undefined,
              rating: ep.vote_average ? ep.vote_average.toFixed(1) : undefined,
            })
          }
        }
      }

      // Se la fonte metadati episodi è TVDB ed è presente una chiave TVDB, arricchisci con copertine e trame TVDB
      if (videos.length > 0 && episodeMetadataSource === "tvdb" && tvdbApiKey) {
        await enrichVideosWithTvdb(videos, imdbId, tmdbId, tvdbApiKey, "ita")
      }
    }

    const meta: StremioMetaDetail = {
      id: cleanId,
      imdb_id: imdbId || undefined,
      type: stType,
      name: details.title || details.name || "",
      genres: (details.genres || []).map((g) => g.name),
      poster,
      posterShape: "poster",
      background,
      logo,
      description: details.overview || details.tagline || undefined,
      releaseInfo: (details.release_date || details.first_air_date || "").slice(0, 4) || undefined,
      released: details.release_date ? `${details.release_date}T00:00:00.000Z` : undefined,
      runtime: details.runtime ? `${details.runtime} min` : undefined,
      imdbRating: details.vote_average ? details.vote_average.toFixed(1) : undefined,
      cast: cast.length > 0 ? cast : undefined,
      director: director.length > 0 ? director : undefined,
      writer: writers.length > 0 ? writers : undefined,
      trailers: trailers.length > 0 ? trailers : undefined,
      behaviorHints: stType === "movie" ? { defaultVideoId: primaryId } : undefined,
      videos: videos && videos.length > 0 ? videos : undefined,
    }

    const body = { meta }
    cacheSet(cacheKey, body, ["stremio", "meta"], 12 * 60 * 60 * 1000)
    return metaResponse(body)
  } catch (e) {
    log.error("Meta retrieval error", { error: e instanceof Error ? e.message : String(e) })
    return metaResponse({ meta: null })
  }
}
