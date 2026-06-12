import { NextRequest } from "next/server"
import sharp from "sharp"
import { getImages, getDetails } from "@/lib/tmdb"
import { getJWRankings } from "@/lib/justwatch"
import { getById } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache"
import { genreRatingSVG, rankingBadgeSVG, bottomGradientSVG, extraBadgeSVG, topGradientSVG, adjustColor, GENRE_FALLBACK } from "@/lib/badges"

const RENDER_VERSION = 20
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
    if (!path.startsWith(TMDB_IMG_HOST)) return `${IMG_BASE}/w780${path}`
    return path
  }
  return `${IMG_BASE}/w780${path}`
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
  const mediaType = (type === "series" || type === "tv") ? "tv" : "movie"
  const tmdbId = Number(id)
  const cacheKey = `poster:v${RENDER_VERSION}:${type}:${id}:${req.nextUrl.searchParams.toString()}`
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
  let etag: string
  let genreName: string | null = null
  let voteAverage: number | null = null
  let showBadges = true
  let releaseDate: string | null = null
  let firstAirDate: string | null = null
  let nextEpisodeAir: string | null = null
  let tvType: string | null = null
  let tvStatus: string | null = null
  const queryPoster = req.nextUrl.searchParams.get("poster")
  const queryLogo = req.nextUrl.searchParams.get("logo")
  const queryGenre = req.nextUrl.searchParams.get("genreName")
  const queryVote = req.nextUrl.searchParams.get("voteAverage")
  const mapping = await getById(mediaType, tmdbId)

  if (queryPoster) {
    posterPath = queryPoster
    logoPath = queryLogo || null
    if (queryGenre) genreName = queryGenre
    if (queryVote) voteAverage = Number(queryVote)
    showBadges = true
    etag = `"${Date.now()}"`
  } else if (mapping) {
    posterPath = mapping.posterPath
    logoPath = queryLogo || mapping.logoPath
    genreName = mapping.genreName ?? null
    voteAverage = mapping.voteAverage ?? null
    showBadges = mapping.showBadges ?? true
    etag = `"v${RENDER_VERSION}:${mapping.updatedAt}"`
    if (req.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304 })
    }
  } else {
    const preferredLanguage = req.nextUrl.searchParams.get("lang") || "it"
    const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
    try {
      const [images, details] = await Promise.all([
        getImages(mediaType, tmdbId, `${preferredLanguage},en,null`, apiKey),
        getDetails(mediaType, tmdbId, preferredLanguage, apiKey),
      ])
      genreName = details.genres[0]?.name || null
      voteAverage = details.vote_average
      releaseDate = details.release_date || null
      firstAirDate = details.first_air_date || null
      nextEpisodeAir = details.next_episode_to_air?.air_date || null
      tvType = details.type || null
      tvStatus = details.status || null
      const clean = images.posters.find((p: any) => p.iso_639_1 === null)
      if (clean) {
        posterPath = clean.file_path
        if (queryLogo) {
          const exact = images.logos.find((l: any) => l.file_path === queryLogo)
          if (exact) logoPath = exact.file_path
        }
        if (!logoPath) {
          const itLogo = images.logos.find((l: any) => l.iso_639_1 === "it")
          const enLogo = images.logos.find((l: any) => l.iso_639_1 === "en")
          const anyLogo = images.logos[0]
          const chosenLogo = itLogo || enLogo || anyLogo
          if (chosenLogo) logoPath = chosenLogo.file_path
        }
      } else {
        const langPoster = images.posters.find((p: any) => p.iso_639_1 === preferredLanguage)
        const fallback = images.posters[0]
        const chosen = langPoster || fallback
        if (chosen) return Response.redirect(`${IMG_BASE}/w780${chosen.file_path}`)
      }
    } catch {}
    etag = `"${Date.now()}"`
  }

  if (!posterPath) {
    return new Response("Poster not found", { status: 404 })
  }

  const STD_W = 1000
  const STD_H = 1500

  try {
    const [originalBuf, logoFetch, rankingResult] = await Promise.all([
      fetchImg(imgSrc(posterPath)),
      logoPath ? fetchImg(imgSrc(logoPath)).catch(() => null) : Promise.resolve(null),
      (() => {
        if (mapping?.trendRank) return Promise.resolve(mapping.trendRank)
        return getJWRankings(mediaType === "movie" ? "MOVIE" : "SHOW", "IT")
          .then((r) => r.find((x) => x.tmdbId === tmdbId)?.rank ?? null)
          .catch(() => null)
      })(),
    ]) as [Buffer, Buffer | null, number | null]
    const rankingRank = rankingResult ?? mapping?.trendRank ?? null
    const qRank = req.nextUrl.searchParams.get("rank")
    const finalRank = qRank ? Number(qRank) || rankingRank : rankingRank
    const posterBuf = await sharp(originalBuf).resize(STD_W, STD_H, { fit: 'fill' }).toBuffer()
    const pw = STD_W
    const ph = STD_H
    const composites: { input: Buffer; top: number; left: number }[] = []

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
    const qBadges = req.nextUrl.searchParams.get("badges")
    const badgesEnabled = qBadges !== "0" && showBadges
    const qRanking = req.nextUrl.searchParams.get("ranking")
    const rankingEnabled = qRanking !== "0"
    const s = ph / 1500

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
      const logoW = Math.round(pw * scalePct)
      const logoHval = Math.round(lh * (logoW / lw))
      const maxLogoH = Math.round(ph * 0.30)
      const finalLogoW = Math.min(logoW, pw)
      const logoH = Math.min(logoHval, ph, maxLogoH)
      const logoResized = await sharp(logoBuf).resize(finalLogoW, logoH, { fit: "inside" }).png().toBuffer()
      const resizedMeta = await sharp(logoResized).metadata()
      const actualLogoW = resizedMeta.width || finalLogoW
      const actualLogoH = resizedMeta.height || logoH
      const logoX = Math.round((pw - actualLogoW) / 2 + userOx)
      const logoBadgeOffset = (badgesEnabled && genreName && voteAverage && voteAverage > 0) ? 0 : Math.round(40 * s)
      const logoTop = Math.round(ph - actualLogoH - ph * 0.1 + userOy + logoBadgeOffset)
      composites.push({ input: logoResized, top: logoTop, left: logoX })
    }

    if (badgesEnabled && genreName && voteAverage && voteAverage > 0) {
      const { svg: gradSvg, top: gradTop } = bottomGradientSVG(pw, ph)
      composites.push({ input: Buffer.from(gradSvg), top: gradTop, left: 0 })
      const { svg: badgeSvg, totalW } = genreRatingSVG(genreName, voteAverage, pw)
      const badgeMeta = await sharp(Buffer.from(badgeSvg)).metadata()
      const badgeH = badgeMeta.height || 38
      const badgeY = ph - badgeH - Math.round(16 * ph / 570)
      const badgeLeft = Math.round((pw - totalW) / 2)
      composites.push({ input: Buffer.from(badgeSvg), top: badgeY, left: badgeLeft })
    }

    const extraLabel = req.nextUrl.searchParams.get("extra") || (() => {
      if (!rankingEnabled) return ''
      const currYear = new Date().getFullYear().toString()
      const isNewMovie = mediaType === "movie" && releaseDate?.startsWith(currYear)
      const isNewSeries = mediaType === "tv" && firstAirDate?.startsWith(currYear)
      const now = Date.now()
      const twoMonths = 60 * 24 * 60 * 60 * 1000
      const twoWeeks = 14 * 24 * 60 * 60 * 1000

      if (isNewMovie) return "Nuovo film"
      if (isNewSeries) return "Nuova serie"

      if (mediaType === "movie" && releaseDate) {
        const rd = new Date(releaseDate).getTime()
        if (rd < now && now - rd < twoMonths) return "Al cinema"
      }

      if (mediaType === "tv" && nextEpisodeAir) {
        const nextEp = new Date(nextEpisodeAir).getTime()
        if (nextEp > now && nextEp - now < twoWeeks) return "Nuova stagione"
      }

      if (tvType === "Miniseries") return "Miniserie"
      if (tvStatus === "Returning Series") return "Ritorna"
      if (voteAverage && voteAverage >= 8) return "Da divorare"

      return ''
    })()

    if (extraLabel) {
      let badgeColor = req.nextUrl.searchParams.get("badgeColor") || ''
      if (!badgeColor) {
        try {
          badgeColor = await extractBadgeColor(posterBuf, logoFetch, genreName || queryGenre)
        } catch {}
        if (!badgeColor && (genreName || queryGenre)) badgeColor = GENRE_FALLBACK[genreName || queryGenre || ''] || '#555'
      }
      if (!badgeColor) badgeColor = GENRE_FALLBACK[genreName || queryGenre || ''] || '#555'
      const { svg: extraSvg, totalW, svgH } = extraBadgeSVG(extraLabel, pw, badgeColor)
      const extraLeft = Math.round((pw - totalW) / 2)
      const { svg: gradSvg, h: gradH } = topGradientSVG(pw, svgH)
      composites.push({ input: Buffer.from(gradSvg), top: 0, left: 0 })
      composites.push({ input: Buffer.from(extraSvg), top: 0, left: extraLeft })
    } else if (rankingEnabled && finalRank) {
      let badgeColor = req.nextUrl.searchParams.get("badgeColor") || ''
      if (!badgeColor) {
        try {
          badgeColor = await extractBadgeColor(posterBuf, logoFetch, genreName || queryGenre)
        } catch {}
        if (!badgeColor && (genreName || queryGenre)) badgeColor = GENRE_FALLBACK[genreName || queryGenre || ''] || '#555'
      }
      if (!badgeColor) badgeColor = GENRE_FALLBACK[genreName || queryGenre || ''] || '#555'
      const { svg: rankSvg, totalW, svgH } = rankingBadgeSVG(finalRank, pw, badgeColor, mapping?.trendPeriod)
      const rankLeft = Math.round((pw - totalW) / 2)
      const { svg: gradSvg, h: gradH } = topGradientSVG(pw, svgH)
      composites.push({ input: Buffer.from(gradSvg), top: 0, left: 0 })
      composites.push({ input: Buffer.from(rankSvg), top: 0, left: rankLeft })
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
  } catch {
    return new Response("Poster generation failed", { status: 500 })
  }
}
