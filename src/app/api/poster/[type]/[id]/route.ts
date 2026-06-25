import { NextRequest } from "next/server"
import sharp from "sharp"
import { getImages, getDetails, getExternalIds, type TMDBImage, type TMDBCompany } from "@/lib/tmdb"
import { getJWRankings } from "@/lib/justwatch"
import { getById } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache"
import { GENRE_FALLBACK } from "@/lib/badges"
import { renderGenreBadge, renderRankingBadge, renderExtraBadge } from "@/lib/satori-badge"
import { fetchAllWikidata, getAwardBadgeLabel, getNominationBadgeLabel, matchTMDBStudios } from "@/lib/awards"
import { computeBadge, computeExtraFallback } from "@/lib/badge-priority"
import { createT } from "@/lib/i18n"
import type { EnrichedAnimeItem } from "@/lib/validation"
import { fetchMDBList, MDBLISTS } from "@/lib/mdblist"
import { fetchAggregatedRating } from "@/lib/ratings"

const RENDER_VERSION = 60
const IMG_BASE = "https://image.tmdb.org/t/p"

type RouteParams = { type: string; id: string }

const MAX_IMG_SIZE = 10 * 1024 * 1024
const TMDB_IMG_HOST = "https://image.tmdb.org/t/p"

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
  if (path.startsWith("http")) {
    if (!path.startsWith(TMDB_IMG_HOST)) return `${IMG_BASE}/w500${path}`
    return path
  }
  return `${IMG_BASE}/w500${path}`
}

function etagHeaders(etag: string) {
  return {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=300",
    "ETag": etag,
  }
}



export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "poster")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { type, id } = await params
  console.log(`[poster] type=${type} id=${id} mediaType=${["series", "tv", "show", "tvshow"].includes(type?.toLowerCase() || "") ? "tv" : "movie"}`)
  const mediaType = (["series", "tv", "show", "tvshow"].includes(type?.toLowerCase() || "")) ? "tv" : "movie"
  const tmdbId = Number(id)
  if (isNaN(tmdbId) || tmdbId <= 0) {
    console.log(`[poster] Invalid ID: type=${type} id=${id}`)
    return new Response("Invalid ID", { status: 400 })
  }
  const earlyRank = await getJWRankings(mediaType === "movie" ? "MOVIE" : "SHOW", "IT")
    .then((r) => r.find((x) => x.tmdbId === tmdbId)?.rank ?? null)
    .catch(() => null)
  const cacheParams = new URLSearchParams(req.nextUrl.searchParams)
  cacheParams.delete("rv")
  const cacheKey = `poster:v${RENDER_VERSION}:${type}:${id}:r${earlyRank ?? "x"}:${cacheParams.toString()}`
  const cached = cacheGetStale<Buffer>(cacheKey)
  const cachedHeaders = cacheGetStale<{ etag: string }>(`${cacheKey}:headers`)
  if (cached.data && cachedHeaders.data) {
    const etag = cachedHeaders.data.etag
    if (req.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=300" } })
    }
    if (!cached.stale && !cachedHeaders.stale) {
      return new Response(new Uint8Array(cached.data), {
        headers: etagHeaders(etag),
      })
    }
  }

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
  let nextEpisodeAir: string | null = null
  let tvType: string | null = null
  let tvStatus: string | null = null
  let tmdbStudios: string[] = []
  const queryPoster = req.nextUrl.searchParams.get("poster")
  const queryLogo = req.nextUrl.searchParams.get("logo")
  const queryBackdrop = req.nextUrl.searchParams.get("backdrop")
  const queryGenre = req.nextUrl.searchParams.get("genreName")
  const queryVote = req.nextUrl.searchParams.get("voteAverage")
  const mapping = await getById(mediaType, tmdbId)

  const t = createT(req.nextUrl.searchParams.get("lang") || mapping?.language || "it")

  if (queryPoster) {
    posterPath = queryPoster
    logoPath = queryLogo || null
    backdropPath = queryBackdrop || null
    if (queryBackdrop) {
      backdropScale = Number(req.nextUrl.searchParams.get("bscale") || "100")
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
      return new Response(null, { status: 304 })
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
      nextEpisodeAir = details.next_episode_to_air?.air_date || null
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

  const STD_W = 1000
  const STD_H = 1500

  try {
    const [originalBuf, logoFetch, backdropFetch, rankingResult, animeRankResult] = await Promise.all([
      fetchImg(imgSrc(posterPath)).catch(() => null),
      logoPath ? fetchImg(imgSrc(logoPath)).catch(() => null) : Promise.resolve(null),
      backdropPath ? fetchImg(imgSrc(backdropPath)).catch(() => null) : Promise.resolve(null),
      (() => {
        return Promise.resolve(earlyRank)
      })(),
      (() => {
        if (mediaType !== "tv") return Promise.resolve(null)
        try {
          const cached = cacheGet<any[]>("mdblist:anime:top10")
          if (cached && Array.isArray(cached)) {
            const idx = cached.findIndex((a: EnrichedAnimeItem) => a.id === tmdbId)
            return Promise.resolve(idx >= 0 ? idx + 1 : null)
          }
          return fetchMDBList("mdblistAnime")
            .then((entries) => {
              if (!Array.isArray(entries)) return null
              const idx = entries.findIndex((e) => Number(e.tmdb) === tmdbId)
              return idx >= 0 ? idx + 1 : null
            })
            .catch(() => null)
        } catch { return Promise.resolve(null) }
      })(),
    ])
    const wikidataPromise = fetchAllWikidata(tmdbId, mediaType, t).catch(() => ({ awards: [], nominations: [], studios: [], franchise: null, basedOn: null, director: null }))
    const rankingRank = rankingResult ?? mapping?.trendRank ?? null
    const qRank = req.nextUrl.searchParams.get("rank")
    const qLabel = req.nextUrl.searchParams.get("label")
    const finalRank = qRank ? Number(qRank) || rankingRank : rankingRank
    if (!originalBuf) {
      return new Response("Poster image not available", { status: 404 })
    }
    const posterBuf = await sharp(originalBuf).resize(STD_W, STD_H, { fit: 'cover', position: 'centre' }).toBuffer()
    const composites: { input: Buffer; top: number; left: number }[] = []

    // Composite backdrop behind the poster
    if (backdropFetch) {
      const bMeta = await sharp(backdropFetch).metadata()
      const bw = bMeta.width || 1920
      const bh = bMeta.height || 1080
      const bScale = backdropScale / 100
      const bResizedW = Math.round(STD_W * bScale)
      const bResizedH = Math.round(bh * (bResizedW / bw))
      const bX = Math.round((STD_W - bResizedW) / 2 + backdropOffsetX)
      const bY = Math.round((STD_H - bResizedH) / 2 + backdropOffsetY)
      const backdropBuf = await sharp(backdropFetch).resize(bResizedW, bResizedH, { fit: 'fill' }).toBuffer()
      composites.push({ input: backdropBuf, top: bY, left: bX })
    }

    // Use cached data from mapping to avoid extra API call
    if (mapping?.tvType) tvType = mapping.tvType
    if (mapping?.tvStatus) tvStatus = mapping.tvStatus
    if (mapping?.releaseDate) releaseDate = mapping.releaseDate
    if (mapping?.firstAirDate) firstAirDate = mapping.firstAirDate
    // Fetch missing details when using mapping or query params
    const qApiKey = req.nextUrl.searchParams.get("api_key") || undefined
    if ((mediaType === "tv" && (!tvType || !firstAirDate)) || (mediaType === "movie" && !releaseDate)) {
      try {
        const details = await getDetails(mediaType, tmdbId, "it-IT", qApiKey)
        if (!releaseDate) releaseDate = details.release_date || null
        if (!firstAirDate) firstAirDate = details.first_air_date || null
        if (!tvType) tvType = details.type || null
        if (!tvStatus) tvStatus = details.status || null
    } catch (e) { console.error("[poster] Details fetch failed:", e) }
    }
    const pw = STD_W
    const ph = STD_H

    function simpleLum(hex: string): number {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    async function extractMostSaturated(buf: Buffer): Promise<string> {
      const pixelBuf = await sharp(buf).resize(200, 300, { fit: 'fill', kernel: 'nearest' }).raw().toBuffer()

      // Gather valid pixels and compute bgMean
      const pixels: { r: number; g: number; b: number; s: number; l: number }[] = []
      for (let i = 0; i < pixelBuf.length; i += 4) {
        const r = pixelBuf[i] / 255, g = pixelBuf[i + 1] / 255, b = pixelBuf[i + 2] / 255
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        const l = (max + min) / 2
        const d = max - min
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (s < 0.05 || l < 0.03 || l > 0.97) continue
        pixels.push({ r: pixelBuf[i], g: pixelBuf[i + 1], b: pixelBuf[i + 2], s, l })
      }
      if (pixels.length === 0) return ''

      const n = pixels.length
      const bgMean = { r: pixels.reduce((a, p) => a + p.r, 0) / n, g: pixels.reduce((a, p) => a + p.g, 0) / n, b: pixels.reduce((a, p) => a + p.b, 0) / n }

      let bestScore = -1, best = pixels[0]
      for (const p of pixels) {
        const chroma = p.s * (1 - Math.abs(p.l - 0.5))
        const dr = p.r - bgMean.r, dg = p.g - bgMean.g, db = p.b - bgMean.b
        const divergence = Math.sqrt(dr * dr + dg * dg + db * db) / 441.67
        const score = chroma * divergence
        if (score > bestScore) { bestScore = score; best = p }
      }

      let cr = best.r, cg = best.g, cb = best.b
      const clampLum = 0.2126 * cr / 255 + 0.7152 * cg / 255 + 0.0722 * cb / 255
      if (clampLum < 0.4) {
        cr = Math.round(cr + (255 - cr) * 0.2)
        cg = Math.round(cg + (255 - cg) * 0.2)
        cb = Math.round(cb + (255 - cb) * 0.2)
      } else if (clampLum > 0.7) {
        cr = Math.round(cr * 0.85)
        cg = Math.round(cg * 0.85)
        cb = Math.round(cb * 0.85)
      }
      cr = Math.max(0, Math.min(255, cr))
      cg = Math.max(0, Math.min(255, cg))
      cb = Math.max(0, Math.min(255, cb))

      return `#${cr.toString(16).padStart(2, '0')}${cg.toString(16).padStart(2, '0')}${cb.toString(16).padStart(2, '0')}`
    }

    async function extractBadgeColor(posterBuf: Buffer, logoBuf?: Buffer | null, fallbackGenre?: string | null): Promise<string> {
      const [pColor, lColor] = await Promise.all([
        extractMostSaturated(posterBuf),
        logoBuf ? extractMostSaturated(logoBuf) : Promise.resolve(''),
      ])
      if (pColor && lColor) {
        const pr = parseInt(pColor.slice(1,3),16), pg = parseInt(pColor.slice(3,5),16), pb = parseInt(pColor.slice(5,7),16)
        const lr = parseInt(lColor.slice(1,3),16), lg = parseInt(lColor.slice(3,5),16), lb = parseInt(lColor.slice(5,7),16)
        return `#${Math.round((pr+lr)/2).toString(16).padStart(2,'0')}${Math.round((pg+lg)/2).toString(16).padStart(2,'0')}${Math.round((pb+lb)/2).toString(16).padStart(2,'0')}`
      }
      return pColor || lColor || (fallbackGenre ? (GENRE_FALLBACK[fallbackGenre] || '#555') : '#555')
    }

    async function topLuminance(buf: Buffer): Promise<number> {
      const meta = await sharp(buf).metadata()
      const w = meta.width || STD_W
      const h = meta.height || STD_H
      const stripH = Math.max(Math.round(h * 0.08), 3)
      const extracted = await sharp(buf)
        .extract({ left: 0, top: 0, width: w, height: stripH })
        .raw().toBuffer()
      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < extracted.length; i += 4) { r += extracted[i]; g += extracted[i + 1]; b += extracted[i + 2]; n++ }
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n)
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    }

    const topLum = await topLuminance(posterBuf)
    const qTopLight = req.nextUrl.searchParams.get("tl")
    const topLight = qTopLight !== null ? qTopLight === "1" : topLum > 0.55
    const qBadges = req.nextUrl.searchParams.get("badges")
    const qRanking = req.nextUrl.searchParams.get("ranking")
    const qGradHeight = req.nextUrl.searchParams.get("gradHeight")
    const qBlur = req.nextUrl.searchParams.get("blur")
    const qBlurFade = req.nextUrl.searchParams.get("bf")
    const qBlurDarkness = req.nextUrl.searchParams.get("bd")
    const qBlurEnabled = req.nextUrl.searchParams.get("be")
    const hasQuery = !!queryPoster || !!mapping
    const badgesEnabled = hasQuery ? (qBadges !== null ? qBadges !== "0" : showBadges) : true
    const rankingEnabled = hasQuery ? (qRanking !== null ? qRanking !== "0" : rankingBadges) : true
    const blurEnabled = qBlurEnabled !== "0"
    const s = ph / 1500
    const blurHeight = qGradHeight ? Math.max(Number(qGradHeight), 5) : 30
    const blurIntensity = qBlur ? Math.max(Number(qBlur), 1) : 20
    const blurFade = qBlurFade ? Math.max(Number(qBlurFade), 0) : 30
    const blurDarkness = qBlurDarkness ? Math.max(Number(qBlurDarkness), 0) : 40
    if (blurEnabled) {
    const gh = Math.max(Math.round(ph * blurHeight / 100), 100)
    const gradTop = ph - gh
    const fadedPct = Math.min(blurFade, 100)
    const darkAlpha = Math.min(blurDarkness / 100, 1)
    const blurredSection = await sharp(posterBuf)
      .extract({ left: 0, top: gradTop, width: pw, height: gh })
      .blur(blurIntensity)
      .ensureAlpha()
      .png()
      .toBuffer()
    const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${gh}">
      <rect width="${pw}" height="${gh}" fill="rgba(0,0,0,${darkAlpha})"/>
    </svg>`
    const overlayBuf = await sharp(Buffer.from(overlaySvg)).png().toBuffer()
    const darkenedBlur = await sharp(blurredSection)
      .composite([{ input: overlayBuf, blend: 'over' }])
      .png()
      .toBuffer()
    const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${gh}">
      <defs>
        <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="0"/>
          <stop offset="${fadedPct}%" stop-color="white" stop-opacity="1"/>
          <stop offset="100%" stop-color="white" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect width="${pw}" height="${gh}" fill="url(#m)"/>
    </svg>`
    const maskBuf = await sharp(Buffer.from(maskSvg)).png().toBuffer()
    const fadedBlur = await sharp(darkenedBlur)
      .composite([{ input: maskBuf, blend: 'dest-in' }])
      .png()
      .toBuffer()
    composites.push({ input: fadedBlur, top: gradTop, left: 0 })
    }

    let genreColor: string | undefined
    if (badgesEnabled && genreName && voteAverage && voteAverage > 0) {
      try {
        const qBs = req.nextUrl.searchParams.get("bs")
        const qAc = req.nextUrl.searchParams.get("ac")
        const badgeStyle = qBs || "shadow"
        genreColor = qAc || await extractBadgeColor(posterBuf, logoFetch, genreName) || GENRE_FALLBACK[genreName] || "#555555"
        const year = releaseDate?.slice(0, 4) || firstAirDate?.slice(0, 4) || undefined
        const accentColor = genreColor || "#555555"
        const targetCenter = Math.round(30 * ph / 570)
        if (badgeStyle === "bar") {
          const { png, h } = await renderGenreBadge(genreName, voteAverage, pw, year, badgeStyle, accentColor)
          composites.push({ input: png, top: ph - h, left: 0 })
        } else {
          const { png, w, h } = await renderGenreBadge(genreName, voteAverage, pw, year, badgeStyle, accentColor)
          const badgeY = ph - h - Math.max(0, Math.round(targetCenter - h / 2))
          const badgeLeft = Math.round((pw - w) / 2)
          composites.push({ input: png, top: badgeY, left: badgeLeft })
        }
      } catch {
        // genre badge rendering failed, skip it
      }
    }

    if (logoFetch) {
      const logoBuf = logoFetch
      const logoMeta = await sharp(logoBuf).metadata()
      const lw = logoMeta.width || 200
      const lh = logoMeta.height || 100
      const qScale = req.nextUrl.searchParams.get("scale")
      const qOx = req.nextUrl.searchParams.get("ox")
      const qOy = req.nextUrl.searchParams.get("oy")
      const userScale = qScale ? (Number(qScale) || 75) : (mapping?.logoScale ?? 75)
      const userOx = qOx ? (Number(qOx) || 0) : (mapping?.logoOffsetX ?? 0)
      const userOy = qOy ? (Number(qOy) || 0) : (mapping?.logoOffsetY ?? 0)
      const scalePct = userScale / 100
      const maxLogoH = Math.round(ph * 0.25)
      let logoW = Math.round(pw * scalePct)
      let logoH = Math.round(lh * (logoW / lw))
      if (logoH > maxLogoH) {
        const ratio = maxLogoH / logoH
        logoW = Math.round(logoW * ratio)
        logoH = maxLogoH
      }
      const finalLogoW = Math.min(logoW, pw)
      const logoResized = await sharp(logoBuf).resize(finalLogoW, logoH, { fit: "inside" }).png().toBuffer()
      const resizedMeta = await sharp(logoResized).metadata()
      const actualLogoW = resizedMeta.width || finalLogoW
      const actualLogoH = resizedMeta.height || logoH
      const logoX = Math.round((pw - actualLogoW) / 2 + userOx)
      const logoBadgeOffset = (badgesEnabled && genreName && voteAverage && voteAverage > 0) ? 0 : Math.round(40 * s)
      const logoTop = Math.round(ph - actualLogoH - ph * 0.1 + userOy + logoBadgeOffset)

      composites.push({ input: logoResized, top: logoTop, left: logoX })
    }

    // Badge priority (matches client EditView.tsx):
    // 1. Nuovo film / Nuova serie
    // 2. Anime rank (MDBList)
    // 3. Trend rank (JustWatch)
    // 4. Award (Vincitore)
    // 5. Franchise
    // 6. Nomination (Candidato)
    // 7. Studio (TMDB)
    // 8. Director (Wikidata)
    // 9. Miniserie / Ritorna / Da divorare / Il più votato
    const now = Date.now()
    const twoWeeks = 14 * 24 * 60 * 60 * 1000
    const isNewMovie = mediaType === "movie" && releaseDate ? (now - new Date(releaseDate).getTime()) < twoWeeks : false
    const isNewSeries = mediaType === "tv" && firstAirDate ? (now - new Date(firstAirDate).getTime()) < twoWeeks : false
    // Try to get Wikidata data, but don't block poster generation for more than 3s
    const wikidataResult = await Promise.race([
      wikidataPromise,
      new Promise<{ awards: string[]; nominations: string[]; studios: string[]; franchise: string | null; basedOn: string | null; director: string | null }>((resolve) => setTimeout(() => resolve({ awards: [], nominations: [], studios: [], franchise: null, basedOn: null, director: null }), 3000))
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

    if (topBadge) {
      try {
        if (topBadge.type === "extra") {
          const { png: extraPng, w, h } = await renderExtraBadge(topBadge.label, pw, topLight)
          const extraLeft = Math.round((pw - w) / 2)
          composites.push({ input: extraPng, top: 0, left: extraLeft })
        } else {
          const { png: rankPng, w, h } = await renderRankingBadge(topBadge.rank, pw, topBadge.label, topLight)
          const rankLeft = Math.round((pw - w) / 2)
          composites.push({ input: rankPng, top: 0, left: rankLeft })
        }
      } catch {
        // badge rendering failed, skip it
      }
    }

    const composited = await sharp(posterBuf)
      .composite(composites)
      .jpeg({ quality: 85 })
      .toBuffer()

    cacheSet(cacheKey, composited, ["poster"])
    cacheSet(`${cacheKey}:headers`, { etag }, ["poster"])
    return new Response(new Uint8Array(composited), {
      headers: etagHeaders(etag),
    })
  } catch (e) {
    console.error("Poster generation failed:", e)
    return new Response("Poster generation failed", { status: 500 })
  }
}
