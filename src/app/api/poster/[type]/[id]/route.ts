import { NextRequest } from "next/server"
import sharp from "sharp"
import "@/lib/sharp-config"
import { getImages, getDetails, getExternalIds, type TMDBImage, type TMDBCompany } from "@/lib/tmdb"
import { getJWRankings } from "@/lib/justwatch"
import { getById, upsert } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getServerDefaults } from "@/lib/server-defaults"
import { renderGenreBadge, renderRankingBadge, renderExtraBadge, warmFonts } from "@/lib/svg-badge"
import { selectBestLogoFitPosterPath } from "@/lib/poster-auto-fit"
import { fetchAllWikidata, getAwardBadgeLabel, getNominationBadgeLabel, matchTMDBStudios } from "@/lib/awards"
import { renderNetworkLogoBadge, renderFirstMatchingNetworkLogoBadge } from "@/lib/network-svgs"
import { computeTopBadge, type BadgeInput } from "@/lib/poster-badge"
import { getUpcomingReleaseLabel } from "@/lib/release-badge"
import { GENRE_FALLBACK } from "@/lib/badges"
import { createT } from "@/lib/i18n"
import type { EnrichedAnimeItem } from "@/lib/validation"
import { fetchMDBList, type MDBListEntry } from "@/lib/mdblist"
import { fetchAggregatedRating } from "@/lib/ratings"
import { computeLogoLayout } from "@/lib/logo-layout"
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
  type PosterComposite,
  OUTPUT_H,
  OUTPUT_W,
  STD_H,
  STD_W,
  extractBadgeColor,
  fetchImg,
  fitBadgeToCanvas,
  fitCompositeToCanvas,
  hashKey,
  imgSrc,
  isValidHex,
  renderCompositeLayers,
  topLuminance,
} from "@/lib/poster-render-helpers"

const BADGE_CACHE_TTL = 24 * 60 * 60 * 1000

function badgeCacheKey(type: string, ...parts: (string | number | boolean | undefined | null)[]): string {
  return `badge:${type}:${parts.map(p => typeof p === "number" ? Math.round(p * 10) / 10 : (p ?? "x")).join(":")}`
}

const badgeInflight = new Map<string, Promise<unknown>>()

type RouteParams = { type: string; id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "poster")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  warmFonts()
  const { type, id } = await params
  const mediaType = (["series", "tv", "show", "tvshow"].includes(type?.toLowerCase() || "")) ? "tv" : "movie"
  const tmdbId = Number(id)
  if (isNaN(tmdbId) || tmdbId <= 0) {
    return new Response("Invalid ID", { status: 400 })
  }

  // 1. Fast: get mapping + server defaults (no network)
  let mapping = await getById(mediaType, tmdbId)
  const sd = getServerDefaults()

  // Auto-rotate clean poster (sequential, not random) — atomic per-poster
  const rotationState = getEffectiveRotationState(mapping)
  const isRotating = rotationState.isRotating
  if (isRotating && mapping) {
    try {
      const rotated = await tryRotatePoster(mapping, rotationState)
      if (rotated) mapping = rotated
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[poster] Auto-rotate failed: ${message}`)
    }
  }

  // 2. Build cache key using mapping's stored rank (skip JW network call)
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

  // 3. Memory cache check (no network)
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

  // 5. Cache miss — resolve posterPath from mapping, query, or TMDB
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
      const imdbId = extIds.imdb_id
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
          let bestFit: string | null = null
          let fitMs = 0
          try {
            const fitStart = Date.now()
            bestFit = await selectBestLogoFitPosterPath({
              posters: images.posters,
              logoPath,
              fetchImage: async (path: string) => {
                const res = await fetch(imgSrc(path))
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return Buffer.from(await res.arrayBuffer())
              },
              hasBadges: true,
              renderVersion: RENDER_VERSION,
            })
            fitMs = Date.now() - fitStart
          } catch (e) {
            console.error(`[best-fit] ${mediaType}/${tmdbId}: eccezione imprevista, fallback al primo clean`, e)
          }
          if (bestFit && bestFit !== clean.file_path) {
            console.log(`[best-fit] ${mediaType}/${tmdbId}: migliorato poster ${bestFit} (primo era ${clean.file_path}) ${fitMs}ms`)
          } else if (!bestFit) {
            console.log(`[best-fit] ${mediaType}/${tmdbId}: fallback al primo clean dopo ${fitMs}ms`)
          } else {
            console.log(`[best-fit] ${mediaType}/${tmdbId}: primo clean già ottimale ${fitMs}ms`)
          }
          posterPath = bestFit ?? clean.file_path
        } else {
          if (logoPath) {
            console.log(`[best-fit] ${mediaType}/${tmdbId}: disabilitato da config`)
          } else {
            console.log(`[best-fit] ${mediaType}/${tmdbId}: nessun logo disponibile, best-fit saltato`)
          }
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

    // 6. Parallel: fetch all images + JW rank + MDBList (network I/O)
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
              return fetchMDBList("mdblistAnime")
                .then((entries) => {
                  if (!Array.isArray(entries)) return null
                  cacheSet("mdblist:anime:top10", entries, ["mdblist"])
                  const idx = entries.findIndex((e) => Number(e.tmdb) === tmdbId)
                  return idx >= 0 ? idx + 1 : null
                })
                .catch(() => null)
            } catch { return Promise.resolve(null) }
          })()
        : Promise.resolve(null),
    ])

    const emptyWikidata = { awards: [], nominations: [], studios: [], franchise: null, basedOn: null, director: null }
    const wikidataPromise = rankingEnabledEarly
      ? fetchAllWikidata(tmdbId, mediaType, t).catch(() => emptyWikidata)
      : Promise.resolve(emptyWikidata)
    const rankingRank = rankingResult ?? mapping?.badgeRank ?? mapping?.trendRank ?? null
    const qRank = req.nextUrl.searchParams.get("rank")
    const qLabel = req.nextUrl.searchParams.get("label")
    const finalRank = qRank ? Number(qRank) || rankingRank : rankingRank

    if (!originalBuf) {
      completePosterRender(null)
      return new Response("Poster image not available", { status: 404 })
    }

    // 7. Resize poster + backdrop (parallel)
    const [posterBuf, backdropBuf] = await Promise.all([
      sharp(originalBuf).resize(STD_W, STD_H, { fit: 'cover', position: 'centre' }).toBuffer(),
      backdropFetch
        ? (async () => {
            const bMeta = await sharp(backdropFetch).metadata()
            const bw = bMeta.width || 1920
            const bh = bMeta.height || 1080
            const bScale = backdropScale / 100
            let bResizedW = Math.round(STD_W * bScale)
            let bResizedH = Math.round(bh * (bResizedW / bw))
            if (bResizedW > STD_W) { bResizedH = Math.round(bResizedH * (STD_W / bResizedW)); bResizedW = STD_W }
            if (bResizedH > STD_H) { bResizedW = Math.round(bResizedW * (STD_H / bResizedH)); bResizedH = STD_H }
            const bX = Math.round((STD_W - bResizedW) / 2 + backdropOffsetX)
            const bY = Math.round((STD_H - bResizedH) / 2 + backdropOffsetY)
            const backdropResized = await sharp(backdropFetch).resize(bResizedW, bResizedH, { fit: 'fill' }).toBuffer()
            return { buf: backdropResized, top: bY, left: bX }
          })()
        : Promise.resolve(null),
    ])

    const composites: PosterComposite[] = []

    if (backdropBuf) {
      composites.push({ input: backdropBuf.buf, top: backdropBuf.top, left: backdropBuf.left })
    }

    // 7b. Luminance (only if needed) + missing details
    const qTopLight = req.nextUrl.searchParams.get("tl")
    const [topLumResult] = await Promise.all([
      (async () => {
        if (qTopLight !== null) return null
        return topLuminance(posterBuf)
      })(),
      (async () => {
        if (mapping?.tvType) tvType = mapping.tvType
        if (mapping?.tvStatus) tvStatus = mapping.tvStatus
        if (mapping?.releaseDate) releaseDate = mapping.releaseDate
        if (mapping?.firstAirDate) firstAirDate = mapping.firstAirDate
        if (tmdbNetworks.length === 0 && productionCompanies.length === 0) {
          try {
            const qApiKey = req.nextUrl.searchParams.get("api_key") || undefined
            const preferredLang = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
            const details = await getDetails(mediaType, tmdbId, preferredLang, qApiKey)
            if (!releaseDate) releaseDate = details.release_date || null
            if (!firstAirDate) firstAirDate = details.first_air_date || null
            if (!tvType) tvType = details.type || null
            if (!tvStatus) tvStatus = details.status || null
            if (details.networks) tmdbNetworks = details.networks.map((n: TMDBCompany) => n.name)
            if (details.production_companies) productionCompanies = details.production_companies.map((c: TMDBCompany) => c.name)
            if (tmdbNetworks.length || productionCompanies.length) {
              tmdbStudios = matchTMDBStudios([...tmdbNetworks, ...productionCompanies])
            }
          } catch (e) { console.error("[poster] Details fetch failed:", e) }
        }
      })(),
    ])

    const topLight = qTopLight !== null ? qTopLight === "1" : (topLumResult ?? 0.5) > 0.60

    // 8. Blur + badge color extraction + logo resize (parallel)
    const qBadges = req.nextUrl.searchParams.get("badges")
    const qRanking = req.nextUrl.searchParams.get("ranking")
    const rawRs = req.nextUrl.searchParams.get("rs")
    let qRankingBadgeStyle = (mapping?.rankingBadgeStyle && mapping.rankingBadgeStyle !== "default" ? mapping.rankingBadgeStyle : undefined)
      || (rawRs && rawRs !== "default" ? rawRs : undefined)
      || sd.rankingBadgeStyle
      || "default"
    const qRankParam = req.nextUrl.searchParams.get("rank")
    const hasRank = !!(animeRankResult || rankingResult || mapping?.badgeRank || mapping?.trendRank || qRankParam || finalRank)
    if (hasRank && (qRankingBadgeStyle === "default" || qRankingBadgeStyle === "netflix")) {
      qRankingBadgeStyle = "netflix"
    } else if (qRankingBadgeStyle === "netflix" && !hasRank) {
      qRankingBadgeStyle = "default"
    }
    const qGradHeight = req.nextUrl.searchParams.get("gradHeight")
    const qBlur = req.nextUrl.searchParams.get("blur")
    const qBlurFade = req.nextUrl.searchParams.get("bf")
    const qBlurDarkness = req.nextUrl.searchParams.get("bd")
    const qBlurEnabled = req.nextUrl.searchParams.get("be")
    const hasQuery = !!queryPoster || !!mapping
    const badgesEnabled = hasQuery ? (qBadges !== null ? qBadges !== "0" : showBadges) : true
    const rankingEnabled = hasQuery ? (qRanking !== null ? qRanking !== "0" : rankingBadges) : true
    const blurEnabled = qBlurEnabled !== "0"
    const blurHeight = qGradHeight ? Math.max(Number(qGradHeight), 5) : 30
    const blurIntensity = qBlur ? Math.max(Number(qBlur), 1) : 5
    const blurFade = qBlurFade ? Math.max(Number(qBlurFade), 0) : 60
    const blurDarkness = qBlurDarkness ? Math.max(Number(qBlurDarkness), 0) : 40
    const [blurredPosterBuf, badgeColors, logoResult] = await Promise.all([
      (async () => {
        if (!blurEnabled) return null
        const gh = Math.min(Math.max(Math.round(STD_H * blurHeight / 100), 100), STD_H)
        const gradTop = Math.max(STD_H - gh, 0)
        const fadedPct = Math.min(Math.max(blurFade, 0), 100)
        const darkAlpha = Math.min(blurDarkness / 100, 1)
        const { data: blurPixels, info } = await sharp(posterBuf)
          .extract({ left: 0, top: gradTop, width: STD_W, height: gh })
          .resize(STD_W, gh, { fit: "fill" })
          .blur(blurIntensity)
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
        const channels = info.channels
        const fadeStop = fadedPct / 100
        const { data: basePixels, info: baseInfo } = await sharp(posterBuf)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
        const baseChannels = baseInfo.channels
        for (let y = 0; y < gh; y += 1) {
          const yPct = gh <= 1 ? 1 : y / (gh - 1)
          const fade = fadeStop <= 0 ? 1 : Math.min(yPct / fadeStop, 1)
          const shade = 1 - darkAlpha * fade
          for (let x = 0; x < STD_W; x += 1) {
            const src = (y * STD_W + x) * channels
            const dst = ((gradTop + y) * STD_W + x) * baseChannels
            const blurR = (blurPixels[src] ?? 0) * shade
            const blurG = (blurPixels[src + 1] ?? 0) * shade
            const blurB = (blurPixels[src + 2] ?? 0) * shade
            basePixels[dst] = Math.round((basePixels[dst] ?? 0) * (1 - fade) + blurR * fade)
            basePixels[dst + 1] = Math.round((basePixels[dst + 1] ?? 0) * (1 - fade) + blurG * fade)
            basePixels[dst + 2] = Math.round((basePixels[dst + 2] ?? 0) * (1 - fade) + blurB * fade)
            basePixels[dst + 3] = 255
          }
        }
        return sharp(basePixels, { raw: { width: STD_W, height: STD_H, channels: baseChannels } })
          .png({ compressionLevel: 1 })
          .toBuffer()
      })(),
      // Badge color extraction (separate per genre/ranking)
      (badgesEnabled && genreName && voteAverage && voteAverage > 0)
        ? (async () => {
            const qAc = req.nextUrl.searchParams.get("ac")
            if (qAc && isValidHex(qAc)) return { genreColor: qAc, rankColor: qAc }
            if (mapping?.accentColor) return { genreColor: mapping.accentColor, rankColor: mapping.accentColor }
            const [genreColor, rankColor] = await Promise.all([
              extractBadgeColor(posterBuf, logoFetch, genreName, 'bottom'),
              extractBadgeColor(posterBuf, logoFetch, null, 'top'),
            ])
            return {
              genreColor: isValidHex(genreColor) ? genreColor : (GENRE_FALLBACK[genreName] || "#555555"),
              rankColor: isValidHex(rankColor) ? rankColor : "#555555",
            }
          })()
        : Promise.resolve(undefined),
      // Logo resize
      logoFetch
        ? (async () => {
            const logoMeta = await sharp(logoFetch).metadata()
            const lw = logoMeta.width || 200
            const lh = logoMeta.height || 100
            const qScale = req.nextUrl.searchParams.get("scale")
            const qOx = req.nextUrl.searchParams.get("ox")
            const qOy = req.nextUrl.searchParams.get("oy")
            const defaultScale = Math.min(Math.round(37.5 * lw / lh), 75)
            const userScale = qScale ? (Number(qScale) || defaultScale) : (mapping?.logoScale ?? defaultScale)
            const userOx = qOx ? (Number(qOx) || 0) : (mapping?.logoOffsetX ?? 0)
            const userOy = qOy ? (Number(qOy) || 0) : (mapping?.logoOffsetY ?? 0)
            const logoLayout = computeLogoLayout({ posterW: STD_W, posterH: STD_H, logoW: lw, logoH: lh, logoScale: userScale, logoOffsetX: userOx, logoOffsetY: userOy, hasBadges: !!(badgesEnabled && genreName && voteAverage && voteAverage > 0) })
            let logoResized = await sharp(logoFetch).resize(logoLayout.width, logoLayout.height, { fit: "inside" }).png({ compressionLevel: 1 }).toBuffer()
            const resizedMeta = await sharp(logoResized).metadata()
            let actualW = resizedMeta.width || logoLayout.width
            let actualH = resizedMeta.height || logoLayout.height
            if (actualW > STD_W || actualH > STD_H) {
              const scale = Math.min(STD_W / actualW, STD_H / actualH)
              actualW = Math.round(actualW * scale)
              actualH = Math.round(actualH * scale)
              logoResized = await sharp(logoResized).resize(actualW, actualH, { fit: "inside" }).png({ compressionLevel: 1 }).toBuffer()
            }
            const logoX = Math.round(logoLayout.left + ((logoLayout.width - actualW) / 2))
            const logoTop = Math.max(0, Math.round(logoLayout.top + (logoLayout.height - actualH)))
            return { input: logoResized, top: logoTop, left: logoX } as const
          })()
        : Promise.resolve(null),
    ])

    const renderBaseBuf = blurredPosterBuf || posterBuf
    if (logoResult) composites.push(logoResult)

    // 9. Render both badges in parallel (separate colors per zona)
    const accentColorGenre = badgeColors?.genreColor || (GENRE_FALLBACK[genreName || ""] || "#555555")
    const accentColorRank = badgeColors?.rankColor || "#555555"
    const qBs = req.nextUrl.searchParams.get("bs")
    const badgeStyle = qBs || (mapping?.badgeStyle && mapping.badgeStyle !== "shadow" ? mapping.badgeStyle : undefined) || sd.badgeStyle || "shadow"
    const year = releaseDate?.slice(0, 4) || firstAirDate?.slice(0, 4) || undefined
    const targetCenter = Math.round(30 * STD_H / 570)

    const WIKIDATA_TIMEOUT = Number(process.env.WIKIDATA_TIMEOUT) || 4000
    const wikidataResult = await Promise.race([
      wikidataPromise,
      new Promise<{ awards: string[]; nominations: string[]; studios: string[]; franchise: string | null; basedOn: string | null; director: string | null }>(
        (resolve) => setTimeout(() => resolve({ awards: [], nominations: [], studios: [], franchise: null, basedOn: null, director: null }), WIKIDATA_TIMEOUT)
      ),
    ])

    // Use shared badge computation — same logic as client preview
    const badgeInput: BadgeInput = {
      mediaType: mediaType as "movie" | "tv",
      releaseDate: releaseDate ?? null,
      firstAirDate: firstAirDate ?? null,
      voteAverage: voteAverage ?? 0,
      trendRank: finalRank,
      animeRank: animeRankResult,
      awards: wikidataResult.awards,
      nominations: wikidataResult.nominations,
      franchise: wikidataResult.franchise,
      studios: wikidataResult.studios,
      director: wikidataResult.director,
      tvType: tvType ?? null,
      tvStatus,
    }
    const locale = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
    const computed = computeTopBadge(badgeInput, t, locale)
    const upcomingRelease = computed.upcomingRelease
    const studioBadge = computed.studioBadge
    const queryExtra = req.nextUrl.searchParams.get("extra") || undefined
    let topBadge: { type: "extra"; label: string } | { type: "rank"; rank: number; label: string } | null = null
    if (rankingEnabled) {
      if (queryExtra) {
        topBadge = { type: "extra" as const, label: queryExtra }
      } else if (computed.badge) {
        const b = computed.badge
        if (b.type === "extra") {
          topBadge = { type: "extra" as const, label: b.label }
        } else {
          topBadge = { type: "rank" as const, rank: b.rank!, label: qLabel || b.rankLabel || b.label }
        }
      }
    }
    const qNetLogo = req.nextUrl.searchParams.get("netLogo")
    const globalNetLogo = sd.networkLogo !== false
    const mappingNetLogo = mapping?.networkLogo !== false
    const netLogoEnabled = globalNetLogo && mappingNetLogo && qNetLogo !== "0"
    const networkCandidates = [
      ...tmdbNetworks,
      ...productionCompanies,
      ...wikidataResult.studios,
      ...tmdbStudios,
      studioBadge,
    ]
    const networkLogoResult = netLogoEnabled ? await renderFirstMatchingNetworkLogoBadge(networkCandidates, STD_W) : null
    const networkName = networkLogoResult?.matchedName || studioBadge || (tmdbStudios.length ? tmdbStudios[0] : null)

    // Parallel render: genre badge + ranking badge (with badge PNG cache)

    // Parallel render: genre badge + ranking badge (with badge PNG cache)
    const genreBadgeKey = (badgesEnabled && genreName && voteAverage && voteAverage > 0)
      ? badgeCacheKey("genre", genreName, voteAverage, STD_W, year, badgeStyle, accentColorGenre, topLight)
      : null
    const rankBadgeKey = topBadge
      ? badgeCacheKey("rank", topBadge.type === "extra" ? topBadge.label : `${topBadge.rank}:${topBadge.label}`, STD_W, topLight, qRankingBadgeStyle, accentColorRank)
      : null

    const [genreBadgeResult, rankBadgeResult] = await Promise.all([
      genreBadgeKey
        ? (cacheGet<{ png: Buffer; w: number; h: number }>(genreBadgeKey)
            || (() => {
                const existing = badgeInflight.get(genreBadgeKey) as Promise<{ png: Buffer; w: number; h: number } | null> | undefined
                if (existing) return existing
                const p = renderGenreBadge(genreName!, voteAverage!, STD_W, year, badgeStyle, accentColorGenre, topLight)
                  .then((r) => { if (r) cacheSet(genreBadgeKey, r, ["badge"], BADGE_CACHE_TTL); return r })
                  .catch((e) => { console.error("[poster] Genre badge rendering failed:", e); return null })
                p.finally(() => { badgeInflight.delete(genreBadgeKey) })
                badgeInflight.set(genreBadgeKey, p)
                return p
              })())
        : Promise.resolve(null),
      rankBadgeKey
        ? (cacheGet<{ png: Buffer; w: number; h: number; isRank?: boolean }>(rankBadgeKey)
            || (() => {
                const existing = badgeInflight.get(rankBadgeKey) as Promise<{ png: Buffer; w: number; h: number; isRank?: boolean } | null> | undefined
                if (existing) return existing
                let p: Promise<{ png: Buffer; w: number; h: number; isRank?: boolean } | null>
                if (topBadge!.type === "extra") {
                  p = renderExtraBadge(topBadge!.label, STD_W, topLight, qRankingBadgeStyle, accentColorRank)
                    .then((r) => { const v = { ...r, isRank: false }; cacheSet(rankBadgeKey, v, ["badge"], BADGE_CACHE_TTL); return v })
                    .catch((e) => { console.error("[poster] Ranking badge rendering failed:", e); return null })
                } else {
                  p = renderRankingBadge(topBadge!.rank!, STD_W, topBadge!.label, topLight, qRankingBadgeStyle, accentColorRank)
                    .then((r) => { const v = { ...r, isRank: true }; cacheSet(rankBadgeKey, v, ["badge"], BADGE_CACHE_TTL); return v })
                    .catch((e) => { console.error("[poster] Ranking badge rendering failed:", e); return null })
                }
                p.finally(() => { badgeInflight.delete(rankBadgeKey) })
                badgeInflight.set(rankBadgeKey, p)
                return p
              })())
        : Promise.resolve(null),
    ])

    // Push badge results (parallel)
    const [safeGenreBadgeResult, safeRankBadgeResult] = await Promise.all([
      genreBadgeResult ? fitBadgeToCanvas(genreBadgeResult, STD_W, STD_H) : Promise.resolve(null),
      rankBadgeResult ? fitBadgeToCanvas(rankBadgeResult, STD_W, STD_H) : Promise.resolve(null),
    ])

    if (safeGenreBadgeResult) {
      if (badgeStyle === "bar") {
        composites.push({ input: safeGenreBadgeResult.png, top: STD_H - safeGenreBadgeResult.h, left: 0 })
      } else {
        const badgeY = STD_H - safeGenreBadgeResult.h - Math.max(0, Math.round(targetCenter - safeGenreBadgeResult.h / 2))
        const badgeLeft = Math.round((STD_W - safeGenreBadgeResult.w) / 2)
        composites.push({ input: safeGenreBadgeResult.png, top: badgeY, left: badgeLeft })
      }
    }
    if (safeRankBadgeResult) {
      const isBar = qRankingBadgeStyle === "bar"
      const isNetflixRank = qRankingBadgeStyle === "netflix"
      const rankLeft = isBar ? 0 : Math.round((STD_W - safeRankBadgeResult.w) / 2)
      const rankTop = 0
      composites.push({ input: safeRankBadgeResult.png, top: rankTop, left: rankLeft })
    }

    if (networkLogoResult) {
      const netTop = 15
      const netLeft = 23
      composites.push({ input: networkLogoResult.png, top: netTop, left: netLeft })
    }

    // 10. Final composite: single sharp call for all layers
    const safeComposites = (await Promise.all(composites.map((layer) => fitCompositeToCanvas(layer, STD_W, STD_H))))
      .filter((layer): layer is PosterComposite => layer !== null)
    const compositedBase = await renderCompositeLayers(renderBaseBuf, safeComposites, STD_W, STD_H)
    const composited = STD_W === OUTPUT_W && STD_H === OUTPUT_H
      ? await sharp(compositedBase).jpeg({ quality: 70 }).toBuffer()
      : await sharp(compositedBase)
        .resize(OUTPUT_W, OUTPUT_H, { fit: "cover" })
.jpeg({ quality: 70 })
        .toBuffer()

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
