import sharp from "sharp"
import { cacheGet, cacheSet } from "./cache"
import { GENRE_FALLBACK, cinematicVignetteSVG } from "./badges"
import { applyBlur } from "./blur"
import {
  STD_W, STD_H,
  extractBadgeColor,
  fitBadgeToCanvas,
  fitCompositeToCanvas,
  renderCompositeLayers,
  isValidHex,
  PosterComposite,
} from "./poster-render-helpers"
import { renderGenreBadge, renderRankingBadge, renderExtraBadge } from "./svg-badge"
import { renderFirstMatchingNetworkLogoBadge } from "./network-svgs"
import { computeLogoLayout } from "./logo-layout"
import { computeTopBadge, isNetworkStudio, type BadgeInput } from "./poster-badge"
import type { Mapping } from "./types"
import type { ServerDefaults } from "./server-defaults"
import type { WikidataResult } from "./awards"
import type { BadgeT } from "./poster-badge"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const BADGE_CACHE_TTL = 24 * 60 * 60 * 1000

export interface GenerationInput {
  // Images (already fetched)
  posterBuf: Buffer
  logoFetch: Buffer | null
  backdropFetch: Buffer | null

  // Layout
  backdropScale: number
  backdropOffsetX: number
  backdropOffsetY: number

  // Blur
  blurEnabled: boolean
  blurHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number

  // Badge flags
  badgesEnabled: boolean
  rankingEnabled: boolean
  genreName: string | null
  voteAverage: number | null
  badgeStyle: string
  rankingBadgeStyle: string
  topLight: boolean
  targetCenter: number

  // Logo
  logoScale: number | null
  logoOffsetX: number | null
  logoOffsetY: number | null

  // Badge data sources
  mediaType: "movie" | "tv"
  finalRank: number | null
  animeRankResult: number | null
  rankingResult: number | null
  mapping: Mapping | null
  tmdbNetworks: readonly string[]
  productionCompanies: readonly string[]
  tmdbStudios: readonly string[]
  tvType: string | null
  tvStatus: string | null
  releaseDate: string | null
  firstAirDate: string | null
  wikidataResult: WikidataResult
  tmdbKeywords: readonly string[]
  locale: string
  t: BadgeT
  qLabel: string | null
  queryExtra: string | null
  qNetLogo: string | null
  sd: ServerDefaults
  accentOverride: { genreColor: string; rankColor: string } | null
}

// ---------------------------------------------------------------------------
// Badge cache helpers (coalescing)
// ---------------------------------------------------------------------------

function badgeCacheKey(type: string, ...parts: (string | number | boolean | undefined | null)[]): string {
  return `badge:${type}:${parts.map(p => typeof p === "number" ? Math.round(p * 10) / 10 : (p ?? "x")).join(":")}`
}

const badgeInflight = new Map<string, Promise<unknown>>()

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function generatePosterBuffer(input: GenerationInput): Promise<Buffer> {
  const {
    posterBuf, logoFetch, backdropFetch,
    backdropScale, backdropOffsetX, backdropOffsetY,
    blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness,
    badgesEnabled, rankingEnabled, genreName, voteAverage, badgeStyle,
    rankingBadgeStyle, topLight, targetCenter,
    logoScale, logoOffsetX, logoOffsetY,
    mediaType, finalRank, animeRankResult, rankingResult,
    mapping, tmdbNetworks, productionCompanies, tmdbStudios,
    tvType, tvStatus, releaseDate, firstAirDate,
    wikidataResult, tmdbKeywords, locale, t,
    qLabel, queryExtra, qNetLogo, sd, accentOverride,
  } = input

  // -----------------------------------------------------------------------
  // 1. Backdrop composite layer
  // -----------------------------------------------------------------------
  const composites: PosterComposite[] = []

  if (backdropFetch) {
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
    composites.push({ input: backdropResized, top: bY, left: bX })
  }

  // -----------------------------------------------------------------------
  // 2. Blur + badge colors + logo resize (parallel)
  // -----------------------------------------------------------------------
  const [blurredPosterBuf, badgeColors, logoResult] = await Promise.all([
    applyBlur({ posterBuf, blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness }),
    (badgesEnabled && genreName && voteAverage && voteAverage > 0)
      ? (accentOverride
          ? Promise.resolve(accentOverride)
          : (async () => {
              const [gColor, rColor] = await Promise.all([
                extractBadgeColor(posterBuf, logoFetch, genreName, 'bottom'),
                extractBadgeColor(posterBuf, logoFetch, null, 'top'),
              ])
              return {
                genreColor: isValidHex(gColor) ? gColor : (GENRE_FALLBACK[genreName] || "#555555"),
                rankColor: isValidHex(rColor) ? rColor : "#555555",
              }
            })()
      ) : Promise.resolve(undefined),
    logoFetch
      ? (async () => {
          const lMeta = await sharp(logoFetch).metadata()
          const lw = lMeta.width || 200
          const lh = lMeta.height || 100
          const defScale = Math.min(Math.round(37.5 * lw / lh), 75)
          const uScale = logoScale ?? defScale
          const uOx = logoOffsetX ?? 0
          const uOy = logoOffsetY ?? 0
          const layout = computeLogoLayout({
            posterW: STD_W, posterH: STD_H, logoW: lw, logoH: lh,
            logoScale: uScale, logoOffsetX: uOx, logoOffsetY: uOy,
            hasBadges: !!(badgesEnabled && genreName && voteAverage && voteAverage > 0),
          })
          let resized = await sharp(logoFetch).resize(layout.width, layout.height, { fit: "inside" }).png({ compressionLevel: 1 }).toBuffer()
          const rMeta = await sharp(resized).metadata()
          let aW = rMeta.width || layout.width
          let aH = rMeta.height || layout.height
          if (aW > STD_W || aH > STD_H) {
            const s = Math.min(STD_W / aW, STD_H / aH)
            aW = Math.round(aW * s); aH = Math.round(aH * s)
            resized = await sharp(resized).resize(aW, aH, { fit: "inside" }).png({ compressionLevel: 1 }).toBuffer()
          }
          return { input: resized, top: Math.max(0, Math.round(layout.top + (layout.height - aH))), left: Math.round(layout.left + ((layout.width - aW) / 2)) } as const
        })()
      : Promise.resolve(null),
  ])

  // -----------------------------------------------------------------------
  // 3. Base image: blurred or original + modulate + vignette
  // -----------------------------------------------------------------------
  const rawBaseBuf = blurredPosterBuf || posterBuf
  const renderBaseBuf = await sharp(rawBaseBuf)
    .modulate({ brightness: 1.01, saturation: 1.06 })
    .toBuffer()

  const vigBuf = await sharp(Buffer.from(cinematicVignetteSVG(STD_W, STD_H))).png().toBuffer()
  composites.push({ input: vigBuf, top: 0, left: 0 })
  if (logoResult) composites.push(logoResult)

  // -----------------------------------------------------------------------
  // 4. Badge computation
  // -----------------------------------------------------------------------
  const accentColorGenre = badgeColors?.genreColor || (GENRE_FALLBACK[genreName || ""] || "#555555")
  const accentColorRank = badgeColors?.rankColor || "#555555"
  const year = releaseDate?.slice(0, 4) || firstAirDate?.slice(0, 4) || undefined

  const badgeInput: BadgeInput = {
    mediaType,
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
    keywords: [...tmdbKeywords],
  }
  const computed = computeTopBadge(badgeInput, t, locale)
  const studioBadge = computed.studioBadge
  const isNetStudio = isNetworkStudio(studioBadge)

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

  // Network logo (parallel with badge render)
  const netLogoEnabled = sd.networkLogo !== false && (mapping?.networkLogo ?? true) !== false && qNetLogo !== "0"
  const networkCandidates = [
    ...tmdbNetworks,
    ...productionCompanies,
    ...wikidataResult.studios,
    ...tmdbStudios,
    isNetStudio ? null : studioBadge,
  ].filter(Boolean) as string[]

  const networkLogoResult = netLogoEnabled
    ? await renderFirstMatchingNetworkLogoBadge(networkCandidates, STD_W)
    : null

  if (networkLogoResult && topBadge && topBadge.type === "extra") {
    const lbl = topBadge.label.toLowerCase().trim()
    const netName = networkLogoResult.matchedName.toLowerCase().trim()
    if (lbl === netName || lbl.includes(netName) || isNetworkStudio(topBadge.label)) {
      topBadge = null
    }
  }

  // -----------------------------------------------------------------------
  // 5. Render genre + ranking badges (parallel with coalescing)
  // -----------------------------------------------------------------------
  const genreBadgeKey = (badgesEnabled && genreName && voteAverage && voteAverage > 0)
    ? badgeCacheKey("genre", genreName, voteAverage, STD_W, year, badgeStyle, accentColorGenre, topLight)
    : null
  const rankBadgeKey = topBadge
    ? badgeCacheKey("rank", topBadge.type === "extra" ? topBadge.label : `${topBadge.rank}:${topBadge.label}`, STD_W, topLight, rankingBadgeStyle, accentColorRank)
    : null

  const [genreBadgeResult, rankBadgeResult] = await Promise.all([
    genreBadgeKey
      ? (cacheGet<{ png: Buffer; w: number; h: number }>(genreBadgeKey)
          || (() => {
              const existing = badgeInflight.get(genreBadgeKey) as Promise<{ png: Buffer; w: number; h: number } | null> | undefined
              if (existing) return existing
              const p = renderGenreBadge(genreName!, voteAverage!, STD_W, year, badgeStyle, accentColorGenre, topLight)
                .then((r) => { if (r) cacheSet(genreBadgeKey, r, ["badge"], BADGE_CACHE_TTL); return r })
                .catch(() => null)
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
                p = renderExtraBadge(topBadge!.label, STD_W, topLight, rankingBadgeStyle, accentColorRank)
                  .then((r) => { const v = { ...r, isRank: false }; cacheSet(rankBadgeKey, v, ["badge"], BADGE_CACHE_TTL); return v })
                  .catch(() => null)
              } else {
                p = renderRankingBadge(topBadge!.rank!, STD_W, topBadge!.label, topLight, rankingBadgeStyle, accentColorRank)
                  .then((r) => { const v = { ...r, isRank: true }; cacheSet(rankBadgeKey, v, ["badge"], BADGE_CACHE_TTL); return v })
                  .catch(() => null)
              }
              p.finally(() => { badgeInflight.delete(rankBadgeKey) })
              badgeInflight.set(rankBadgeKey, p)
              return p
            })())
      : Promise.resolve(null),
  ])

  // -----------------------------------------------------------------------
  // 6. Position badges + network logo
  // -----------------------------------------------------------------------
  const [safeGenreBadgeResult, safeRankBadgeResult] = await Promise.all([
    genreBadgeResult ? fitBadgeToCanvas(genreBadgeResult, STD_W, STD_H) : Promise.resolve(null),
    rankBadgeResult ? fitBadgeToCanvas(rankBadgeResult, STD_W, STD_H) : Promise.resolve(null),
  ])

  if (safeGenreBadgeResult) {
    if (badgeStyle === "bar") {
      composites.push({ input: safeGenreBadgeResult.png, top: STD_H - safeGenreBadgeResult.h, left: 0 })
    } else {
      const badgeY = STD_H - safeGenreBadgeResult.h - Math.max(0, Math.round(targetCenter - safeGenreBadgeResult.h / 2))
      composites.push({ input: safeGenreBadgeResult.png, top: badgeY, left: Math.round((STD_W - safeGenreBadgeResult.w) / 2) })
    }
  }
  if (safeRankBadgeResult) {
    const isBar = rankingBadgeStyle === "bar"
    const isNetflix = rankingBadgeStyle === "netflix"
    composites.push({
      input: safeRankBadgeResult.png,
      top: 0,
      left: (isBar || isNetflix) ? 0 : Math.round((STD_W - safeRankBadgeResult.w) / 2),
    })
  }
  if (networkLogoResult) {
    const isNetflixRank = safeRankBadgeResult && rankingBadgeStyle === "netflix"
    composites.push({
      input: networkLogoResult.png,
      top: 15,
      left: isNetflixRank ? Math.round(safeRankBadgeResult!.w + 10) : 23,
    })
  }

  // -----------------------------------------------------------------------
  // 7. Final composite
  // -----------------------------------------------------------------------
  const safeComposites = (await Promise.all(composites.map((layer) => fitCompositeToCanvas(layer, STD_W, STD_H))))
    .filter((layer): layer is PosterComposite => layer !== null)
  const compositedBase = await renderCompositeLayers(renderBaseBuf, safeComposites, STD_W, STD_H)

  return await sharp(compositedBase)
    .jpeg({ quality: 70 })
    .toBuffer()
}
