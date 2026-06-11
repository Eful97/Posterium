import { NextRequest } from "next/server"
import sharp from "sharp"
import { getImages, getDetails } from "@/lib/tmdb"
import { getJWRankings } from "@/lib/justwatch"
import { getById } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { genreRatingSVG, rankingBadgeSVG, bottomGradientSVG, extraBadgeSVG } from "@/lib/badges"

const RENDER_VERSION = 17
const IMG_BASE = "https://image.tmdb.org/t/p"

type RouteParams = { type: string; id: string }

async function fetchImg(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function imgSrc(path: string): string {
  return path.startsWith("http") ? path : `${IMG_BASE}/original${path}`
}

function etagHeaders(etag: string) {
  return {
    "Content-Type": "image/jpeg",
    "Cache-Control": "no-store",
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
  const cached = cacheGet<Buffer>(cacheKey)
  const cachedHeaders = cacheGet<{ etag: string }>(`${cacheKey}:headers`)
  if (cached && cachedHeaders) {
    const etag = cachedHeaders.etag
    if (req.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304 })
    }
    return new Response(new Uint8Array(cached), {
      headers: etagHeaders(etag),
    })
  }

  let posterPath: string | null = null
  let logoPath: string | null = null
  let etag: string
  let genreName: string | null = null
  let voteAverage: number | null = null
  let showBadges = true
  const queryPoster = req.nextUrl.searchParams.get("poster")
  const queryLogo = req.nextUrl.searchParams.get("logo")
  const queryGenre = req.nextUrl.searchParams.get("genreName")
  const queryVote = req.nextUrl.searchParams.get("voteAverage")
  const mapping = getById(mediaType, tmdbId)

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
        if (chosen) return Response.redirect(`${IMG_BASE}/original${chosen.file_path}`)
      }
    } catch {}
    etag = `"${Date.now()}"`
  }

  if (!posterPath) {
    return new Response("Poster not found", { status: 404 })
  }

  let rankingRank: number | null = null
  try {
    const rankings = await getJWRankings(mediaType === "movie" ? "MOVIE" : "SHOW", "IT", 100)
    const found = rankings.find((r) => r.tmdbId === tmdbId)
    rankingRank = found?.rank ?? mapping?.trendRank ?? null
  } catch (e) { console.error("JustWatch rank error", e) }

  try {
    const posterBuf = await fetchImg(imgSrc(posterPath))
    const posterMeta = await sharp(posterBuf).metadata()
    const pw = posterMeta.width || 1000
    const ph = posterMeta.height || 1500
    const composites: { input: Buffer; top: number; left: number }[] = []
    let logoTop = 0
    let logoH = 0
    const qBadges = req.nextUrl.searchParams.get("badges")
    const badgesEnabled = qBadges !== "0" && showBadges
    const qRanking = req.nextUrl.searchParams.get("ranking")
    const rankingEnabled = qRanking !== "0"
    const s = ph / 1500

    if (logoPath) {
      const logoBuf = await fetchImg(imgSrc(logoPath))
      const logoMeta = await sharp(logoBuf).metadata()
      const lw = logoMeta.width || 200
      const lh = logoMeta.height || 100
      const qScale = req.nextUrl.searchParams.get("scale")
      const qOx = req.nextUrl.searchParams.get("ox")
      const qOy = req.nextUrl.searchParams.get("oy")
      const userScale = qScale ? Number(qScale) : (mapping?.logoScale ?? 75)
      const userOx = qOx ? Number(qOx) : (mapping?.logoOffsetX ?? 0)
      const userOy = qOy ? Number(qOy) : (mapping?.logoOffsetY ?? 0)
      const scalePct = userScale / 100
      const logoW = Math.round(pw * scalePct)
      const logoHval = Math.round(lh * (logoW / lw))
      const maxLogoH = Math.round(ph * 0.30)
      const finalLogoW = Math.min(logoW, pw)
      logoH = Math.min(logoHval, ph, maxLogoH)
      const logoResized = await sharp(logoBuf).resize(finalLogoW, logoH, { fit: "inside" }).png().toBuffer()
      const resizedMeta = await sharp(logoResized).metadata()
      const actualLogoW = resizedMeta.width || finalLogoW
      const actualLogoH = resizedMeta.height || logoH
      const logoX = Math.round((pw - actualLogoW) / 2 + userOx)
      const logoBadgeOffset = (badgesEnabled && genreName && voteAverage && voteAverage > 0) ? 0 : Math.round(40 * s)
      logoTop = Math.round(ph - actualLogoH - ph * 0.1 + userOy + logoBadgeOffset)
      composites.push({ input: logoResized, top: logoTop, left: logoX })
      }

    if (badgesEnabled && genreName && voteAverage && voteAverage > 0) {
      const { svg: gradSvg, top: gradTop } = bottomGradientSVG(pw, ph)
      composites.push({ input: Buffer.from(gradSvg), top: gradTop, left: 0 })
      const { svg: badgeSvg, totalW } = genreRatingSVG(genreName, voteAverage, pw)
      const badgeMeta = await sharp(Buffer.from(badgeSvg)).metadata()
      const badgeH = badgeMeta.height || 38
      const badgeY = ph - badgeH - Math.round(48 * s)
      const badgeLeft = Math.round((pw - totalW) / 2)
      composites.push({ input: Buffer.from(badgeSvg), top: badgeY, left: badgeLeft })
    }

    const extraLabel = req.nextUrl.searchParams.get("extra") || ''

    if (extraLabel) {
      const badgeColor = req.nextUrl.searchParams.get("badgeColor") || ''
      const { svg: extraSvg, totalW, svgH } = extraBadgeSVG(extraLabel, pw, badgeColor)
      const extraLeft = Math.round((pw - totalW) / 2)
      if (svgH <= ph && extraLeft + totalW <= pw) {
        const blurRegion = await sharp(posterBuf).extract({ left: extraLeft, top: 0, width: totalW, height: svgH }).blur(12).toBuffer()
        composites.push({ input: blurRegion, top: 0, left: extraLeft })
      }
      composites.push({ input: Buffer.from(extraSvg), top: 0, left: extraLeft })
    } else if (rankingEnabled && rankingRank) {
      let badgeColor = req.nextUrl.searchParams.get("badgeColor") || ''
      if (!badgeColor) {
        try {
          const rh = Math.max(1, Math.round(ph * 0.05))
          const buf = await sharp(posterBuf).extract({ left: 0, top: 0, width: pw, height: rh }).resize(1, 1).raw().toBuffer()
          badgeColor = `#${buf[0].toString(16).padStart(2, '0')}${buf[1].toString(16).padStart(2, '0')}${buf[2].toString(16).padStart(2, '0')}`
        } catch {}
      }
      const { svg: rankSvg, totalW, svgH } = rankingBadgeSVG(rankingRank, pw, badgeColor, mapping?.trendPeriod)
      const rankLeft = Math.round((pw - totalW) / 2)
      if (svgH <= ph && rankLeft + totalW <= pw) {
        const blurRegion = await sharp(posterBuf).extract({ left: rankLeft, top: 0, width: totalW, height: svgH }).blur(12).toBuffer()
        composites.push({ input: blurRegion, top: 0, left: rankLeft })
      }
      composites.push({ input: Buffer.from(rankSvg), top: 0, left: rankLeft })
    }

    const composited = await sharp(posterBuf)
      .resize(pw, ph, { fit: "fill" })
      .composite(composites)
      .jpeg({ quality: 92 })
      .toBuffer()

    cacheSet(cacheKey, composited, ["poster"])
    cacheSet(`${cacheKey}:headers`, { etag }, ["poster"])
    return new Response(new Uint8Array(composited), {
      headers: etagHeaders(etag),
    })
  } catch {
    return Response.redirect(imgSrc(posterPath))
  }
}
