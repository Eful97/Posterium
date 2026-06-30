import { NextRequest } from "next/server"
import sharp from "sharp"
import "@/lib/sharp-config"
import { getImages, getDetails, getExternalIds, type TMDBImage, type TMDBCompany } from "@/lib/tmdb"
import { getJWRankings } from "@/lib/justwatch"
import { getById, upsert } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache"
import { diskCacheGetAsync, diskCacheSetAsync, hashKey } from "@/lib/disk-cache"
import { getServerDefaults } from "@/lib/server-defaults"
import { GENRE_FALLBACK } from "@/lib/badges"
import { findAccentColor } from "@/lib/accent-color"
import { renderGenreBadge, renderRankingBadge, renderExtraBadge, warmFonts } from "@/lib/svg-badge"
import { fetchAllWikidata, getAwardBadgeLabel, getNominationBadgeLabel, matchTMDBStudios } from "@/lib/awards"
import { computeBadge, computeExtraFallback } from "@/lib/badge-priority"
import { createT } from "@/lib/i18n"
import type { EnrichedAnimeItem } from "@/lib/validation"
import { fetchMDBList } from "@/lib/mdblist"
import { fetchAggregatedRating } from "@/lib/ratings"
import { computeLogoLayout } from "@/lib/logo-layout"

const RENDER_VERSION = 74
const IMG_BASE = "https://image.tmdb.org/t/p"
const MAX_IMG_SIZE = 10 * 1024 * 1024
const STD_W = 1000
const STD_H = 1500
const BADGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000

function badgeCacheKey(type: string, ...parts: (string | number | boolean | undefined | null)[]): string {
  return `badge:${type}:${parts.map(p => typeof p === "number" ? Math.round(p * 10) / 10 : (p ?? "x")).join(":")}`
}

const badgeInflight = new Map<string, Promise<unknown>>()

type RouteParams = { type: string; id: string }
type BadgeRender = { png: Buffer; w: number; h: number; isRank?: boolean }

async function fetchImg(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  const cl = res.headers.get("content-length")
  if (cl && Number(cl) > MAX_IMG_SIZE) throw new Error("image too large")
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_IMG_SIZE) throw new Error("image too large")
  return buf
}

function imgSrc(path: string): string {
  if (path.startsWith("http")) return path
  return `${IMG_BASE}/w500${path}`
}

function etagHeaders(etag: string) {
  return {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    "ETag": etag,
  }
}

async function fitBadgeToCanvas<T extends BadgeRender>(badge: T, maxW: number, maxH: number): Promise<T> {
  if (badge.w <= maxW && badge.h <= maxH) return badge
  const scale = Math.min(maxW / badge.w, maxH / badge.h)
  const w = Math.max(Math.floor(badge.w * scale), 1)
  const h = Math.max(Math.floor(badge.h * scale), 1)
  const png = await sharp(badge.png).resize(w, h, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 1 }).toBuffer()
  return { ...badge, png, w, h }
}

async function topLuminance(buf: Buffer): Promise<number> {
  const stripH = Math.max(Math.round(STD_H * 0.08), 3)
  const extracted = await sharp(buf)
    .extract({ left: 0, top: 0, width: STD_W, height: stripH })
    .raw().toBuffer()
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < extracted.length; i += 4) { r += extracted[i]; g += extracted[i + 1]; b += extracted[i + 2]; n++ }
  r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

async function extractBadgeColor(posterBuf: Buffer, logoBuf?: Buffer | null, fallbackGenre?: string | null): Promise<string> {
  async function extractFrom(buf: Buffer, w: number, h: number, genre: string): Promise<string> {
    const pixels = await sharp(buf).ensureAlpha().raw().toBuffer()
    const result = findAccentColor(pixels, w, h, genre)
    return `#${result.r.toString(16).padStart(2, '0')}${result.g.toString(16).padStart(2, '0')}${result.b.toString(16).padStart(2, '0')}`
  }
  // Thumbnail 200×300 per color extraction (full 1000×1500 raw = 6MB)
  const thumbBuf = await sharp(posterBuf).resize(200, 300, { fit: 'cover' }).toBuffer()
  const [pColor, lColor] = await Promise.all([
    extractFrom(thumbBuf, 200, 300, fallbackGenre || ''),
    logoBuf ? (async () => {
      const meta = await sharp(logoBuf).metadata()
      return extractFrom(logoBuf, meta.width || 200, meta.height || 100, '')
    })() : Promise.resolve(''),
  ])
  if (pColor && lColor) {
    const pr = parseInt(pColor.slice(1,3),16), pg = parseInt(pColor.slice(3,5),16), pb = parseInt(pColor.slice(5,7),16)
    const lr = parseInt(lColor.slice(1,3),16), lg = parseInt(lColor.slice(3,5),16), lb = parseInt(lColor.slice(5,7),16)
    return `#${Math.round((pr+lr)/2).toString(16).padStart(2,'0')}${Math.round((pg+lg)/2).toString(16).padStart(2,'0')}${Math.round((pb+lb)/2).toString(16).padStart(2,'0')}`
  }
  return pColor || lColor || (fallbackGenre ? (GENRE_FALLBACK[fallbackGenre] || '#555555') : '#555555')
}

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
  const sd = getServerDefaults()
  const mapping = await getById(mediaType, tmdbId)

  // Auto-rotate clean poster
  if (mapping && mapping.autoRotateClean && mapping.cleanPosters && mapping.cleanPosters.length > 1) {
    const lastUpdate = mapping.cleanPosterUpdatedAt ? new Date(mapping.cleanPosterUpdatedAt).getTime() : 0
    const now = Date.now()
    if (now - lastUpdate > 24 * 60 * 60 * 1000) {
      const newIndex = Math.floor(Math.random() * mapping.cleanPosters.length)
      const newPosterPath = mapping.cleanPosters[newIndex]
      if (newPosterPath !== mapping.posterPath) {
        mapping.posterPath = newPosterPath
        mapping.cleanPosterIndex = newIndex
        mapping.cleanPosterUpdatedAt = new Date(now).toISOString()
        await upsert(mapping).catch(() => {})
      }
    }
  }

  // 2. Build cache key using mapping's stored rank (skip JW network call)
  const sdHash = hashKey(JSON.stringify(sd))
  const cacheParams = new URLSearchParams(req.nextUrl.searchParams)
  cacheParams.delete("rv")
  cacheParams.delete("v")
  const cachedRank = mapping?.trendRank ?? null
  const cacheKey = `poster:v${RENDER_VERSION}:${type}:${id}:r${cachedRank ?? "x"}:sd${sdHash}:${cacheParams.toString()}`

  // 3. Disk cache check (async, non-blocking)
  const CACHE_TTL_24H = 24 * 60 * 60 * 1000
  const diskBuf = await diskCacheGetAsync("poster", cacheKey, CACHE_TTL_24H)
  if (diskBuf) {
    cacheSet(cacheKey, diskBuf, ["poster"])
    const diskEtag = `"d${hashKey(cacheKey)}"`
    if (req.headers.get("If-None-Match") === diskEtag) {
      return new Response(null, { status: 304, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" } })
    }
    return new Response(new Uint8Array(diskBuf), { headers: etagHeaders(diskEtag) })
  }

  // 4. Memory cache check (no network)
  const cached = cacheGetStale<Buffer>(cacheKey)
  const cachedHeaders = cacheGetStale<{ etag: string }>(`${cacheKey}:headers`)
  if (cached.data && cachedHeaders.data) {
    const etag = cachedHeaders.data.etag
    if (req.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" } })
    }
    if (!cached.stale && !cachedHeaders.stale) {
      return new Response(new Uint8Array(cached.data), { headers: etagHeaders(etag) })
    }
  }

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
    etag = `"v${RENDER_VERSION}:${mapping.updatedAt}"`
    if (req.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800", "ETag": etag } })
    }
  } else {
    const preferredLanguage = req.nextUrl.searchParams.get("lang") || "it"
    const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
    try {
      const [images, details, extIds] = await Promise.all([
        getImages(mediaType, tmdbId, `${preferredLanguage},en,null`, apiKey),
        getDetails(mediaType, tmdbId, preferredLanguage, apiKey),
        getExternalIds(mediaType, tmdbId, apiKey).catch(() => ({ imdb_id: null })),
      ])
      const imdbId = extIds.imdb_id
      const aggregated = imdbId ? await fetchAggregatedRating(imdbId).catch(() => null) : null
      genreName = details.genres[0]?.name || null
      voteAverage = aggregated?.average ?? details.vote_average ?? 0
      releaseDate = details.release_date || null
      firstAirDate = details.first_air_date || null
      const tmdbNetworks = mediaType === "tv" ? (details.networks || []).map((n: TMDBCompany) => n.name) : (details.production_companies || []).map((c: TMDBCompany) => c.name)
      tmdbStudios = matchTMDBStudios(tmdbNetworks)
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
          const anyLogo = images.logos[0]
          const chosenLogo = langLogo || itLogo || enLogo || anyLogo
          if (chosenLogo) logoPath = chosenLogo.file_path
        }
        if (logoPath) {
          posterPath = clean.file_path
        } else {
          const itPoster = images.posters.find((p: TMDBImage) => p.iso_639_1 === "it")
          const enPoster = images.posters.find((p: TMDBImage) => p.iso_639_1 === "en")
          const origPoster = details.original_language ? images.posters.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
          const chosen = itPoster || enPoster || origPoster || images.posters[0]
          if (chosen) posterPath = chosen.file_path
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
    return new Response("Poster not found", { status: 404 })
  }

  try {
    // 6. Parallel: fetch all images + JW rank + MDBList (network I/O)
    const [originalBuf, logoFetch, backdropFetch, rankingResult, animeRankResult] = await Promise.all([
      fetchImg(imgSrc(posterPath)).catch(() => null),
      logoPath ? fetchImg(imgSrc(logoPath)).catch(() => null) : Promise.resolve(null),
      backdropPath ? fetchImg(imgSrc(backdropPath)).catch(() => null) : Promise.resolve(null),
      getJWRankings(mediaType === "movie" ? "MOVIE" : "SHOW", "IT")
        .then((r) => r.find((x) => x.tmdbId === tmdbId)?.rank ?? null)
        .catch(() => null),
      (mediaType === "tv")
        ? (() => {
            try {
              const cached = cacheGet<EnrichedAnimeItem[]>("mdblist:anime:top10")
              if (cached && Array.isArray(cached)) {
                const idx = cached.findIndex((a: EnrichedAnimeItem) => a.id === tmdbId)
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

    const wikidataCacheKey = `wikidata:${mediaType}:${tmdbId}`
    const WIKIDISK_TTL = 24 * 60 * 60 * 1000
    const wikidataPromise = (async () => {
      // Try disk cache first (survives HF restarts)
      try {
        const diskData = await diskCacheGetAsync("wikidata", wikidataCacheKey, WIKIDISK_TTL)
        if (diskData) return JSON.parse(diskData.toString("utf-8")) as Awaited<ReturnType<typeof fetchAllWikidata>>
      } catch {}
      const result = await fetchAllWikidata(tmdbId, mediaType, t)
      // Persist to disk
      diskCacheSetAsync("wikidata", wikidataCacheKey, Buffer.from(JSON.stringify(result))).catch(() => {})
      return result
    })().catch(() => ({ awards: [], nominations: [], studios: [], franchise: null, basedOn: null, director: null }))
    const rankingRank = rankingResult ?? mapping?.trendRank ?? null
    const qRank = req.nextUrl.searchParams.get("rank")
    const qLabel = req.nextUrl.searchParams.get("label")
    const finalRank = qRank ? Number(qRank) || rankingRank : rankingRank

    if (!originalBuf) {
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

    const composites: { input: Buffer; top: number; left: number }[] = []

    if (backdropBuf) {
      composites.push({ input: backdropBuf.buf, top: backdropBuf.top, left: backdropBuf.left })
    }

    // 7b. Luminance + missing details (parallel, both need posterBuf for luminance but details is independent)
    const [topLum] = await Promise.all([
      topLuminance(posterBuf),
      (async () => {
        if (mapping?.tvType) tvType = mapping.tvType
        if (mapping?.tvStatus) tvStatus = mapping.tvStatus
        if (mapping?.releaseDate) releaseDate = mapping.releaseDate
        if (mapping?.firstAirDate) firstAirDate = mapping.firstAirDate
        if ((mediaType === "tv" && (!tvType || !firstAirDate)) || (mediaType === "movie" && !releaseDate)) {
          try {
            const qApiKey = req.nextUrl.searchParams.get("api_key") || undefined
            const preferredLang = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
            const details = await getDetails(mediaType, tmdbId, preferredLang, qApiKey)
            if (!releaseDate) releaseDate = details.release_date || null
            if (!firstAirDate) firstAirDate = details.first_air_date || null
            if (!tvType) tvType = details.type || null
            if (!tvStatus) tvStatus = details.status || null
          } catch (e) { console.error("[poster] Details fetch failed:", e) }
        }
      })(),
    ])

    const qTopLight = req.nextUrl.searchParams.get("tl")
    const topLight = qTopLight !== null ? qTopLight === "1" : topLum > 0.60

    // 8. Blur + badge color extraction + logo resize (parallel)
    const qBadges = req.nextUrl.searchParams.get("badges")
    const qRanking = req.nextUrl.searchParams.get("ranking")
    const qRankingBadgeStyle = req.nextUrl.searchParams.get("rs") || (mapping?.rankingBadgeStyle && mapping.rankingBadgeStyle !== "default" ? mapping.rankingBadgeStyle : undefined) || sd.rankingBadgeStyle || "default"
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
    const [blurComposite, genreColor, logoResult] = await Promise.all([
      // Blur: single sharp pipeline instead of 4 separate ops
      (async () => {
        if (!blurEnabled) return null
        const gh = Math.max(Math.round(STD_H * blurHeight / 100), 100)
        const gradTop = STD_H - gh
        const fadedPct = Math.min(blurFade, 100)
        const darkAlpha = Math.min(blurDarkness / 100, 1)
        const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STD_W}" height="${gh}"><rect width="${STD_W}" height="${gh}" fill="rgba(0,0,0,${darkAlpha})"/></svg>`
        const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STD_W}" height="${gh}">
          <defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0"/>
            <stop offset="${fadedPct}%" stop-color="white" stop-opacity="1"/>
            <stop offset="100%" stop-color="white" stop-opacity="1"/>
          </linearGradient></defs>
          <rect width="${STD_W}" height="${gh}" fill="url(#m)"/>
        </svg>`
        const [overlayBuf, maskBuf] = await Promise.all([
          sharp(Buffer.from(overlaySvg)).png({ compressionLevel: 1 }).toBuffer(),
          sharp(Buffer.from(maskSvg)).png({ compressionLevel: 1 }).toBuffer(),
        ])
        const fadedBlur = await sharp(posterBuf)
          .extract({ left: 0, top: gradTop, width: STD_W, height: gh })
          .blur(blurIntensity)
          .ensureAlpha()
          .composite([
            { input: overlayBuf, blend: 'over' },
            { input: maskBuf, blend: 'dest-in' },
          ])
          .png({ compressionLevel: 1 })
          .toBuffer()
        return { input: fadedBlur, top: gradTop, left: 0 } as const
      })(),
      // Badge color extraction
      (badgesEnabled && genreName && voteAverage && voteAverage > 0)
        ? (async () => {
            const qAc = req.nextUrl.searchParams.get("ac")
            return qAc || mapping?.accentColor || await extractBadgeColor(posterBuf, logoFetch, genreName) || GENRE_FALLBACK[genreName!] || "#555555"
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
            const userScale = qScale ? (Number(qScale) || 75) : (mapping?.logoScale ?? 75)
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

    if (blurComposite) composites.push(blurComposite)
    if (logoResult) composites.push(logoResult)

    // 9. Render both badges in parallel (both depend on genreColor, not on each other)
    const accentForBadge = genreColor || "#555555"
    const qBs = req.nextUrl.searchParams.get("bs")
    const badgeStyle = qBs || (mapping?.badgeStyle && mapping.badgeStyle !== "shadow" ? mapping.badgeStyle : undefined) || sd.badgeStyle || "shadow"
    const year = releaseDate?.slice(0, 4) || firstAirDate?.slice(0, 4) || undefined
    const targetCenter = Math.round(30 * STD_H / 570)

    const now = Date.now()
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
    const isNewMovie = mediaType === "movie" && releaseDate ? (now - new Date(releaseDate).getTime()) < TWO_WEEKS_MS : false
    const isNewSeries = mediaType === "tv" && firstAirDate ? (now - new Date(firstAirDate).getTime()) < TWO_WEEKS_MS : false

    const wikidataResult = await Promise.race([
      wikidataPromise,
      new Promise<{ awards: string[]; nominations: string[]; studios: string[]; franchise: string | null; basedOn: string | null; director: string | null }>((resolve) => setTimeout(() => resolve({ awards: [], nominations: [], studios: [], franchise: null, basedOn: null, director: null }), 1500))
    ])

    const awardBadge = wikidataResult.awards.length ? getAwardBadgeLabel(wikidataResult.awards, t) : null
    const studioBadge = tmdbStudios.length ? tmdbStudios[0] : wikidataResult.studios.length ? wikidataResult.studios[0] : null
    const extraFallback = computeExtraFallback({ mediaType: mediaType as "movie" | "tv", voteAverage: voteAverage ?? 0, tvType, tvStatus }, t)
    const queryExtra = req.nextUrl.searchParams.get("extra") || undefined

    const topBadge = (() => {
      if (!rankingEnabled) return null
      if (queryExtra) return { type: "extra" as const, label: queryExtra }
      const badge = computeBadge({
        isNewMovie, isNewSeries,
        animeRank: animeRankResult,
        trendRank: finalRank,
        award: awardBadge,
        franchise: wikidataResult.franchise,
        nomination: wikidataResult.nominations.length ? getNominationBadgeLabel(wikidataResult.nominations, t) : null,
        studio: studioBadge,
        director: wikidataResult.director,
        extra: extraFallback,
      }, t)
      if (badge) {
        if (badge.type === "extra") return { type: "extra" as const, label: badge.label }
        return { type: "rank" as const, rank: badge.rank!, label: qLabel || badge.rankLabel || badge.label }
      }
      return null
    })()

    // Parallel render: genre badge + ranking badge (with badge PNG cache)
    const genreBadgeKey = (badgesEnabled && genreName && voteAverage && voteAverage > 0)
      ? badgeCacheKey("genre", genreName, voteAverage, STD_W, year, badgeStyle, accentForBadge, topLight)
      : null
    const rankBadgeKey = topBadge
      ? badgeCacheKey("rank", topBadge.type === "extra" ? topBadge.label : `${topBadge.rank}:${topBadge.label}`, STD_W, topLight, qRankingBadgeStyle, accentForBadge)
      : null

    const [genreBadgeResult, rankBadgeResult] = await Promise.all([
      genreBadgeKey
        ? (cacheGet<{ png: Buffer; w: number; h: number }>(genreBadgeKey)
            || (() => {
                const existing = badgeInflight.get(genreBadgeKey) as Promise<{ png: Buffer; w: number; h: number } | null> | undefined
                if (existing) return existing
                const p = renderGenreBadge(genreName!, voteAverage!, STD_W, year, badgeStyle, accentForBadge, topLight)
                  .then((r) => { if (r) cacheSet(genreBadgeKey, r, ["badge"], BADGE_CACHE_TTL); return r })
                  .catch((e) => { console.error("[poster] Genre badge rendering failed:", e); return null })
                  .finally(() => { badgeInflight.delete(genreBadgeKey) })
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
                  p = renderExtraBadge(topBadge!.label, STD_W, topLight, qRankingBadgeStyle, accentForBadge)
                    .then((r) => { const v = { ...r, isRank: false }; cacheSet(rankBadgeKey, v, ["badge"], BADGE_CACHE_TTL); return v })
                    .catch((e) => { console.error("[poster] Ranking badge rendering failed:", e); return null })
                } else {
                  p = renderRankingBadge(topBadge!.rank!, STD_W, topBadge!.label, topLight, qRankingBadgeStyle, accentForBadge)
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

    console.log(`[badge-debug] badgesEnabled=${badgesEnabled} badgeStyle=${badgeStyle} qRs=${qRankingBadgeStyle} topLight=${topLight} year=${year} topBadge=${JSON.stringify(topBadge)} genreKey=${genreBadgeKey?.slice(0,50)} genreOK=${!!genreBadgeResult} rankOK=${!!rankBadgeResult}`)
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
      const rankLeft = isBar ? 0 : Math.round((STD_W - safeRankBadgeResult.w) / 2)
      composites.push({ input: safeRankBadgeResult.png, top: 0, left: rankLeft })
    }

    // 10. Final composite: single sharp call for all layers
    const composited = await sharp(posterBuf)
      .composite(composites)
      .jpeg({ quality: 85 })
      .toBuffer()

    cacheSet(cacheKey, composited, ["poster"])
    cacheSet(`${cacheKey}:headers`, { etag }, ["poster"])
    diskCacheSetAsync("poster", cacheKey, composited).catch(() => {})
    return new Response(new Uint8Array(composited), { headers: etagHeaders(etag) })
  } catch (e) {
    console.error("Poster generation failed:", e)
    return new Response("Poster generation failed", { status: 500 })
  }
}
