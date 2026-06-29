import { Resvg } from "@resvg/resvg-js"
import fs from "fs"
import path from "path"
import { textColorForBg } from "./accent-color"
import { genreBadgeSvgDims, buildGenreBarSvg, buildGenrePillSvg, buildGenreTextSvg, buildRankingBarSvg, buildRankingDefaultSvg, buildExtraBarSvg, buildExtraDefaultSvg } from "./badge-svg-shared"

let _regular: Buffer | null = null
let _bold: Buffer | null = null
let _black: Buffer | null = null
let _symbols: Buffer | null = null
let _b64Regular: string | null = null
let _b64Bold: string | null = null
let _b64Black: string | null = null
let _b64Symbols: string | null = null

const N = (s: string) => path.join(process.cwd(), "node_modules", "@fontsource", s)

function fontRegular(): Buffer {
  if (!_regular) _regular = fs.readFileSync(N("inter/files/inter-latin-400-normal.woff"))
  return _regular
}

function fontBold(): Buffer {
  if (!_bold) _bold = fs.readFileSync(N("inter/files/inter-latin-700-normal.woff"))
  return _bold
}

function fontBlack(): Buffer {
  if (!_black) _black = fs.readFileSync(N("inter/files/inter-latin-900-normal.woff"))
  return _black
}

function fontSymbols(): Buffer {
  if (!_symbols) _symbols = fs.readFileSync(N("noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff"))
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
    _cachedStyle = `<style>@font-face{font-family:'Inter';src:url(data:application/font-woff;base64,${b64Regular()});font-weight:400;font-style:normal}@font-face{font-family:'Inter';src:url(data:application/font-woff;base64,${b64Bold()});font-weight:700;font-style:normal}@font-face{font-family:'Inter';src:url(data:application/font-woff;base64,${b64Black()});font-weight:900;font-style:normal}@font-face{font-family:'Noto Sans Symbols 2';src:url(data:application/font-woff;base64,${b64Symbols()});font-weight:400;font-style:normal}</style>`
  }
  return _cachedStyle
}

function wrapSvg(svg: string): string {
  if (svg.includes("</defs>")) {
    return svg.replace("</defs>", `${fontStyle()}</defs>`)
  }
  return svg.replace("<svg ", `<svg `).replace(">", `>${fontStyle()}`)
}

export async function renderSVG(svgStr: string, w: number): Promise<Buffer> {
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "width", value: w },
    font: {
      fontBuffers: [fontRegular(), fontBold(), fontBlack(), fontSymbols()] as unknown as string[],
      loadSystemFonts: false,
    } as Record<string, unknown>,
  })
  return Buffer.from(resvg.render().asPng())
}

export async function buildGenreBadgeSVG(
  genreName: string,
  voteAverage: number,
  pw: number,
  year?: string,
  style?: string,
  accentColor?: string,
  topLight?: boolean,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = style || "shadow"
  const voteStr = voteAverage.toFixed(1)
  const yearStr = year || ""
  const maxBadgeW = pw - 20
  let finalFs = 24 * pw / 380
  let dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr)
  if (dims.totalW > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / dims.totalW * finalFs, 10)
    dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr)
  }

  const isPillStyle = s === "pill" || s === "colored"
  if (isPillStyle) {
    const _pillPad = Math.round(finalFs * 0.35)
    if (dims.totalW + _pillPad * 3 > maxBadgeW) {
      finalFs = Math.max(maxBadgeW / (dims.totalW + _pillPad * 3) * finalFs, 10)
      dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr)
    }
  }
  const fs = Math.round(finalFs)
  const isPill = s === "pill" || s === "colored"
  const isBar = s === "bar"

  const textColor = s === "colored"
    ? textColorForBg(accentColor || "")
    : (isPill ? "rgba(0,0,0,0.80)" : "#e5e7eb")
  const bgColor = s === "colored"
    ? (accentColor && accentColor !== "#555555" ? accentColor : "rgba(255,255,255,0.80)")
    : (isPill ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  let result: { svg: string; w: number; h: number }
  if (isBar) {
    result = buildGenreBarSvg(genreName, voteStr, yearStr, pw, fs, "rgba(0,0,0,0.80)", !!topLight, -50)
  } else if (isPill) {
    result = buildGenrePillSvg(genreName, voteStr, yearStr, fs, bgColor, textColor, -50)
  } else {
    result = buildGenreTextSvg(genreName, voteStr, yearStr, fs, textColor, s, -50)
  }

  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
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
  const textLen = String(rank).length + periodText.length
  const maxBadgeW = pw - 20
  let finalFs = 23 * pw / 380
  if (finalFs * (textLen * 0.62 + 2.35) > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / (textLen * 0.62 + 2.35), 10)
  }

  const fs = Math.round(finalFs)
  const isColored = s === "colored"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)")
  const fg = isColored ? textColorForBg(accentColor || "") : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  let result: { svg: string; w: number; h: number }
  if (s === "bar") {
    result = buildRankingBarSvg(fullText, pw, fs, fg, bg)
  } else {
    result = buildRankingDefaultSvg(fullText, fs, fg, bg)
  }

  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
}

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
  if (finalFs * (label.length * 0.62 + 2.0) > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / (label.length * 0.62 + 2.0), 10)
  }

  const fs = Math.round(finalFs)
  const isColored = s === "colored"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)")
  const fg = isColored ? textColorForBg(accentColor || "") : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  let result: { svg: string; w: number; h: number }
  if (s === "bar") {
    result = buildExtraBarSvg(label, pw, fs, fg, bg)
  } else {
    result = buildExtraDefaultSvg(label, fs, fg, bg)
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
