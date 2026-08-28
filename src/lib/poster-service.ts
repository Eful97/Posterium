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
import { renderGenreBadge, renderRankingBadge, renderExtraBadge } from "./svg-badge"
import { renderFirstMatchingNetworkLogoBadge } from "./network-svgs"
import { computeLogoLayout } from "./logo-layout"
import { computeTopBadge, isNetworkStudio, type BadgeInput } from "./poster-badge"
import type { Mapping } from "./types"
import type { ServerDefaults } from "./server-defaults"
import type { WikidataResult } from "./awards"
import type { BadgeT } from "./poster-badge"
import type { BadgeStyle, RankingBadgeStyle } from "./badge-styles"
import type { PosterImageFormat } from "@/lib/poster-runtime-cache"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const BADGE_CACHE_TTL = 24 * 60 * 60 * 1000

// TTL cache image-level (colori badge, resize logo/backdrop): le immagini TMDB
// sono immutabili per path → 24h come la badge cache. Le entry si auto-espellono
// col byte/entry limit della cache globale (tag "poster-extract").
const IMAGE_CACHE_TTL = 24 * 60 * 60 * 1000
const IMAGE_CACHE_TAG = "poster-extract"

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
  badgeStyle: BadgeStyle
  rankingBadgeStyle: RankingBadgeStyle
  /** Quali componenti del badge genere/rating mostrare (default tutti ON). */
  badgeGenre: boolean
  badgeYear: boolean
  badgeRating: boolean
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
  /** Path sorgente del poster (cache image-level). Assente → niente cache. */
  posterSrc?: string | null
  /** Formato di output negoziazione Accept (jpeg | webp | avif). Default: jpeg. */
  format?: PosterImageFormat
  /** Path sorgente del logo (cache image-level). Assente → niente cache. */
  logoSrc?: string | null
  /** Path sorgente del backdrop (cache image-level). Assente → niente cache. */
  backdropSrc?: string | null
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
  // Fix L1: i segmenti stringa vengono escapati — una label utente con ":" 
  // (es. customBadge "Top:10") prima produceva chiavi ambigue collidenti con
  // i campi successivi (segmenti di lunghezza variabile separati da ":").
  return `badge:${type}:${parts.map(p => typeof p === "number" ? Math.round(p * 10) / 10 : (typeof p === "string" ? encodeURIComponent(p) : (p ?? "x"))).join(":")}`
}

const badgeInflight = new Map<string, Promise<unknown>>()
// Fix L2: timeout difensivo sulle promise badge in-flight — un render badge
// che non si assesta (sharp appeso, bug) non deve bloccare PER SEMPRE le
// richieste future sulla stessa chiave. Dopo il timeout la chiave viene
// liberata e il prossimo render riparte da zero (l'eventuale completamento
// tardivo popola comunque la cache condivisa).
const BADGE_INFLIGHT_TIMEOUT_MS = 20_000

function coalesceBadgeRender<T>(key: string, run: () => Promise<T>): Promise<T | null> {
  const existing = badgeInflight.get(key) as Promise<T | null> | undefined
  if (existing) return existing
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), BADGE_INFLIGHT_TIMEOUT_MS)
    if (typeof timer.unref === "function") timer.unref()
  })
  const promise: Promise<T | null> = Promise.race([
    run().catch(() => null),
    timeoutPromise,
  ]).finally(() => {
    if (timer) clearTimeout(timer)
    if (badgeInflight.get(key) === promise) badgeInflight.delete(key)
  })
  badgeInflight.set(key, promise)
  return promise
}

// ---------------------------------------------------------------------------
// Image-level caches (colori badge, resize logo/backdrop)
// ---------------------------------------------------------------------------
// Questi passaggi sharp si ripetono a OGNI render freddo, anche per lo stesso
// titolo: cache key poster diverse (config token, rank che cambia, preview
// WYSIWYG, versioni mapping) condividono lo stesso poster/logo/backdrop. Il
// risultato dipende solo dall'immagine sorgente (URL TMDB immutabili per path)
// → si può cachare per path. Nessun cambio dell'output visivo: stesse operazioni
// sharp, stesso ordine, stessi parametri — solo eseguite una volta.

export interface BadgeColorsResult {
  readonly genreColor: string
  readonly rankColor: string
}

/** Colori accent (genere + rank) con cache per (posterSrc, logoSrc, genreName). */
export async function resolveBadgeColors(
  posterBuf: Buffer,
  logoFetch: Buffer | null,
  genreName: string | null,
  posterSrc?: string | null,
  logoSrc?: string | null,
): Promise<BadgeColorsResult> {
  const key = posterSrc ? `extract:${posterSrc}:${logoSrc ?? "x"}:${genreName ?? "x"}` : null
  const cached = key ? cacheGet<BadgeColorsResult>(key) : null
  if (cached) return cached
  const [gColor, rColor] = await Promise.all([
    extractBadgeColor(posterBuf, logoFetch, genreName, 'bottom'),
    extractBadgeColor(posterBuf, logoFetch, null, 'top'),
  ])
  const colors: BadgeColorsResult = {
    genreColor: isValidHex(gColor) ? gColor : (genreName ? GENRE_FALLBACK[genreName] : undefined) || "#555555",
    rankColor: isValidHex(rColor) ? rColor : "#555555",
  }
  if (key) cacheSet(key, colors, [IMAGE_CACHE_TAG], IMAGE_CACHE_TTL)
  return colors
}

export interface ResizedImage {
  readonly input: Buffer
  readonly w: number
  readonly h: number
}

/** Resize logo (con re-encode PNG) cachato per (logoSrc, dimensioni target). */
export async function resizeLogoCached(
  logoFetch: Buffer,
  width: number,
  height: number,
  logoSrc?: string | null,
): Promise<ResizedImage> {
  const key = logoSrc ? `logo-resize:${logoSrc}:${width}:${height}` : null
  const cached = key ? cacheGet<ResizedImage>(key) : null
  if (cached) return cached
  const resized = await sharp(logoFetch).resize(width, height, { fit: "inside" }).png({ compressionLevel: 1 }).toBuffer()
  const rMeta = await sharp(resized).metadata()
  const result: ResizedImage = { input: resized, w: rMeta.width || width, h: rMeta.height || height }
  if (key) cacheSet(key, result, [IMAGE_CACHE_TAG], IMAGE_CACHE_TTL)
  return result
}

/** Dimensioni originali del backdrop, cachate per src (salta il metadata() ripetuto). */
export async function backdropMetaCached(
  backdropFetch: Buffer,
  backdropSrc?: string | null,
): Promise<{ readonly width: number; readonly height: number }> {
  const key = backdropSrc ? `backdrop-meta:${backdropSrc}` : null
  const cached = key ? cacheGet<{ width: number; height: number }>(key) : null
  if (cached) return cached
  const meta = await sharp(backdropFetch).metadata()
  const result = { width: meta.width || 1920, height: meta.height || 1080 }
  if (key) cacheSet(key, result, [IMAGE_CACHE_TAG], IMAGE_CACHE_TTL)
  return result
}

/** Resize backdrop cachato per (backdropSrc, dimensioni target). */
export async function resizeBackdropCached(
  backdropFetch: Buffer,
  width: number,
  height: number,
  backdropSrc?: string | null,
): Promise<ResizedImage> {
  const key = backdropSrc ? `backdrop-resize:${backdropSrc}:${width}:${height}` : null
  const cached = key ? cacheGet<ResizedImage>(key) : null
  if (cached) return cached
  const resized = await sharp(backdropFetch).resize(width, height, { fit: 'fill' }).toBuffer()
  const result: ResizedImage = { input: resized, w: width, h: height }
  if (key) cacheSet(key, result, [IMAGE_CACHE_TAG], IMAGE_CACHE_TTL)
  return result
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function generatePosterBuffer(input: GenerationInput): Promise<Buffer> {
  const {
    posterBuf, logoFetch, backdropFetch,
    backdropScale, backdropOffsetX, backdropOffsetY,
    blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness,
    badgesEnabled, rankingEnabled, genreName, voteAverage, badgeStyle,
    rankingBadgeStyle, badgeGenre, badgeYear, badgeRating,
    topLight, targetCenter, ribbonSide,
    logoScale, logoOffsetX, logoOffsetY,
    mediaType, finalRank, animeRankResult,
    mapping, tmdbNetworks, productionCompanies, tmdbStudios,
    tvType, tvStatus, releaseDate, firstAirDate,
    wikidataResult, tmdbKeywords, locale, t,
    qLabel, queryExtra, qNetLogo, sd, accentOverride, imdbTop250,
    posterSrc, logoSrc, backdropSrc,
  } = input

  // -----------------------------------------------------------------------
  // 1. Backdrop composite layer
  // -----------------------------------------------------------------------
  const composites: PosterComposite[] = []

  if (backdropFetch) {
    const bMeta = await backdropMetaCached(backdropFetch, backdropSrc)
    const bw = bMeta.width
    const bh = bMeta.height
    const bScale = backdropScale / 100
    let bResizedW = Math.round(STD_W * bScale)
    let bResizedH = Math.round(bh * (bResizedW / bw))
    if (bResizedW > STD_W) { bResizedH = Math.round(bResizedH * (STD_W / bResizedW)); bResizedW = STD_W }
    if (bResizedH > STD_H) { bResizedW = Math.round(bResizedW * (STD_H / bResizedH)); bResizedH = STD_H }
    const bX = Math.round((STD_W - bResizedW) / 2 + backdropOffsetX)
    const bY = Math.round((STD_H - bResizedH) / 2 + backdropOffsetY)
    const backdropResized = await resizeBackdropCached(backdropFetch, bResizedW, bResizedH, backdropSrc)
    composites.push({ input: backdropResized.input, top: bY, left: bX })
  }

  // -----------------------------------------------------------------------
  // 2. Blur + badge colors + logo resize (parallel)
  // -----------------------------------------------------------------------
  const year = releaseDate?.slice(0, 4) || firstAirDate?.slice(0, 4) || undefined
  const genreAvailable = !!genreName
  const ratingAvailable = !!(voteAverage && voteAverage > 0)
  const yearAvailable = !!year
  // Il badge è visibile se almeno uno dei 3 componenti è abilitato E disponibile.
  const hasGenreBadge = badgesEnabled
    && ((genreAvailable && badgeGenre) || (ratingAvailable && badgeRating) || (yearAvailable && badgeYear))

  const [blurOverlay, badgeColors, logoResult] = await Promise.all([
    applyBlur({ posterBuf, blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness }),
    hasGenreBadge
      ? (accentOverride
          ? Promise.resolve(accentOverride)
          : resolveBadgeColors(posterBuf, logoFetch, genreName, posterSrc, logoSrc))
      : Promise.resolve(undefined),
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
            hasBadges: hasGenreBadge,
          })
          const resized = await resizeLogoCached(logoFetch, layout.width, layout.height, logoSrc)
          const aW = resized.w
          const aH = resized.h
          return { input: resized.input, top: Math.max(0, Math.round(layout.top + (layout.height - aH))), left: Math.round(layout.left + ((layout.width - aW) / 2)), w: aW, h: aH } as const
        })()
      : Promise.resolve(null),
  ])

  // -----------------------------------------------------------------------
  // 3. Vignette + logo (il blur resta un overlay grezzo, composto nel passo 7)
  // -----------------------------------------------------------------------
  const vigBuf = await getVignette()
  composites.push({ input: vigBuf, top: 0, left: 0 })
  if (logoResult) composites.push(logoResult)

  // -----------------------------------------------------------------------
  // 4. Badge computation
  // -----------------------------------------------------------------------
  const accentColorGenre = badgeColors?.genreColor || (GENRE_FALLBACK[genreName || ""] || "#555555")
  const accentColorRank = badgeColors?.rankColor || "#555555"

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
  // Anime ranking: il badge anime mostra il numero grande con "anime" sotto.
  // Rilevato quando il topBadge è un rank derivato da animeRankResult.
  const isAnimeRank = topBadge?.type === "rank" && animeRankResult !== null && topBadge.rank === animeRankResult

  const genreBadgeKey = hasGenreBadge
    ? badgeCacheKey("genre", genreName, voteAverage, STD_W, year, badgeStyle, accentColorGenre, topLight, badgeGenre, badgeYear, badgeRating)
    : null
  const rankBadgeKey = topBadge
    ? badgeCacheKey("rank", topBadge.type === "extra" ? topBadge.label : `${topBadge.rank}:${topBadge.label}`, STD_W, topLight, rankingBadgeStyle, accentColorRank, ribbonSide, isAnimeRank)
    : null

  const [genreBadgeResult, rankBadgeResult] = await Promise.all([
    genreBadgeKey
      ? (cacheGet<{ png: Buffer; w: number; h: number }>(genreBadgeKey)
          || coalesceBadgeRender(genreBadgeKey, () =>
              renderGenreBadge(genreName ?? "", voteAverage ?? 0, STD_W, year, badgeStyle, accentColorGenre, topLight, { showGenre: badgeGenre, showYear: badgeYear, showRating: badgeRating })
                .then((r) => { if (r) cacheSet(genreBadgeKey, r, ["badge"], BADGE_CACHE_TTL); return r })
            ))
      : Promise.resolve(null),
    rankBadgeKey
      ? (cacheGet<{ png: Buffer; w: number; h: number; isRank?: boolean }>(rankBadgeKey)
          || coalesceBadgeRender(rankBadgeKey, () => {
              if (topBadge!.type === "extra") {
                return renderExtraBadge(topBadge!.label, STD_W, topLight, rankingBadgeStyle, accentColorRank)
                  .then((r) => { const v = { ...r, isRank: false }; cacheSet(rankBadgeKey, v, ["badge"], BADGE_CACHE_TTL); return v })
              }
              return renderRankingBadge(topBadge!.rank!, STD_W, topBadge!.label, topLight, rankingBadgeStyle, accentColorRank, ribbonSide, isAnimeRank)
                .then((r) => { const v = { ...r, isRank: true }; cacheSet(rankBadgeKey, v, ["badge"], BADGE_CACHE_TTL); return v })
            }))
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
  let finalRankBadge = safeRankBadgeResult as { png: Buffer; w: number; h: number } | null
  let finalRankLeft: number | null = null
  if (safeRankBadgeResult) {
    const isBar = rankingBadgeStyle === "bar"
    // Il nastro Netflix è ancorato a sinistra SOLO quando il badge è davvero un
    // ranking "netflix" (type rank). Un badge personalizzato/extra va SEMPRE
    // centrato, anche se lo stile selezionato è "netflix": altrimenti esce
    // decentrato a sinistra.
    const isNetflixRibbon = rankingBadgeStyle === "netflix" && topBadge?.type === "rank"
    let left: number
    if (isBar) {
      left = 0 // bar full-width: resta ancorata a sinistra
    } else if (isNetflixRibbon && isRightRibbon) {
      left = Math.round(STD_W - safeRankBadgeResult.w) // nastro Netflix a destra (Stremio)
    } else if (isNetflixRibbon) {
      left = 0 // nastro Netflix a sinistra (Nuvio, default)
    } else {
      left = Math.round((STD_W - safeRankBadgeResult.w) / 2)
    }
    // Se badge extra + logo network si toccano, rimpicciolisci il badge finché non si toccano più
    if (networkLogoResult && topBadge?.type === "extra" && !isBar) {
      const logoLeft = isRightRibbon
        ? Math.round(STD_W - 23 - networkLogoResult.w)
        : 23
      const logoRight = logoLeft + networkLogoResult.w
      const logoTop = 15
      const logoBottom = logoTop + networkLogoResult.h
      let curW = safeRankBadgeResult.w
      let curH = safeRankBadgeResult.h
      let curLeft = left
      let curPng = safeRankBadgeResult.png
      const minScale = 0.6
      // bounding box badge: top 0
      const badgeTop = 0
      const badgeBottom = curH
      let scale = 1
      while (scale > minScale) {
        const badgeLeft = curLeft
        const badgeRight = curLeft + curW
        const overlapX = badgeLeft < logoRight + 6 && badgeRight > logoLeft - 6
        const overlapY = badgeTop < logoBottom + 4 && badgeBottom > logoTop - 4
        if (!overlapX || !overlapY) break
        scale -= 0.07
        if (scale < minScale) scale = minScale
        const newW = Math.max(1, Math.round(safeRankBadgeResult.w * scale))
        const newH = Math.max(1, Math.round(safeRankBadgeResult.h * scale))
        // evita loop infinito se dimensioni non cambiano
        if (newW === curW && newH === curH) break
        curW = newW
        curH = newH
        curPng = await sharp(safeRankBadgeResult.png).resize(newW, newH).toBuffer()
        curLeft = Math.round((STD_W - curW) / 2)
        // se ancora overlap ma già a scala minima, sposta a destra invece di stringere oltre
        if (scale <= minScale) {
          const badgeLeft2 = curLeft
          const badgeRight2 = curLeft + curW
          const stillOverlapX = badgeLeft2 < logoRight + 6 && badgeRight2 > logoLeft - 6
          if (stillOverlapX) {
            curLeft = isRightRibbon ? 23 : Math.round(STD_W - curW - 23)
          }
          break
        }
      }
      finalRankBadge = { png: curPng, w: curW, h: curH }
      finalRankLeft = curLeft
    } else {
      finalRankBadge = safeRankBadgeResult
      finalRankLeft = left
    }
  }
  if (finalRankBadge && finalRankLeft !== null) {
    composites.push({
      input: finalRankBadge.png,
      top: 0,
      left: finalRankLeft,
    })
  }
  if (networkLogoResult) {
    const isNetflixRank = finalRankBadge && rankingBadgeStyle === "netflix" && topBadge?.type === "rank"
    let left: number
    if (isRightRibbon) {
      // Stremio: logo network ancorato a destra, a sinistra del nastro quando presente
      left = isNetflixRank
        ? Math.round(STD_W - finalRankBadge!.w - 10 - networkLogoResult.w)
        : Math.round(STD_W - 23 - networkLogoResult.w)
    } else {
      left = isNetflixRank ? Math.round(finalRankBadge!.w + 10) : 23
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

  // Il blur è un overlay RGBA grezzo (nessun PNG intermedio): entra come primo
  // layer, sotto backdrop/vignetta/badge — stesso ordine del vecchio blur "cotto"
  // nella base. Il modulate sulla base (posterBuf) vive nella stessa pipeline del
  // composite finale → 1 decode + 1 encode totali invece del roundtrip PNG
  // blur→modulate (che ri-decodava il PNG del blur a ogni render).
  const layers: Array<PosterComposite | { input: Buffer; raw: { width: number; height: number; channels: 4 }; top: number; left: number }> = blurOverlay
    ? [{ input: blurOverlay.overlay, raw: { width: STD_W, height: blurOverlay.height, channels: 4 }, top: blurOverlay.top, left: 0 }, ...safeComposites]
    : safeComposites

  const pipeline = sharp(posterBuf)
    .modulate({ brightness: 1.01, saturation: 1.06 })
    .composite(layers)

  if (input.format === "avif") {
    return await pipeline.avif({ quality: 75, effort: 2 }).toBuffer()
  }
  if (input.format === "webp") {
    return await pipeline.webp({ quality: 80, effort: 2 }).toBuffer()
  }
  return await pipeline.jpeg({ quality: 70 }).toBuffer()
}
