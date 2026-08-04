import sharp from "sharp"
import { cacheGet, cacheSet } from "./cache"
import { GENRE_FALLBACK, cinematicVignetteSVG } from "./badges"
import { applyBlur } from "./blur"
import {
  STD_W, STD_H,
  extractBadgeColor,
  fitBadgeToCanvas,
  fitCompositeToCanvas,
  isValidHex,
  PosterComposite,
} from "./poster-render-helpers"
import { renderGenreBadge, renderRankingBadge, renderExtraBadge, renderWatchlistBadge } from "./svg-badge"
import { renderFirstMatchingNetworkLogoBadge } from "./network-svgs"
import { computeLogoLayout } from "./logo-layout"
import { computeTopBadge, isNetworkStudio, type BadgeInput } from "./poster-badge"
import type { Mapping } from "./types"
import type { ServerDefaults } from "./server-defaults"
import type { WikidataResult } from "./awards"
import type { BadgeT } from "./poster-badge"
import type { BadgeStyle, RankingBadgeStyle } from "./badge-styles"

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
  /** Badge "Da guardare": l'utente connesso ha il titolo nella watchlist Trakt/Simkl. */
  watchlistBadge: boolean
  genreName: string | null
  voteAverage: number | null
  badgeStyle: BadgeStyle
  rankingBadgeStyle: RankingBadgeStyle
  topLight: boolean
  targetCenter: number
  /** Modalità layout nastro Netflix + logo network: "left" (Nuvio, default) o "right" (Stremio). */
  ribbonSide: "left" | "right"

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
  /** Pre-resolved IMDb Top 250 membership. Falls back gracefully when falsy. */
  imdbTop250?: boolean
}

// ---- Vignette SVG cache (constant, render once) ----
let _vignettePng: Buffer | null = null
async function getVignette(): Promise<Buffer> {
  if (!_vignettePng) {
    _vignettePng = await sharp(Buffer.from(cinematicVignetteSVG(STD_W, STD_H))).png().toBuffer()
  }
  return _vignettePng
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
    badgesEnabled, rankingEnabled, watchlistBadge, genreName, voteAverage, badgeStyle,
    rankingBadgeStyle, topLight, targetCenter, ribbonSide,
    logoScale, logoOffsetX, logoOffsetY,
    mediaType, finalRank, animeRankResult,
    mapping, tmdbNetworks, productionCompanies, tmdbStudios,
    tvType, tvStatus, releaseDate, firstAirDate,
    wikidataResult, tmdbKeywords, locale, t,
    qLabel, queryExtra, qNetLogo, sd, accentOverride, imdbTop250,
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
          const resized = await sharp(logoFetch).resize(layout.width, layout.height, { fit: "inside" }).png({ compressionLevel: 1 }).toBuffer()
          const rMeta = await sharp(resized).metadata()
          const aW = rMeta.width || layout.width
          const aH = rMeta.height || layout.height
          return { input: resized, top: Math.max(0, Math.round(layout.top + (layout.height - aH))), left: Math.round(layout.left + ((layout.width - aW) / 2)), w: aW, h: aH } as const
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

  const vigBuf = await getVignette()
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
    studios: wikidataResult.studios,
    director: wikidataResult.director,
    tvType: tvType ?? null,
    tvStatus,
    keywords: [...tmdbKeywords],
    imdbTop250: !!imdbTop250,
  }
  const computed = computeTopBadge(badgeInput, t, locale)
  const studioBadge = computed.studioBadge
  const isNetStudio = isNetworkStudio(studioBadge)

  let topBadge: { type: "extra"; label: string } | { type: "rank"; rank: number; label: string } | { type: "watchlist"; label: string } | null = null
  if (watchlistBadge) {
    topBadge = { type: "watchlist" as const, label: t("badge.watchlist") }
  } else if (rankingEnabled) {
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
  // Anime ranking: il badge anime mostra il numero grande con "anime" sotto.
  // Rilevato quando il topBadge è un rank derivato da animeRankResult.
  const isAnimeRank = topBadge !== null && topBadge.type === "rank" && animeRankResult !== null && topBadge.rank === animeRankResult

  const genreBadgeKey = (badgesEnabled && genreName && voteAverage && voteAverage > 0)
    ? badgeCacheKey("genre", genreName, voteAverage, STD_W, year, badgeStyle, accentColorGenre, topLight)
    : null
  const rankBadgeKey = topBadge
    ? badgeCacheKey("rank", topBadge.type === "extra" ? topBadge.label : topBadge.type === "watchlist" ? `wl:${topBadge.label}` : `${topBadge.rank}:${topBadge.label}`, STD_W, topLight, rankingBadgeStyle, accentColorRank, ribbonSide, isAnimeRank)
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
              } else if (topBadge!.type === "watchlist") {
                p = renderWatchlistBadge(topBadge!.label, STD_W)
                  .then((r) => { const v = { ...r, isRank: false }; cacheSet(rankBadgeKey, v, ["badge"], BADGE_CACHE_TTL); return v })
                  .catch(() => null)
              } else {
                p = renderRankingBadge(topBadge!.rank!, STD_W, topBadge!.label, topLight, rankingBadgeStyle, accentColorRank, ribbonSide, isAnimeRank)
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
  const isRightRibbon = ribbonSide === "right"
  if (safeRankBadgeResult) {
    const isBar = rankingBadgeStyle === "bar"
    const isNetflix = rankingBadgeStyle === "netflix"
    let left: number
    if (isBar) {
      left = 0 // bar full-width: resta ancorata a sinistra
    } else if (isNetflix && isRightRibbon) {
      left = Math.round(STD_W - safeRankBadgeResult.w) // nastro Netflix a destra (Stremio)
    } else if (isNetflix) {
      left = 0 // nastro Netflix a sinistra (Nuvio, default)
    } else {
      left = Math.round((STD_W - safeRankBadgeResult.w) / 2)
    }
    composites.push({
      input: safeRankBadgeResult.png,
      top: 0,
      left,
    })
  }
  if (networkLogoResult) {
    const isNetflixRank = safeRankBadgeResult && rankingBadgeStyle === "netflix"
    let left: number
    if (isRightRibbon) {
      // Stremio: logo network ancorato a destra, a sinistra del nastro quando presente
      left = isNetflixRank
        ? Math.round(STD_W - safeRankBadgeResult!.w - 10 - networkLogoResult.w)
        : Math.round(STD_W - 23 - networkLogoResult.w)
    } else {
      left = isNetflixRank ? Math.round(safeRankBadgeResult!.w + 10) : 23
    }
    composites.push({
      input: networkLogoResult.png,
      top: 15,
      left,
    })
  }

  // -----------------------------------------------------------------------
  // 7. Final composite
  // -----------------------------------------------------------------------
  const safeComposites = (await Promise.all(composites.map((layer) => fitCompositeToCanvas(layer, STD_W, STD_H))))
    .filter((layer): layer is PosterComposite => layer !== null)

  return await sharp(renderBaseBuf)
    .composite(safeComposites)
    .jpeg({ quality: 70 })
    .toBuffer()
}
