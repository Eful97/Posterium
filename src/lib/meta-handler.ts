import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getServerDefaults } from "@/lib/server-defaults"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getById } from "@/lib/store"
import { getFullProfileData } from "@/lib/profile-store"
import { decodeConfig } from "@/lib/config-token"
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
} from "@/lib/tmdb"
import { buildStremioPosterUrl } from "@/lib/stremio-poster-url"
import { getOriginFromRequest } from "@/lib/poster-public-url"
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
      "Cache-Control": "public, max-age=43200, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

function hashFragment(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 8)
}

function normalizeMediaType(type: string): "movie" | "series" {
  return type === "movie" ? "movie" : "series"
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
const imdbIdCache = new Map<string, string | null>()
const IMDB_ID_CACHE_MAX = 2000
function imdbIdCacheSet(key: string, value: string | null) {
  if (imdbIdCache.size >= IMDB_ID_CACHE_MAX) {
    const oldest = imdbIdCache.keys().next().value
    if (oldest !== undefined) imdbIdCache.delete(oldest)
  }
  imdbIdCache.set(key, value)
}

async function resolveImdbId(mediaType: "movie" | "tv", tmdbId: number, apiKey?: string): Promise<string | null> {
  const cacheKey = `${mediaType}:${tmdbId}`
  const cached = imdbIdCache.get(cacheKey)
  if (cached !== undefined) return cached
  try {
    const result = await getExternalIds(mediaType, tmdbId, apiKey).then((r) => r.imdb_id ?? null)
    imdbIdCacheSet(cacheKey, result)
    return result
  } catch {
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

  let apiKey = resolveRequestApiKey(req)
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

  // Risoluzione ID TMDB e IMDb
  let tmdbId: number | null = null
  let imdbId: string | null = null

  if (cleanId.startsWith("tt")) {
    imdbId = cleanId
    tmdbId = await tmdbFindByImdb(cleanId, tmdbMediaType, apiKey)
  } else if (cleanId.startsWith("tmdb:")) {
    const parsed = parseInt(cleanId.slice(5), 10)
    if (!Number.isNaN(parsed) && parsed > 0) tmdbId = parsed
  } else {
    const parsed = parseInt(cleanId, 10)
    if (!Number.isNaN(parsed) && parsed > 0) tmdbId = parsed
  }

  if (!tmdbId) {
    return metaResponse({ meta: null })
  }

  const cacheKey = `stremio:meta:${stType}:${cleanId}:pv${POSTER_URL_VERSION}${userParam ? `:u${userParam}` : ""}:ak${apiKey ? hashFragment(apiKey) : "none"}${configParam ? `:cfg${hashFragment(configParam)}` : ""}${mdblistKey ? `:mk${hashFragment(mdblistKey)}` : ""}`
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
        const preferredGroup = epGroups.find((g) => {
          const n = g.name.toLowerCase()
          return (n.includes("italian") || n.includes("italia") || n.includes("italy")) && g.group_count > 1
        }) || epGroups.find((g) => {
          const n = g.name.toLowerCase()
          return (n.includes("part") || n.includes("digital")) && g.group_count >= 4
        }) || epGroups.find((g) => {
          const n = g.name.toLowerCase()
          return n.includes("netflix") && !n.includes("seasons (edited")
        }) || epGroups.find((g) => {
          const n = g.name.toLowerCase()
          return (n.includes("digital") || n.includes("part") || n.includes("streaming") || (g.type === 1 && g.group_count > 1))
        })

        if (preferredGroup) {
          groupDetails = await getTVEpisodeGroup(preferredGroup.id, "it-IT", apiKey)
        }
      }

      if (groupDetails?.groups && groupDetails.groups.length > 0) {
        const sortedGroups = [...groupDetails.groups].sort((a, b) => a.order - b.order)
        for (let gIdx = 0; gIdx < sortedGroups.length; gIdx++) {
          const grp = sortedGroups[gIdx]
          const seasonNumber = grp.order || gIdx + 1
          for (let epIdx = 0; epIdx < (grp.episodes || []).length; epIdx++) {
            const ep = grp.episodes[epIdx]
            const episodeNumber = ep.episode_number || epIdx + 1
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
    }

    const meta: StremioMetaDetail = {
      id: primaryId,
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
