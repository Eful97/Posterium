import { Resvg } from "@resvg/resvg-js"
import fs from "fs"
import path from "path"
import { textColorForBg } from "./accent-color"
import { estimateTextWidth, genreBadgeSafePad, genreBadgeSvgDims, genrePillMaxW, buildGenreBarSvg, buildGenrePillSvg, buildGenreTextSvg, buildGenreBorderedSvg, buildGenreGlassSvg, buildRankingBarSvg, buildRankingDefaultSvg, buildRankingPillSvg, buildExtraBarSvg, buildExtraDefaultSvg, buildExtraPillSvg, buildExtraGlassSvg } from "./badge-svg-shared"

const FONT_REGULAR = path.join(/* turbopackIgnore: true */ process.cwd(), "src", "assets", "fonts", "Inter-Regular.ttf")
const FONT_BOLD = path.join(/* turbopackIgnore: true */ process.cwd(), "src", "assets", "fonts", "Inter-Bold.ttf")
const FONT_BLACK = path.join(/* turbopackIgnore: true */ process.cwd(), "src", "assets", "fonts", "Inter-Black.ttf")
const FONT_SYMBOLS = path.join(/* turbopackIgnore: true */ process.cwd(), "src", "assets", "fonts", "NotoSansSymbols2-Regular.ttf")
const FONT_FILES = [
  FONT_REGULAR,
  FONT_BOLD,
  FONT_BLACK,
  FONT_SYMBOLS,
] as const

let _regular: Buffer | null = null
let _bold: Buffer | null = null
let _black: Buffer | null = null
let _symbols: Buffer | null = null
let _b64Regular: string | null = null
let _b64Bold: string | null = null
let _b64Black: string | null = null
let _b64Symbols: string | null = null
let _fontsWarmed = false

export function warmFonts(): void {
  if (_fontsWarmed) return
  fontRegular(); fontBold(); fontBlack(); fontSymbols()
  fontStyle()
  _fontsWarmed = true
}

function fontRegular(): Buffer {
  if (!_regular) _regular = fs.readFileSync(FONT_REGULAR)
  return _regular
}
function fontBold(): Buffer {
  if (!_bold) _bold = fs.readFileSync(FONT_BOLD)
  return _bold
}
function fontBlack(): Buffer {
  if (!_black) _black = fs.readFileSync(FONT_BLACK)
  return _black
}
function fontSymbols(): Buffer {
  if (!_symbols) _symbols = fs.readFileSync(FONT_SYMBOLS)
  return _symbols
}

function b64Regular(): string {
  if (!_b64Regular) _b64Regular = fontRegular().toString("base64")
  return _b64Regular
}
function b64Bold(): string {
  if (!_b64Bold) _b64Bold = fontBold().toString("base64")
  return _b64Bold
}
function b64Black(): string {
  if (!_b64Black) _b64Black = fontBlack().toString("base64")
  return _b64Black
}
function b64Symbols(): string {
  if (!_b64Symbols) _b64Symbols = fontSymbols().toString("base64")
  return _b64Symbols
}

let _cachedStyle: string | null = null
function fontStyle(): string {
  if (!_cachedStyle) {
    _cachedStyle = `<style>@font-face{font-family:'Inter';src:url(data:font/ttf;base64,${b64Regular()});font-weight:400;font-style:normal}@font-face{font-family:'Inter';src:url(data:font/ttf;base64,${b64Bold()});font-weight:700;font-style:normal}@font-face{font-family:'Inter';src:url(data:font/ttf;base64,${b64Black()});font-weight:900;font-style:normal}@font-face{font-family:'Noto Sans Symbols 2';src:url(data:font/ttf;base64,${b64Symbols()});font-weight:400;font-style:normal}</style>`
  }
  return _cachedStyle
}

function wrapSvg(svg: string): string {
  if (svg.includes("</defs>")) {
    return svg.replace("</defs>", `${fontStyle()}</defs>`)
  }
  // SVG senza <defs> (es. Netflix badge): inserisci font-style prima di </svg>
  if (svg.includes("</svg>")) {
    return svg.replace("</svg>", `${fontStyle()}</svg>`)
  }
  return svg.replace(/<svg /, `<svg >${fontStyle()}`)
}

export async function renderSVG(svgStr: string, w: number): Promise<Buffer> {
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "width", value: w },
    font: {
      fontFiles: [...FONT_FILES],
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
  badgeStyle?: string,
  accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = badgeStyle || "default"
  const maxBadgeW = pw - 20
  let finalFs = 23 * pw / 380
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
  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
}

// --- Genre badge ---

export async function buildGenreBadgeSVG(
  genreName: string, voteAverage: number, pw: number,
  year?: string, style?: string, accentColor?: string, topLight?: boolean,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = style || "shadow"
  const voteStr = voteAverage ? voteAverage.toFixed(1) : ""
  const yearStr = year || ""

  let finalFs = 24 * pw / 380
  const aestheticMaxW = Math.round(pw * 0.86) // 86% per margine estetico
  let dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr)
  let safePad = genreBadgeSafePad(finalFs)
  // Per shadow, buildGenreTextSvg aggiunge shadowPad*2 al renderW finale
  const extraShadowPad = style === "shadow" ? 8 : 0
  const estimatedRenderW = dims.totalW + safePad * 2 + extraShadowPad * 2
  if (estimatedRenderW > aestheticMaxW) {
    finalFs = Math.max(aestheticMaxW / estimatedRenderW * finalFs, 10)
    dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr)
    safePad = genreBadgeSafePad(finalFs)
  }

  const isPillStyle = s === "pill" || s === "colored"
  if (isPillStyle) {
    const _pillPad = Math.round(finalFs * 0.35)
    const maxPillW = genrePillMaxW(pw)
    if (dims.textContentW + _pillPad * 3 + safePad * 2 > maxPillW) {
      finalFs = Math.max(maxPillW / (dims.textContentW + _pillPad * 3 + safePad * 2) * finalFs, 10)
      dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr)
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
    result = buildGenreBorderedSvg(genreName, voteStr, yearStr, fs, textColor, topLight ?? false)
  } else if (s === "vetro") {
    result = buildGenreGlassSvg(genreName, voteStr, yearStr, fs, textColor, topLight ?? false)
  } else if (isBar) {
    result = buildGenreBarSvg(genreName, voteStr, yearStr, pw, fs, "rgba(0,0,0,0.80)", !!topLight)
  } else if (isPill) {
    result = buildGenrePillSvg(genreName, voteStr, yearStr, fs, bgColor, textColor)
  } else {
    result = buildGenreTextSvg(genreName, voteStr, yearStr, fs, textColor, s)
    // Per shadow, il renderW include shadowPad*2 + safePad*2 aggiuntivi
    // Assicuriamoci che non superi aestheticMaxW
    let attempts = 0
    while (result.w > aestheticMaxW && attempts < 30) {
      // Riduciamo fs proporzionalmente al surplus
      const targetFs = Math.max(Math.round(fs * (aestheticMaxW - 16) / result.w), 10)
      if (targetFs >= fs) { fs = 10 } else { fs = targetFs }
      result = buildGenreTextSvg(genreName, voteStr, yearStr, fs, textColor, s)
      attempts++
    }
  }
  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
}

export async function renderGenreBadge(
  genreName: string, voteAverage: number, pw: number,
  year?: string, style?: string, accentColor?: string, topLight?: boolean,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildGenreBadgeSVG(genreName, voteAverage, pw, year, style, accentColor, topLight)
  if (r) return r
  throw new Error(`SVG genre badge failed: ${genreName}`)
}

// --- Ranking badge ---

function buildNetflixRankBadgeSVG(rank: number, pw: number) {
  const fs = Math.round(Math.max(23 * pw / 380, 14))
  const w = Math.round(fs * 3.4)
  const h = Math.round(w * 0.90)
  const slant = Math.round(w * 0.10)
  const topFs = Math.round(w * 0.24)
  const rankFs = Math.round(w * 0.50)
  const padX = Math.round(fs * 0.4)
  const padBottom = Math.round(fs * 0.4)
  const totalW = w + padX * 2
  const totalH = h + padBottom

  const ribbonMidX = padX + w / 2
  const ribbonVNotchY = Math.round(h * 0.88)

  // Nastro Netflix top-center premium AAA: gradiente satinato, ombra 3D doppio livello, highlight e text shadow
  const pathD = `M ${padX} 0 L ${padX + w} 0 L ${padX + w - slant} ${h} L ${ribbonMidX} ${ribbonVNotchY} L ${padX + slant} ${h} Z`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
    <defs>
      <linearGradient id="netflixGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FF2A33"/>
        <stop offset="50%" stop-color="#E50914"/>
        <stop offset="100%" stop-color="#B20610"/>
      </linearGradient>
      <filter id="shadow3D" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.7"/>
        <feDropShadow dx="0" dy="5" stdDeviation="5.5" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
      <filter id="textShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.65"/>
      </filter>
    </defs>
    <path d="${pathD}" fill="url(#netflixGrad)" filter="url(#shadow3D)"/>
    <line x1="${padX}" y1="1" x2="${padX + w}" y2="1" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
    <text x="${ribbonMidX}" y="${Math.round(h * 0.28)}" fill="#ffffff" font-family="Inter" font-weight="800" font-size="${topFs}" text-anchor="middle" dominant-baseline="central" letter-spacing="0.5" filter="url(#textShadow)">TOP</text>
    <text x="${ribbonMidX}" y="${Math.round(h * 0.60)}" fill="#ffffff" font-family="Inter" font-weight="900" font-size="${rankFs}" text-anchor="middle" dominant-baseline="central" filter="url(#textShadow)">${rank}</text>
  </svg>`
  return { svg, w: totalW, h: totalH }
}

export async function buildRankingBadgeSVG(
  rank: number,
  pw: number,
  label?: string,
  topLight?: boolean,
  badgeStyle?: string,
  accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = badgeStyle || "default"
  const periodText = label || "Oggi"
  const fullText = `#${rank} ${periodText}`
  const maxBadgeW = pw - 20
  let finalFs = 23 * pw / 380
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
    result = buildNetflixRankBadgeSVG(rank, pw)
  } else if (s === "bar") {
    result = buildRankingBarSvg(fullText, pw, fs, fg, bg)
  } else if (s === "pill") {
    result = buildRankingPillSvg(fullText, fs, fg, bg)
  } else {
    result = buildRankingDefaultSvg(fullText, fs, fg, bg)
  }
  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
}

export async function renderRankingBadge(
  rank: number, pw: number, label?: string,
  topLight?: boolean, badgeStyle?: string, accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildRankingBadgeSVG(rank, pw, label, topLight, badgeStyle, accentColor)
  if (r) return r
  throw new Error(`SVG ranking badge failed: rank=${rank}`)
}

export async function renderExtraBadge(
  label: string, pw: number, topLight?: boolean,
  badgeStyle?: string, accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildExtraBadgeSVG(label, pw, topLight, badgeStyle, accentColor)
  if (r) return r
  throw new Error(`SVG extra badge failed: ${label}`)
}
