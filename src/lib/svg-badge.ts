import fs from "fs"
import path from "path"
import { textColorForBg } from "./accent-color"
import { estimateTextWidth, genreBadgeSafePad, genreBadgeSvgDims, genrePillMaxW, buildGenreBarSvg, buildGenrePillSvg, buildGenreTextSvg, buildGenreBorderedSvg, buildGenreGlassSvg, buildRankingBarSvg, buildRankingDefaultSvg, buildRankingPillSvg, buildExtraBarSvg, buildExtraDefaultSvg, buildExtraPillSvg, buildExtraGlassSvg } from "./badge-svg-shared"
import type { GenreParts } from "./badge-svg-shared"
import type { BadgeStyle, RankingBadgeStyle, ExtraBadgeStyle } from "./badge-styles"
import { getBadgeFont, DEFAULT_BADGE_FONT } from "./badge-fonts"

const FONT_SYMBOLS = path.join(/* turbopackIgnore: true */ process.cwd(), "src", "assets", "fonts", "NotoSansSymbols2-Regular.ttf")

function badgeFontFilePath(fontKey: string, file: string): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "src", "assets", "fonts", file)
}

// Cache per file TTF (path → Buffer/base64), caricati lazy.
const fontBuffers = new Map<string, Buffer>()
const fontB64Cache = new Map<string, string>()

function readFontBuffer(file: string): Buffer {
  let b = fontBuffers.get(file)
  if (!b) {
    b = fs.readFileSync(file)
    fontBuffers.set(file, b)
  }
  return b
}

function readFontB64(file: string): string {
  let s = fontB64Cache.get(file)
  if (!s) {
    s = readFontBuffer(file).toString("base64")
    fontB64Cache.set(file, s)
  }
  return s
}

let _fontsWarmed = false

export function warmFonts(): void {
  if (_fontsWarmed) return
  // Preriscalda il font di default + i simboli (stella) nel primo render.
  for (const f of getBadgeFont(DEFAULT_BADGE_FONT).files) {
    readFontBuffer(badgeFontFilePath(DEFAULT_BADGE_FONT, f.file))
  }
  readFontBuffer(FONT_SYMBOLS)
  _fontsWarmed = true
}

let _cachedStyle: string | null = null
function fontStyle(fontKey: string): string {
  const font = getBadgeFont(fontKey)
  if (fontKey === DEFAULT_BADGE_FONT && _cachedStyle) return _cachedStyle
  const faces = font.files
    .map((f) => `@font-face{font-family:'${font.family}';src:url(data:font/ttf;base64,${readFontB64(badgeFontFilePath(fontKey, f.file))});font-weight:${f.weight};font-style:normal}`)
    .join("")
  const style = `<style>${faces}@font-face{font-family:'Noto Sans Symbols 2';src:url(data:font/ttf;base64,${readFontB64(FONT_SYMBOLS)});font-weight:400;font-style:normal}</style>`
  if (fontKey === DEFAULT_BADGE_FONT) _cachedStyle = style
  return style
}

function wrapSvg(svg: string, fontKey: string = DEFAULT_BADGE_FONT): string {
  const font = getBadgeFont(fontKey)
  const style = fontStyle(fontKey)
  // Sostituisce la family hardcoded "Inter" con quella selezionata
  // (no-op per il font di default → output byte-identico al passato).
  const out = fontKey === DEFAULT_BADGE_FONT ? svg : svg.replaceAll(`font-family="Inter"`, `font-family="${font.family}"`)
  if (out.includes("</defs>")) {
    return out.replace("</defs>", `${style}</defs>`)
  }
  // SVG senza <defs> (es. Netflix badge): inserisci font-style prima di </svg>
  if (out.includes("</svg>")) {
    return out.replace("</svg>", `${style}</svg>`)
  }
  return out.replace(/<svg /, `<svg >${style}`)
}

export async function renderSVG(svgStr: string, w: number, fontKey: string = DEFAULT_BADGE_FONT): Promise<Buffer> {
  const { Resvg } = await import("@resvg/resvg-js")
  const fontFiles = [
    ...getBadgeFont(fontKey).files.map((f) => badgeFontFilePath(fontKey, f.file)),
    FONT_SYMBOLS,
  ]
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "width", value: w },
    font: {
      fontFiles,
      loadSystemFonts: false,
    },
  })
  return Buffer.from(resvg.render().asPng())
}

// --- Extra badge (custom text) ---

export async function buildExtraBadgeSVG(
  label: string,
  pw: number,
  topLight?: boolean,
  badgeStyle?: ExtraBadgeStyle,
  accentColor?: string,
  fontKey: string = DEFAULT_BADGE_FONT,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = badgeStyle || "default"
  const maxBadgeW = pw - 20
  let finalFs = 23 * pw / 380 / getBadgeFont(fontKey).widthFactor
  const projectedW = estimateTextWidth(label, finalFs) + Math.round(finalFs * 2) + Math.round(finalFs * 0.6) * 2
  if (projectedW > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / projectedW * finalFs, 10)
  }

  const fs = Math.round(finalFs)
  const isColored = s === "colored"
  const isGlass = s === "vetro"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)")
  const fg = isColored
    ? textColorForBg(accentColor || "")
    : isGlass
      ? (topLight ? "rgba(0,0,0,0.80)" : "#ffffff")
      : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  let result: { svg: string; w: number; h: number }
  if (s === "bar") {
    result = buildExtraBarSvg(label, pw, fs, fg, bg)
  } else if (s === "pill") {
    result = buildExtraPillSvg(label, fs, fg, bg)
  } else if (isGlass) {
    result = buildExtraGlassSvg(label, fs, fg, bg, !!topLight)
  } else {
    result = buildExtraDefaultSvg(label, fs, fg, bg)
  }
  const png = await renderSVG(wrapSvg(result.svg, fontKey), result.w, fontKey)
  return { png, w: result.w, h: result.h }
}

// --- Genre badge ---

export async function buildGenreBadgeSVG(
  genreName: string, voteAverage: number, pw: number,
  year?: string, style?: BadgeStyle, accentColor?: string, topLight?: boolean, parts?: GenreParts,
  fontKey: string = DEFAULT_BADGE_FONT,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = style || "shadow"
  const voteStr = voteAverage ? voteAverage.toFixed(1) : ""
  const yearStr = year || ""

  let finalFs = 24 * pw / 380 / getBadgeFont(fontKey).widthFactor
  const aestheticMaxW = Math.round(pw * 0.86) // 86% per margine estetico
  let dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr, parts)
  let safePad = genreBadgeSafePad(finalFs)
  // Per shadow, buildGenreTextSvg aggiunge shadowPad*2 al renderW finale
  const extraShadowPad = style === "shadow" ? 8 : 0
  const estimatedRenderW = dims.totalW + safePad * 2 + extraShadowPad * 2
  if (estimatedRenderW > aestheticMaxW) {
    finalFs = Math.max(aestheticMaxW / estimatedRenderW * finalFs, 10)
    dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr, parts)
    safePad = genreBadgeSafePad(finalFs)
  }

  const isPillStyle = s === "pill" || s === "colored"
  if (isPillStyle) {
    const _pillPad = Math.round(finalFs * 0.35)
    const maxPillW = genrePillMaxW(pw)
    if (dims.textContentW + _pillPad * 3 + safePad * 2 > maxPillW) {
      finalFs = Math.max(maxPillW / (dims.textContentW + _pillPad * 3 + safePad * 2) * finalFs, 10)
      dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr, parts)
    }
  }
  let fs = Math.round(finalFs)
  const isPill = s === "pill" || s === "colored"
  const isBar = s === "bar"

  const textColor = s === "colored"
    ? textColorForBg(accentColor || "")
    : (isPill ? "rgba(0,0,0,0.80)" : "#e5e7eb")
  const bgColor = s === "colored"
    ? (accentColor && accentColor !== "#555555" ? accentColor : "rgba(255,255,255,0.80)")
    : (isPill ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  let result: { svg: string; w: number; h: number }
  if (s === "bordo") {
    result = buildGenreBorderedSvg(genreName, voteStr, yearStr, fs, textColor, topLight ?? false, 0, parts)
  } else if (s === "vetro") {
    result = buildGenreGlassSvg(genreName, voteStr, yearStr, fs, textColor, topLight ?? false, 0, parts)
  } else if (isBar) {
    result = buildGenreBarSvg(genreName, voteStr, yearStr, pw, fs, "rgba(0,0,0,0.80)", !!topLight, 0, parts)
  } else if (isPill) {
    result = buildGenrePillSvg(genreName, voteStr, yearStr, fs, bgColor, textColor, 0, parts)
  } else {
    result = buildGenreTextSvg(genreName, voteStr, yearStr, fs, textColor, s, 0, parts)
    // Per shadow, il renderW include shadowPad*2 + safePad*2 aggiuntivi
    // Assicuriamoci che non superi aestheticMaxW
    let attempts = 0
    while (result.w > aestheticMaxW && attempts < 30) {
      // Riduciamo fs proporzionalmente al surplus
      const targetFs = Math.max(Math.round(fs * (aestheticMaxW - 16) / result.w), 10)
      if (targetFs >= fs) { fs = 10 } else { fs = targetFs }
      result = buildGenreTextSvg(genreName, voteStr, yearStr, fs, textColor, s, 0, parts)
      attempts++
    }
  }
  const png = await renderSVG(wrapSvg(result.svg, fontKey), result.w, fontKey)
  return { png, w: result.w, h: result.h }
}

export async function renderGenreBadge(
  genreName: string, voteAverage: number, pw: number,
  year?: string, style?: BadgeStyle, accentColor?: string, topLight?: boolean, parts?: GenreParts,
  fontKey: string = DEFAULT_BADGE_FONT,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildGenreBadgeSVG(genreName, voteAverage, pw, year, style, accentColor, topLight, parts, fontKey)
  if (r) return r
  throw new Error(`SVG genre badge failed: ${genreName}`)
}

// --- Ranking badge ---

export function buildNetflixRankBadgeSVG(rank: number, pw: number, topLight: boolean, side: "left" | "right" = "left", isAnime?: boolean, fontKey: string = DEFAULT_BADGE_FONT) {
  const fs = Math.round(Math.max(23 * pw / 380, 14) / getBadgeFont(fontKey).widthFactor)
  const w = Math.round(fs * 2.6)
  // Anime: nastro allungato verso il basso (h × 1.55) per dare spazio alla scritta "anime".
  const h = Math.round(w * (isAnime ? 1.55 : 1.35))
  const slant = Math.round(w * 0.12)
  const topFs = Math.round(w * 0.28)
  const rankFs = Math.round(w * 0.54)
  const padRight = Math.round(fs * 0.4)
  const padBottom = Math.round(fs * 0.4)
  const totalW = w + padRight
  const totalH = h + padBottom
  // Anime: "anime" sotto il numero (solo per ranking anime). Con il nastro più
  // alto, numero e "anime" restano sopra la V-notch del bordo inferiore.
  const animeFs = Math.round(w * 0.20)
  const animePadBottom = isAnime ? Math.round(animeFs * 0.6) : 0
  const totalHAnime = totalH + animePadBottom
  // Anime: TOP, numero e "anime" impilati con la stessa distanza visiva.
  // Il gap è proporzionale al font più piccolo (topFs/animeFs), così la
  // spaziatura resta uniforme a ogni scala. Non-anime: posizioni invariate.
  const topY = isAnime ? Math.round(h * 0.22) : Math.round(h * 0.28)
  const textGap = isAnime ? Math.round(Math.min(topFs, animeFs) * 0.2) : 0
  const rankY = isAnime
    ? topY + Math.round(topFs / 2) + textGap + Math.round(rankFs / 2)
    : Math.round(h * 0.60)
  const animeY = isAnime
    ? rankY + Math.round(rankFs / 2) + textGap + Math.round(animeFs / 2)
    : 0

  // Stessa logica adattiva degli altri badge ranking (tlBg/tlFg):
  // top chiaro → nastro scuro con testo chiaro; top scuro → nastro chiaro con testo nero.
  const fill = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const textColor = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"

  const ribbonMidX = w / 2
  const ribbonVNotchY = Math.round(h * 0.88)

  // Nastro top-left (side="left", default): ancorato al bordo sinistro del poster,
  // lato sinistro dritto e destro inclinato. Modalità Stremio (side="right"): nastro
  // specchiato orizzontalmente, ancorato al bordo destro — lato destro dritto e
  // sinistro inclinato, con il pad (ombra) spostato a sinistra e ombra che cade a sinistra.
  const isRight = side === "right"
  const pathD = isRight
    ? `M ${totalW} 0 L ${padRight} 0 L ${padRight + slant} ${h} L ${totalW - ribbonMidX} ${ribbonVNotchY} L ${totalW} ${h} Z`
    : `M 0 0 L ${w} 0 L ${w - slant} ${h} L ${ribbonMidX} ${ribbonVNotchY} L 0 ${h} Z`
  const highlightX1 = isRight ? padRight : 0
  const highlightX2 = isRight ? totalW : w
  const textX = isRight ? totalW - ribbonMidX : ribbonMidX
  const shadowDx = isRight ? -3 : 3

  const animeEl = isAnime
    ? `<text x="${textX}" y="${animeY}" fill="${textColor}" font-family="Inter" font-weight="600" font-size="${animeFs}" text-anchor="middle" dominant-baseline="central" letter-spacing="0.5" filter="url(#textShadow)">anime</text>`
    : ""
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalHAnime}" viewBox="0 0 ${totalW} ${totalHAnime}">
    <defs>
      <filter id="shadow3D" x="-20%" y="-20%" width="180%" height="180%">
        <feDropShadow dx="${shadowDx}" dy="3" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.65"/>
      </filter>
      <filter id="textShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="${shadowDx > 0 ? 0 : -1.5}" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.65"/>
      </filter>
    </defs>
    <path d="${pathD}" fill="${fill}" filter="url(#shadow3D)"/>
    <line x1="${highlightX1}" y1="1" x2="${highlightX2}" y2="1" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
    <text x="${textX}" y="${topY}" fill="${textColor}" font-family="Inter" font-weight="800" font-size="${topFs}" text-anchor="middle" dominant-baseline="central" letter-spacing="0.5" filter="url(#textShadow)">TOP</text>
    <text x="${textX}" y="${rankY}" fill="${textColor}" font-family="Inter" font-weight="900" font-size="${rankFs}" text-anchor="middle" dominant-baseline="central" filter="url(#textShadow)">${rank}</text>
    ${animeEl}
  </svg>`
  return { svg, w: totalW, h: totalHAnime }
}

export async function buildRankingBadgeSVG(
  rank: number,
  pw: number,
  label?: string,
  topLight?: boolean,
  badgeStyle?: RankingBadgeStyle,
  accentColor?: string,
  side?: "left" | "right",
  isAnime?: boolean,
  fontKey: string = DEFAULT_BADGE_FONT,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = badgeStyle || "default"
  const periodText = label || "Oggi"
  const fullText = `#${rank} ${periodText}`
  const maxBadgeW = pw - 20
  let finalFs = 23 * pw / 380 / getBadgeFont(fontKey).widthFactor
  const projectedW = estimateTextWidth(fullText, finalFs) + Math.round(finalFs * 2) + Math.round(finalFs * 0.6) * 2
  if (projectedW > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / projectedW * finalFs, 10)
  }

  const fs = Math.round(finalFs)
  const isColored = s === "colored"
  const isNetflix = s === "netflix"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)")
  const fg = isColored
    ? textColorForBg(accentColor || "")
    : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  let result: { svg: string; w: number; h: number }
  if (isNetflix) {
    result = buildNetflixRankBadgeSVG(rank, pw, !!topLight, side, isAnime, fontKey)
  } else if (s === "bar") {
    result = buildRankingBarSvg(fullText, pw, fs, fg, bg)
  } else if (s === "pill") {
    result = buildRankingPillSvg(fullText, fs, fg, bg)
  } else {
    result = buildRankingDefaultSvg(fullText, fs, fg, bg)
  }
  const png = await renderSVG(wrapSvg(result.svg, fontKey), result.w, fontKey)
  return { png, w: result.w, h: result.h }
}

export async function renderRankingBadge(
  rank: number, pw: number, label?: string,
  topLight?: boolean, badgeStyle?: RankingBadgeStyle, accentColor?: string, side?: "left" | "right", isAnime?: boolean,
  fontKey: string = DEFAULT_BADGE_FONT,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildRankingBadgeSVG(rank, pw, label, topLight, badgeStyle, accentColor, side, isAnime, fontKey)
  if (r) return r
  throw new Error(`SVG ranking badge failed: rank=${rank}`)
}

export async function renderExtraBadge(
  label: string, pw: number, topLight?: boolean,
  badgeStyle?: ExtraBadgeStyle, accentColor?: string,
  fontKey: string = DEFAULT_BADGE_FONT,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildExtraBadgeSVG(label, pw, topLight, badgeStyle, accentColor, fontKey)
  if (r) return r
  throw new Error(`SVG extra badge failed: ${label}`)
}
