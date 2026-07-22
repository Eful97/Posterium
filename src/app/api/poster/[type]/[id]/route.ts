import { NextRequest } from "next/server"
import sharp from "sharp"
import "@/lib/sharp-config"
import { getImages, getDetails, getExternalIds, getKeywords, type TMDBImage, type TMDBCompany } from "@/lib/tmdb"
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

import { resolveImdbToTmdb } from "@/lib/imdb-resolver"

type RouteParams = { type: string; id: string }

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
    return new Response("Invalid ID", { status: 400 })
  }

  // 1. Get mapping + server defaults (no network)
  let mapping = await getById(mediaType, tmdbId)
  const sd = getServerDefaults()

  // Auto-rotate clean poster
  const rotationState = getEffectiveRotationState(mapping)
  const isRotating = rotationState.isRotating
  if (isRotating && mapping) {
    try {
      const rotated = await tryRotatePoster(mapping, rotationState)
      if (rotated) mapping = rotated
    } catch (error) {
      console.warn(`[poster] Auto-rotate failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 2. Cache key
  const sdHash = hashKey(JSON.stringify(sd))
  const cacheParams = normalizePosterCacheParams(req.nextUrl.searchParams)
  const cachedRank = mapping?.trendRank ?? null
  const rotateKey = isRotating ? `:ci${mapping?.cleanPosterIndex ?? "x"}` : ""
  const mapVersion = mapping?.updatedAt ? `:mu${mapping.updatedAt}` : ""
  const cacheKey = `poster:v${RENDER_VERSION}:${type}:${id}:r${cachedRank ?? "x"}:sd${sdHash}:${cacheParams.toString()}${rotateKey}${mapVersion}`
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
    const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
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
            console.warn(`[poster] Logo fallback to original_language "${details.original_language}" for ${mediaType}/${tmdbId}`)
          } else if (chosenLogo && !langLogo && !itLogo && !enLogo && !origLogo) {
            console.warn(`[poster] Logo fallback to any (first available) for ${mediaType}/${tmdbId}`)
          } else if (!chosenLogo) {
            console.warn(`[poster] No logo available for ${mediaType}/${tmdbId}`)
          }
          if (chosenLogo) logoPath = chosenLogo.file_path
        }
        const qLogoFit = req.nextUrl.searchParams.get("logoFit")
        const logoFitEnabled = qLogoFit !== null ? qLogoFit !== "0" : sd.defaultLogoFitEnabled !== false
        if (logoPath && logoFitEnabled) {
          try {
            const fitStart = Date.now()
            const bestFit = await selectBestLogoFitPosterPath({
              posters: images.posters, logoPath,
              fetchImage: async (path: string) => {
                const res = await fetch(imgSrc(path))
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return Buffer.from(await res.arrayBuffer())
              },
              hasBadges: true, renderVersion: RENDER_VERSION,
            })
            const fitMs = Date.now() - fitStart
            if (bestFit && bestFit !== clean.file_path) {
              console.log(`[best-fit] ${mediaType}/${tmdbId}: migliorato ${bestFit} (primo ${clean.file_path}) ${fitMs}ms`)
            } else {
              console.log(`[best-fit] ${mediaType}/${tmdbId}: primo clean già ottimale ${fitMs}ms`)
            }
            posterPath = bestFit ?? clean.file_path
          } catch (e) {
            console.error(`[best-fit] ${mediaType}/${tmdbId}: fallback al primo clean`, e)
            posterPath = clean.file_path
          }
        } else {
          if (logoPath) console.log(`[best-fit] ${mediaType}/${tmdbId}: disabilitato da config`)
          else console.log(`[best-fit] ${mediaType}/${tmdbId}: nessun logo, skip`)
          posterPath = clean.file_path
        }
      } else {
        const langPoster = images.posters.find((p: TMDBImage) => p.iso_639_1 === preferredLanguage)
        const origPoster = details.original_language ? images.posters.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
        const chosen = langPoster || origPoster || images.posters[0]
        if (chosen) posterPath = chosen.file_path
      }
    } catch (e) { console.error("[poster] Auto image fetch failed:", e) }
    etag = `"${Date.now()}"`
  }

  if (!posterPath) {
    completePosterRender(null)
    return new Response("Poster not found", { status: 404 })
  }

  try {
    const qRankingEarly = req.nextUrl.searchParams.get("ranking")
    const hasQueryEarly = !!queryPoster || !!mapping
    const rankingEnabledEarly = hasQueryEarly ? (qRankingEarly !== null ? qRankingEarly !== "0" : rankingBadges) : true

    // 5. Fetch images + rankings + wikidata (parallel I/O)
    const [originalBuf, logoFetch, backdropFetch, rankingResult, animeRankResult] = await Promise.all([
      fetchImg(imgSrc(posterPath)).catch(() => null),
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
    ])

    if (!originalBuf) {
      completePosterRender(null)
      return new Response("Poster image not available", { status: 404 })
    }

    const emptyWikidata = { awards: [], nominations: [], studios: [], director: null }
    const WIKIDATA_TIMEOUT = Number(process.env.WIKIDATA_TIMEOUT) || 4000
    const [wikidataResult, tmdbKeywords, imdbTop250] = await Promise.all([
      Promise.race([
        rankingEnabledEarly
          ? fetchAllWikidata(tmdbId, mediaType, t).catch(() => emptyWikidata)
          : Promise.resolve(emptyWikidata),
        new Promise<typeof emptyWikidata>((r) => setTimeout(() => r(emptyWikidata), WIKIDATA_TIMEOUT)),
      ]),
      rankingEnabledEarly
        ? getKeywords(mediaType, tmdbId, req.nextUrl.searchParams.get("api_key") || undefined).catch(() => [])
        : Promise.resolve([]),
      (async () => {
        if (!rankingEnabledEarly) return false
        const effectiveId = imdbId || (await getExternalIds(mediaType, tmdbId, req.nextUrl.searchParams.get("api_key") || undefined).catch(() => null))?.imdb_id || null
        if (!effectiveId) return false
        if (!imdbId) imdbId = effectiveId
        return isImdbTop250(effectiveId)
      })(),
    ])

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
            const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
            const preferredLang = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
            const details = await getDetails(mediaType, tmdbId, preferredLang, apiKey)
            if (!releaseDate) releaseDate = details.release_date || null
            if (!firstAirDate) firstAirDate = details.first_air_date || null
            if (!tvType) tvType = details.type || null
            if (!tvStatus) tvStatus = details.status || null
            if (details.networks) tmdbNetworks = details.networks.map((n: TMDBCompany) => n.name)
            if (details.production_companies) productionCompanies = details.production_companies.map((c: TMDBCompany) => c.name)
            if (tmdbNetworks.length || productionCompanies.length) tmdbStudios = matchTMDBStudios([...tmdbNetworks, ...productionCompanies])
          } catch (e) { console.error("[poster] Details fetch failed:", e) }
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
      || sd.rankingBadgeStyle
      || "default"
    const qRankParam = req.nextUrl.searchParams.get("rank")
    const hasRank = !!(animeRankResult || rankingResult || mapping?.badgeRank || mapping?.trendRank || qRankParam || finalRank)
    if (hasRank && (rankingBadgeStyle === "default" || rankingBadgeStyle === "netflix")) {
      rankingBadgeStyle = "netflix"
    } else if (rankingBadgeStyle === "netflix" && !hasRank) {
      rankingBadgeStyle = "default"
    }

    const blurEnabled = req.nextUrl.searchParams.get("be") !== "0"
    const blurHeight = req.nextUrl.searchParams.get("gradHeight") ? Math.max(Number(req.nextUrl.searchParams.get("gradHeight")), 5) : 30
    const blurIntensity = req.nextUrl.searchParams.get("blur") ? Math.max(Number(req.nextUrl.searchParams.get("blur")), 1) : 5
    const blurFade = req.nextUrl.searchParams.get("bf") ? Math.max(Number(req.nextUrl.searchParams.get("bf")), 0) : 60
    const blurDarkness = req.nextUrl.searchParams.get("bd") ? Math.max(Number(req.nextUrl.searchParams.get("bd")), 0) : 40

    const hasQuery = !!queryPoster || !!mapping
    const badgesEnabled = hasQuery ? (qBadges !== null ? qBadges !== "0" : showBadges) : true
    const rankingEnabled = hasQuery ? (qRanking !== null ? qRanking !== "0" : rankingBadges) : true
    const badgeStyle = req.nextUrl.searchParams.get("bs")
      || (mapping?.badgeStyle && mapping.badgeStyle !== "shadow" ? mapping.badgeStyle : undefined)
      || sd.badgeStyle || "shadow"

    const qScale = req.nextUrl.searchParams.get("scale")
    const qOx = req.nextUrl.searchParams.get("ox")
    const qOy = req.nextUrl.searchParams.get("oy")
    const logoScale = qScale ? Number(qScale) || null : mapping?.logoScale ?? null
    const logoOffsetX = qOx ? Number(qOx) || null : mapping?.logoOffsetX ?? null
    const logoOffsetY = qOy ? Number(qOy) || null : mapping?.logoOffsetY ?? null

    const queryExtra = req.nextUrl.searchParams.get("extra") || null
    const qNetLogo = req.nextUrl.searchParams.get("netLogo")

    const locale = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
    const targetCenter = Math.round(30 * STD_H / 570)

    // 8. Pre-resolve accent color override
    const qAc = req.nextUrl.searchParams.get("ac")
    const accentOverride = (qAc && isValidHex(qAc))
      ? { genreColor: qAc, rankColor: qAc }
      : mapping?.accentColor
        ? { genreColor: mapping.accentColor, rankColor: mapping.accentColor }
        : null

    // 9. Generate poster buffer
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
    writeCachedPoster(cacheKey, payload)
    completePosterRender(payload)
    return new Response(new Uint8Array(composited), { headers: posterHeaders(etag, immutablePoster, isPreview) })
  } catch (e) {
    completePosterRender(null)
    console.error("Poster generation failed:", e)
    return new Response("Poster generation failed", { status: 500 })
  }
}
