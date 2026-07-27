import { NextRequest } from "next/server"
import sharp from "sharp"
import { initSharp } from "@/lib/sharp-config"
import { getImages, getDetails, getExternalIds, getKeywords, resolveRequestApiKey, type TMDBImage, type TMDBCompany } from "@/lib/tmdb"
import { getJWRankings } from "@/lib/justwatch"
import { getById } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getServerDefaults } from "@/lib/server-defaults"
import { warmFonts } from "@/lib/svg-badge"
import { selectBestLogoFitPosterPath } from "@/lib/poster-auto-fit"
import { fetchAllWikidata, matchTMDBStudios } from "@/lib/awards"
import { createT } from "@/lib/i18n"
import type { EnrichedAnimeItem } from "@/lib/validation"
import { fetchMDBList, type MDBListEntry } from "@/lib/mdblist"
import { fetchAggregatedRating } from "@/lib/ratings"
import { isImdbTop250 } from "@/lib/imdb-top250"
import { getEffectiveRotationState, tryRotatePoster } from "@/lib/poster-rotation"
import { mappingVersionParam } from "@/lib/stremio-poster-url"
import { RENDER_VERSION } from "@/lib/render-version"
import {
  beginPosterRender,
  getPendingPoster,
  isImmutablePosterRequest,
  isPosterRefreshRequest,
  normalizePosterCacheParams,
  posterHeaders,
  posterNotModifiedHeaders,
  posterResponse,
  readCachedPoster,
  schedulePosterRefresh,
  writeCachedPoster,
} from "@/lib/poster-runtime-cache"
import {
  STD_H,
  STD_W,
  fetchImg,
  hashKey,
  imgSrc,
  isValidHex,
  topLuminance,
} from "@/lib/poster-render-helpers"
import { generatePosterBuffer, type GenerationInput } from "@/lib/poster-service"
import { computeTopBadge } from "@/lib/poster-badge"

import { resolveImdbToTmdb } from "@/lib/imdb-resolver"
import { decodeConfig } from "@/lib/config-token"
import { getProfile, getFullProfileData } from "@/lib/profile-store"
import { createLogger } from "@/lib/logger"

const log = createLogger("poster")

initSharp()

type RouteParams = { type: string; id: string }

function corsHeaders(): Record<string, string> {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }
}

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "poster")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  warmFonts()
  const { type, id } = await params
  const mediaType = (["series", "tv", "show", "tvshow"].includes(type?.toLowerCase() || "")) ? "tv" : "movie"
  let tmdbId = Number(id)
  if (isNaN(tmdbId) || tmdbId <= 0) {
    if (typeof id === "string" && id.startsWith("tt")) {
      const resolved = await resolveImdbToTmdb(id, mediaType)
      if (resolved) tmdbId = resolved
    }
  }

  if (isNaN(tmdbId) || tmdbId <= 0) {
    return new Response("Invalid ID", { status: 400, headers: corsHeaders() })
  }

  // 1. Get mapping + server defaults (no network)
  let mapping = await getById(mediaType, tmdbId)
  const sd = getServerDefaults()

  // Decode optional stateless config token (stile AIOMetadata / RPDB)
  const configToken = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  let configOverride = configToken ? decodeConfig(configToken) : null

  // UUID-based profile override (stile RPDB / ElfHosted / AIOMetadata)
  // Se presente, sovrascrive sia il config token che i poster personalizzati per quell'utente
  const profileId = req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("user") || null
  if (profileId) {
    const fullProfile = await getFullProfileData(profileId)
    if (fullProfile) {
      configOverride = fullProfile.config
      const userMapping = fullProfile.mappings?.[`${mediaType}:${tmdbId}`]
      if (userMapping) {
        mapping = userMapping
      }
    }
  }

  // Auto-rotate clean poster
  const rotationState = getEffectiveRotationState(mapping)
  const isRotating = rotationState.isRotating
  if (isRotating && mapping) {
    try {
      const rotated = await tryRotatePoster(mapping, rotationState)
      if (rotated) mapping = rotated
    } catch (error) {
      log.warn("Auto-rotate failed", { error: error instanceof Error ? error.message : String(error) })
    }
  }

  // 2. Cache key
  const sdHash = hashKey(JSON.stringify(sd))
  const cacheParams = normalizePosterCacheParams(req.nextUrl.searchParams)
  cacheParams.delete("config")
  cacheParams.delete("c")
  cacheParams.delete("u")
  cacheParams.delete("user")
  const cachedRank = mapping?.trendRank ?? null
  const rotateKey = isRotating ? `:ci${mapping?.cleanPosterIndex ?? "x"}` : ""
  const mapVersion = mapping?.updatedAt ? `:mu${mapping.updatedAt}` : ""
  const configHash = configOverride ? hashKey(JSON.stringify(configOverride)) : ""
  const userKey = profileId ? `:u${profileId}` : ""
  const cacheKey = `poster:v${RENDER_VERSION}:${type}:${id}:r${cachedRank ?? "x"}:sd${sdHash}:${cacheParams.toString()}${rotateKey}${mapVersion}${configHash ? `:cfg${configHash}` : ""}${userKey}`
  const currentMappingVersion = mappingVersionParam(mapping)
  const immutablePoster = isImmutablePosterRequest(req.nextUrl.searchParams, {
    hasMapping: !!mapping,
    isRotating,
    mappingVersionMatches: !!currentMappingVersion && req.nextUrl.searchParams.get("mv") === currentMappingVersion,
  })
  const refreshRequest = isPosterRefreshRequest(req.nextUrl.searchParams)
  const isPreview = req.nextUrl.searchParams.has("preview")

  // 3. Memory cache check
  const cachedPoster = readCachedPoster(cacheKey)
  if (cachedPoster.payload) {
    if (!isPreview && req.headers.get("If-None-Match") === cachedPoster.payload.etag) {
      return new Response(null, { status: 304, headers: posterNotModifiedHeaders(cachedPoster.payload.etag, immutablePoster) })
    }
    if (!cachedPoster.stale) {
      return posterResponse(cachedPoster.payload, immutablePoster, isPreview)
    }
    if (!refreshRequest) {
      schedulePosterRefresh(req)
      return posterResponse(cachedPoster.payload, immutablePoster, isPreview)
    }
  }

  const pendingPoster = getPendingPoster(cacheKey)
  if (pendingPoster) {
    const payload = await pendingPoster
    if (payload) return posterResponse(payload, immutablePoster)
  }
  const completePosterRender = beginPosterRender(cacheKey)

  // 4. Resolve poster/logo/backdrop paths
  let posterPath: string | null = null
  let posterPathBuffer: Buffer | null = null
  let logoPath: string | null = null
  let backdropPath: string | null = null
  let backdropScale = 100
  let backdropOffsetX = 0
  let backdropOffsetY = 0
  let etag: string
  let genreName: string | null = null
  let voteAverage: number | null = null
  let showBadges = true
  let rankingBadges = true
  let releaseDate: string | null = null
  let firstAirDate: string | null = null
  let tvType: string | null = null
  let tvStatus: string | null = null
  let tmdbStudios: string[] = []
  let tmdbNetworks: string[] = []
  let productionCompanies: string[] = []
  let imdbId: string | null = null

  const queryPoster = req.nextUrl.searchParams.get("poster")
  const queryLogo = req.nextUrl.searchParams.get("logo")
  const queryBackdrop = req.nextUrl.searchParams.get("backdrop")
  const queryGenre = req.nextUrl.searchParams.get("genreName")
  const queryVote = req.nextUrl.searchParams.get("voteAverage")
  const t = createT(req.nextUrl.searchParams.get("lang") || mapping?.language || "it")

  if (queryPoster) {
    posterPath = queryPoster
    logoPath = queryLogo || null
    backdropPath = queryBackdrop || null
    if (queryBackdrop) {
      backdropScale = Number(req.nextUrl.searchParams.get("bscale") || "100")
      if (!Number.isFinite(backdropScale) || backdropScale <= 0) backdropScale = 100
      backdropOffsetX = Number(req.nextUrl.searchParams.get("box") || "0")
      backdropOffsetY = Number(req.nextUrl.searchParams.get("boy") || "0")
    }
    if (queryGenre) genreName = queryGenre
    if (queryVote) voteAverage = Number(queryVote)
    imdbId = req.nextUrl.searchParams.get("imdbId") || null
    showBadges = true
    etag = `"${Date.now()}"`
  } else if (mapping) {
    posterPath = mapping.posterPath
    logoPath = queryLogo || mapping.logoPath
    backdropPath = queryBackdrop || mapping?.backdropPath || null
    backdropScale = mapping?.backdropScale ?? 100
    backdropOffsetX = mapping?.backdropOffsetX ?? 0
    backdropOffsetY = mapping?.backdropOffsetY ?? 0
    genreName = mapping.genreName ?? null
    voteAverage = mapping.voteAverage ?? null
    showBadges = mapping.showBadges ?? true
    rankingBadges = mapping.rankingBadges ?? true
    etag = `"v${RENDER_VERSION}:${mapping.updatedAt}:sd${sdHash}"`
    if (req.headers.get("If-None-Match") === etag) {
      completePosterRender(null)
      return new Response(null, { status: 304, headers: posterNotModifiedHeaders(etag, immutablePoster) })
    }
  } else {
    const preferredLanguage = req.nextUrl.searchParams.get("lang") || "it"
    const apiKey = resolveRequestApiKey(req)
    try {
      const details = await getDetails(mediaType, tmdbId, preferredLanguage, apiKey)
      const origLang = details.original_language
      const imageLangs = origLang && origLang !== preferredLanguage && origLang !== "en"
        ? `${preferredLanguage},en,null,${origLang}`
        : `${preferredLanguage},en,null`
      const [images, extIds] = await Promise.all([
        getImages(mediaType, tmdbId, imageLangs, apiKey),
        getExternalIds(mediaType, tmdbId, apiKey).catch(() => ({ imdb_id: null })),
      ])
      imdbId = extIds.imdb_id
      const aggregated = imdbId ? await fetchAggregatedRating(imdbId).catch(() => null) : null
      genreName = details.genres[0]?.name || null
      voteAverage = aggregated?.average ?? details.vote_average ?? 0
      releaseDate = details.release_date || null
      firstAirDate = details.first_air_date || null
      tmdbNetworks = (details.networks || []).map((n: TMDBCompany) => n.name)
      productionCompanies = (details.production_companies || []).map((c: TMDBCompany) => c.name)
      tmdbStudios = matchTMDBStudios([...tmdbNetworks, ...productionCompanies])
      tvType = details.type || null
      tvStatus = details.status || null
      const clean = images.posters.find((p: TMDBImage) => p.iso_639_1 === null)
      if (clean) {
        if (queryLogo) {
          const exact = images.logos.find((l: TMDBImage) => l.file_path === queryLogo)
          if (exact) logoPath = exact.file_path
        }
        if (!logoPath) {
          const langLogo = images.logos.find((l: TMDBImage) => l.iso_639_1 === preferredLanguage)
          const itLogo = preferredLanguage !== "it" ? images.logos.find((l: TMDBImage) => l.iso_639_1 === "it") : undefined
          const enLogo = preferredLanguage !== "en" ? images.logos.find((l: TMDBImage) => l.iso_639_1 === "en") : undefined
          const origLogo = details.original_language && details.original_language !== preferredLanguage ? images.logos.find((l: TMDBImage) => l.iso_639_1 === details.original_language) : undefined
          const anyLogo = images.logos[0]
          const chosenLogo = langLogo || itLogo || enLogo || origLogo || anyLogo
          if (chosenLogo && !langLogo && !itLogo && !enLogo && origLogo) {
            log.info("Logo fallback to original_language", { lang: details.original_language, mediaType, tmdbId })
          } else if (chosenLogo && !langLogo && !itLogo && !enLogo && !origLogo) {
            log.info("Logo fallback to any (first available)", { mediaType, tmdbId })
          } else if (!chosenLogo) {
            log.info("No logo available", { mediaType, tmdbId })
          }
          if (chosenLogo) logoPath = chosenLogo.file_path
        }
        const qLogoFit = req.nextUrl.searchParams.get("logoFit")
        const logoFitEnabled = qLogoFit !== null ? qLogoFit !== "0" : (configOverride !== null ? configOverride.logoFitEnabled : sd.defaultLogoFitEnabled === true)
        if (logoPath && logoFitEnabled) {
          try {
            const fitStart = Date.now()
            const bestFit = await selectBestLogoFitPosterPath({
              posters: images.posters, logoPath,
              fetchImage: async (path: string) => {
                const res = await fetch(imgSrc(path), { signal: AbortSignal.timeout(5000) })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return Buffer.from(await res.arrayBuffer())
              },
              fetchCandidateImage: async (path: string) => {
                const url = path.startsWith("http") ? path : `https://image.tmdb.org/t/p/w342${path}`
                const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return Buffer.from(await res.arrayBuffer())
              },
              hasBadges: true,
            })
            const fitMs = Date.now() - fitStart
            if (bestFit && bestFit.posterPath && bestFit.posterPath !== clean.file_path) {
              log.info("Best-fit: improved poster selected", { mediaType, tmdbId, bestFit: bestFit.posterPath, original: clean.file_path, ms: fitMs })
            } else {
              log.info("Best-fit: first clean already optimal", { mediaType, tmdbId, ms: fitMs })
            }
            posterPath = bestFit?.posterPath ?? clean.file_path
            if (bestFit?.posterBuffer) posterPathBuffer = bestFit.posterBuffer
          } catch (e) {
            log.error("Best-fit: fallback to first clean", { mediaType, tmdbId, error: e instanceof Error ? e.message : String(e) })
            posterPath = clean.file_path
          }
        } else {
          if (logoPath) log.info("Best-fit: disabled by config", { mediaType, tmdbId })
          else log.info("Best-fit: no logo, skip", { mediaType, tmdbId })
          posterPath = clean.file_path
        }
      } else {
        const langPoster = images.posters.find((p: TMDBImage) => p.iso_639_1 === preferredLanguage)
        const origPoster = details.original_language ? images.posters.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
        const chosen = langPoster || origPoster || images.posters[0]
        if (chosen) posterPath = chosen.file_path
      }
    } catch (e) { log.error("Auto image fetch failed", { error: e instanceof Error ? e.message : String(e) }) }
    etag = `"${Date.now()}"`
  }

  if (!posterPath) {
    completePosterRender(null)
    return new Response("Poster not found", { status: 404, headers: corsHeaders() })
  }

  try {
    const qRankingEarly = req.nextUrl.searchParams.get("ranking")
    const hasQueryEarly = !!queryPoster || !!mapping
    const rankingEnabledEarly = hasQueryEarly ? (qRankingEarly !== null ? qRankingEarly !== "0" : rankingBadges) : true

    // 5. Fetch all data in parallel: images + rankings + wikidata + keywords + imdbTop250
    //    All dependencies are available before this point — no Block B depends on Block A
    const emptyWikidata = { awards: [], nominations: [], studios: [], director: null }
    const WIKIDATA_TIMEOUT = Number(process.env.WIKIDATA_TIMEOUT) || 4000
    const [
      [originalBuf, logoFetch, backdropFetch, rankingResult, animeRankResult],
      [wikidataResult, tmdbKeywords, imdbTop250],
    ] = await Promise.all([
      // Block A: images + ranking data
      Promise.all([
        posterPathBuffer
          ? Promise.resolve(posterPathBuffer)
          : fetchImg(imgSrc(posterPath)).catch(() => null),
        logoPath ? fetchImg(imgSrc(logoPath)).catch(() => null) : Promise.resolve(null),
        backdropPath ? fetchImg(imgSrc(backdropPath)).catch(() => null) : Promise.resolve(null),
        rankingEnabledEarly
          ? getJWRankings(mediaType === "movie" ? "MOVIE" : "SHOW", "IT")
            .then((r) => r.find((x) => x.tmdbId === tmdbId)?.rank ?? null)
            .catch(() => null)
          : Promise.resolve(null),
        (rankingEnabledEarly && mediaType === "tv")
          ? (() => {
              try {
                const cached = cacheGet("mdblist:anime:top10")
                if (cached && Array.isArray(cached)) {
                  const idx = cached.findIndex((e) => Number((e as MDBListEntry).tmdb) === tmdbId || (e as EnrichedAnimeItem).id === tmdbId)
                  return Promise.resolve(idx >= 0 ? idx + 1 : null)
                }
                return fetchMDBList("mdblistAnime").then((entries) => {
                  if (!Array.isArray(entries)) return null
                  cacheSet("mdblist:anime:top10", entries, ["mdblist"])
                  const idx = entries.findIndex((e) => Number(e.tmdb) === tmdbId)
                  return idx >= 0 ? idx + 1 : null
                }).catch(() => null)
              } catch { return Promise.resolve(null) }
            })()
          : Promise.resolve(null),
      ]),
      // Block B: badge data (independent of Block A — runs concurrently)
      Promise.all([
        Promise.race([
          rankingEnabledEarly
            ? fetchAllWikidata(tmdbId, mediaType, t).catch(() => emptyWikidata)
            : Promise.resolve(emptyWikidata),
          new Promise<typeof emptyWikidata>((r) => setTimeout(() => r(emptyWikidata), WIKIDATA_TIMEOUT)),
        ]),
        rankingEnabledEarly
          ? getKeywords(mediaType, tmdbId, resolveRequestApiKey(req)).catch(() => [])
          : Promise.resolve([]),
        (async () => {
          if (!rankingEnabledEarly) return false
          if (!imdbId) {
            const extIds = await getExternalIds(mediaType, tmdbId, resolveRequestApiKey(req)).catch(() => null)
            if (extIds?.imdb_id) imdbId = extIds.imdb_id
          }
          if (!imdbId) return false
          return isImdbTop250(imdbId)
        })(),
      ]),
    ])

    if (!originalBuf) {
      completePosterRender(null)
      return new Response("Poster image not available", { status: 404, headers: corsHeaders() })
    }

    const rankingRank = rankingResult ?? mapping?.badgeRank ?? mapping?.trendRank ?? null
    const qRank = req.nextUrl.searchParams.get("rank")
    const qLabel = req.nextUrl.searchParams.get("label")
    const finalRank = qRank ? Number(qRank) || rankingRank : rankingRank

    // 6. Resize poster + compute luminance
    const posterBuf = await sharp(originalBuf).resize(STD_W, STD_H, { fit: 'cover', position: 'centre' }).toBuffer()
    const qTopLight = req.nextUrl.searchParams.get("tl")

    // Luminance + tv details (parallel)
    const [topLum] = await Promise.all([
      (async (): Promise<number | null> => {
        if (qTopLight !== null) return null
        return await topLuminance(posterBuf)
      })(),
      (async () => {
        if (mapping?.tvType) tvType = mapping.tvType
        if (mapping?.tvStatus) tvStatus = mapping.tvStatus
        if (mapping?.releaseDate) releaseDate = mapping.releaseDate
        if (mapping?.firstAirDate) firstAirDate = mapping.firstAirDate
        if (tmdbNetworks.length === 0 && productionCompanies.length === 0) {
          try {
            const apiKey = resolveRequestApiKey(req)
            const preferredLang = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
            const details = await getDetails(mediaType, tmdbId, preferredLang, apiKey)
            if (!releaseDate) releaseDate = details.release_date || null
            if (!firstAirDate) firstAirDate = details.first_air_date || null
            if (!tvType) tvType = details.type || null
            if (!tvStatus) tvStatus = details.status || null
            if (details.networks) tmdbNetworks = details.networks.map((n: TMDBCompany) => n.name)
            if (details.production_companies) productionCompanies = details.production_companies.map((c: TMDBCompany) => c.name)
            if (tmdbNetworks.length || productionCompanies.length) tmdbStudios = matchTMDBStudios([...tmdbNetworks, ...productionCompanies])
          } catch (e) { log.error("Details fetch failed", { error: e instanceof Error ? e.message : String(e) }) }
        }
      })(),
    ])

    const topLight = qTopLight !== null ? qTopLight === "1" : (topLum ?? 0.5) > 0.60

    // 7. Parse blur / badge / logo config from query
    const qBadges = req.nextUrl.searchParams.get("badges")
    const qRanking = req.nextUrl.searchParams.get("ranking")
    const rawRs = req.nextUrl.searchParams.get("rs")
    let rankingBadgeStyle = (mapping?.rankingBadgeStyle && mapping.rankingBadgeStyle !== "default" ? mapping.rankingBadgeStyle : undefined)
      || (rawRs && rawRs !== "default" ? rawRs : undefined)
      || (configOverride?.rankingBadgeStyle && configOverride.rankingBadgeStyle !== "default" ? configOverride.rankingBadgeStyle : undefined)
      || sd.rankingBadgeStyle
      || "default"
    const qRankParam = req.nextUrl.searchParams.get("rank")
    const hasRank = !!(animeRankResult || rankingResult || mapping?.badgeRank || mapping?.trendRank || qRankParam || finalRank)
    if (hasRank && (rankingBadgeStyle === "default" || rankingBadgeStyle === "netflix")) {
      rankingBadgeStyle = "netflix"
    } else if (rankingBadgeStyle === "netflix" && !hasRank) {
      rankingBadgeStyle = "default"
    }

    const qBe = req.nextUrl.searchParams.get("be")
    const blurEnabled = qBe !== null ? qBe !== "0" : (configOverride !== null ? configOverride.blurEnabled : true)
    const qGradHeight = req.nextUrl.searchParams.get("gradHeight")
    const blurHeight = qGradHeight ? Math.max(Number(qGradHeight), 5) : (configOverride !== null ? Math.max(configOverride.gradientHeight, 5) : 30)
    const qBlur = req.nextUrl.searchParams.get("blur")
    const blurIntensity = qBlur ? Math.max(Number(qBlur), 1) : (configOverride !== null ? Math.max(configOverride.blurIntensity, 1) : 5)
    const qBf = req.nextUrl.searchParams.get("bf")
    const blurFade = qBf ? Math.max(Number(qBf), 0) : (configOverride !== null ? Math.max(configOverride.blurFade, 0) : 60)
    const qBd = req.nextUrl.searchParams.get("bd")
    const blurDarkness = qBd ? Math.max(Number(qBd), 0) : (configOverride !== null ? Math.max(configOverride.blurDarkness, 0) : 40)

    const hasQuery = !!queryPoster || !!mapping
    const badgesEnabled = hasQuery ? (qBadges !== null ? qBadges !== "0" : (configOverride !== null ? configOverride.globalBadges : showBadges)) : true
    const rankingEnabled = hasQuery ? (qRanking !== null ? qRanking !== "0" : (configOverride !== null ? configOverride.rankingBadges : rankingBadges)) : true
    const badgeStyle = req.nextUrl.searchParams.get("bs")
      || (mapping?.badgeStyle && mapping.badgeStyle !== "shadow" ? mapping.badgeStyle : undefined)
      || configOverride?.badgeStyle
      || sd.badgeStyle || "shadow"

    const qScale = req.nextUrl.searchParams.get("scale")
    const qOx = req.nextUrl.searchParams.get("ox")
    const qOy = req.nextUrl.searchParams.get("oy")
    const logoScale = qScale ? Number(qScale) || null : mapping?.logoScale ?? null
    const logoOffsetX = qOx ? Number(qOx) || null : mapping?.logoOffsetX ?? null
    const logoOffsetY = qOy ? Number(qOy) || null : mapping?.logoOffsetY ?? null

    const queryExtra = req.nextUrl.searchParams.get("extra") || configOverride?.customBadge || null
    const qNetLogo = req.nextUrl.searchParams.get("netLogo") ?? (configOverride !== null ? (configOverride.networkLogo ? null : "0") : null)

    const locale = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
    const targetCenter = Math.round(30 * STD_H / 570)

    // 8. Pre-resolve accent color override
    const qAc = req.nextUrl.searchParams.get("ac")
    const accentOverride = (qAc && isValidHex(qAc))
      ? { genreColor: qAc, rankColor: qAc }
      : mapping?.accentColor
        ? { genreColor: mapping.accentColor, rankColor: mapping.accentColor }
        : null

    // 9. Debug mode — return JSON with all computed data instead of rendering
    const isDebug = req.nextUrl.searchParams.get("debug") === "1"
    if (isDebug) {
      const badgeInput = {
        mediaType: mediaType as "movie" | "tv",
        releaseDate: releaseDate ?? null,
        firstAirDate: firstAirDate ?? null,
        voteAverage: voteAverage ?? 0,
        trendRank: finalRank,
        animeRank: animeRankResult,
        awards: wikidataResult.awards,
        nominations: wikidataResult.nominations,
        studios: tmdbStudios.length ? [...tmdbStudios] : [...productionCompanies, ...tmdbNetworks],
        director: wikidataResult.director,
        tvType: tvType ?? null,
        tvStatus,
        keywords: [...tmdbKeywords],
        imdbTop250: !!imdbTop250,
      }
      const badgeComputed = computeTopBadge(badgeInput, t, locale)
      log.info("Debug mode", { mediaType, tmdbId, imdbId, imdbTop250: !!imdbTop250, badge: badgeComputed.badge?.label ?? "null", vote: voteAverage, genre: genreName })
      completePosterRender(null)
      return Response.json({
        meta: {
          tmdbId,
          mediaType,
          locale,
          imdbId,
          imdbTop250: !!imdbTop250,
          renderVersion: RENDER_VERSION,
        },
        images: {
          poster: posterPath,
          logo: logoPath,
          backdrop: backdropPath,
        },
        genre: { name: genreName, year: releaseDate?.slice(0, 4) },
        vote: { average: voteAverage },
        rankings: {
          justwatch: rankingResult,
          anime: animeRankResult,
          finalRank,
          qRank: req.nextUrl.searchParams.get("rank") || null,
          qLabel,
        },
        wikidata: {
          awards: wikidataResult.awards,
          nominations: wikidataResult.nominations,
          studios: wikidataResult.studios,
          director: wikidataResult.director,
        },
        keywords: [...tmdbKeywords],
        badge: {
          computed: {
            badge: badgeComputed.badge,
            upcomingRelease: badgeComputed.upcomingRelease,
            awardBadge: badgeComputed.awardBadge,
            studioBadge: badgeComputed.studioBadge,
            subGenreBadge: badgeComputed.subGenreBadge,
            extraFallback: badgeComputed.extraFallback,
          },
          settings: {
            badgesEnabled,
            rankingEnabled,
            badgeStyle,
            rankingBadgeStyle,
            customBadge: queryExtra,
          },
        },
        appearance: {
          topLight,
          blurEnabled,
          blurHeight,
          blurIntensity,
          blurFade,
          blurDarkness,
          gradientHeight: blurHeight,
          accentColor: accentOverride?.genreColor || null,
        },
        logos: {
          scale: logoScale,
          offsetX: logoOffsetX,
          offsetY: logoOffsetY,
          networkLogo: qNetLogo !== "0",
        },
      })
    }

    // 10. Generate poster buffer
    const genInput: GenerationInput = {
      posterBuf, logoFetch, backdropFetch,
      backdropScale, backdropOffsetX, backdropOffsetY,
      blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness,
      badgesEnabled, rankingEnabled, genreName, voteAverage, badgeStyle,
      rankingBadgeStyle, topLight, targetCenter,
      logoScale, logoOffsetX, logoOffsetY,
      mediaType: mediaType as "movie" | "tv",
      finalRank, animeRankResult, rankingResult,
      mapping, tmdbNetworks, productionCompanies, tmdbStudios,
      tvType, tvStatus, releaseDate, firstAirDate,
      wikidataResult, tmdbKeywords, locale, t,
      qLabel, queryExtra, qNetLogo, sd,
      accentOverride, imdbTop250,
    }
    const composited = await generatePosterBuffer(genInput)

    // 10. Cache + response
    const payload = { buffer: composited, etag }
    const mappingTag = mapping ? `poster:${mediaType}:${tmdbId}` : undefined
    writeCachedPoster(cacheKey, payload, mappingTag)
    completePosterRender(payload)
    return new Response(new Uint8Array(composited), { headers: posterHeaders(etag, immutablePoster, isPreview) })
  } catch (e) {
    completePosterRender(null)
    log.error("Poster generation failed", { error: e instanceof Error ? e.message : String(e) })
    return new Response("Poster generation failed", { status: 500, headers: corsHeaders() })
  }
}
