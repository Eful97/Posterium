import { Resvg } from "@resvg/resvg-js"
import fs from "fs"
import path from "path"
import { textColorForBg } from "./accent-color"

let _regular: Buffer | null = null
let _bold: Buffer | null = null
let _symbols: Buffer | null = null
let _b64Regular: string | null = null
let _b64Bold: string | null = null
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

function b64Symbols(): string {
  if (!_b64Symbols) _b64Symbols = fontSymbols().toString("base64")
  return _b64Symbols
}

let _cachedStyle: string | null = null
function fontStyle(): string {
  if (!_cachedStyle) {
    _cachedStyle = `<style>@font-face{font-family:'Inter';src:url(data:application/font-woff;base64,${b64Regular()});font-weight:400;font-style:normal}@font-face{font-family:'Inter';src:url(data:application/font-woff;base64,${b64Bold()});font-weight:700;font-style:normal}@font-face{font-family:'Noto Sans Symbols 2';src:url(data:application/font-woff;base64,${b64Symbols()});font-weight:400;font-style:normal}</style>`
  }
  return _cachedStyle
}

export async function renderSVG(svgStr: string, w: number, h: number): Promise<Buffer> {
  const resvg = new Resvg(svgStr, { fitTo: { mode: "width", value: w } })
  return Buffer.from(resvg.render().asPng())
}

function genreBadgeDims(fs: number, genreName: string, voteStr: string, yearStr: string) {
  const gap = Math.round(fs * 0.33)
  const gapStar = Math.round(fs * 0.17)
  const pad = Math.round(fs * 0.35)
  const bulletW = Math.round(fs * 0.35)
  const starW = Math.round(fs * 0.92)
  const genreW = Math.round(genreName.length * fs * 0.58)
  const voteW = Math.round(voteStr.length * fs * 0.58)
  const yearW = yearStr ? Math.round(yearStr.length * fs * 0.58) : 0
  const buf = Math.round(fs * 0.25)
  const totalW = genreW + gap + bulletW + gap + starW + gapStar + voteW + (yearStr ? gap + bulletW + gap + yearW : 0) + pad * 2 + buf
  const svgH = Math.max(Math.round(fs * 1.6), 24)
  return { starW, gap, gapStar, pad, totalW, svgH, genreW, voteW, yearW, bulletW }
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
  if (s === "bar" || s === "glass") return null

  const voteStr = voteAverage.toFixed(1)
  const yearStr = year || ""
  let finalFontSize = Math.round(24 * pw / 380)
  const maxBadgeW = pw - 20
  let dims = genreBadgeDims(finalFontSize, genreName, voteStr, yearStr)
  if (dims.totalW > maxBadgeW) {
    const ratio = maxBadgeW / dims.totalW
    finalFontSize = Math.max(Math.round(finalFontSize * ratio), 10)
    dims = genreBadgeDims(finalFontSize, genreName, voteStr, yearStr)
  }

  const isPillStyle = s === "pill" || s === "colored"
  const pillPad = Math.round(finalFontSize * 0.35)
  const pillR = Math.round(finalFontSize * 0.8)
  const pillExtra = isPillStyle ? pillPad * 3 - dims.pad * 2 : 0
  if (isPillStyle && dims.totalW + pillExtra > maxBadgeW) {
    const ratio = maxBadgeW / (dims.totalW + pillExtra)
    finalFontSize = Math.max(Math.round(finalFontSize * ratio), 10)
    dims = genreBadgeDims(finalFontSize, genreName, voteStr, yearStr)
  }

  const { starW, gap, gapStar, pad, totalW, svgH, genreW, voteW, yearW, bulletW } = dims
  const fs = finalFontSize

  const textColor = s === "colored"
    ? textColorForBg(accentColor || "")
    : "#e5e7eb"
  const bgColor = s === "colored"
    ? (accentColor && accentColor !== "#555555" ? accentColor : "rgba(255,255,255,0.80)")
    : "rgba(0,0,0,0.80)"

  const bulletY = 5
  const starY = Math.round(fs * 0.23)

  if (isPillStyle) {
    const pillW = totalW - pad * 2 + pillPad * 3
    const pillH = fs + pillPad * 2

    let xOff = pillPad * 1.5
    const genreX = xOff
    xOff += genreW + gap
    const bulletX = xOff
    xOff += bulletW + gap
    const starX = xOff
    xOff += starW + gapStar
    const voteX = xOff
    xOff += voteW + gap
    const bullet2X = yearStr ? xOff : 0
    if (yearStr) xOff += bulletW + gap
    const yearX = xOff

    const centerY = pillH / 2

    let tspans = ""
    tspans += `<tspan x="${genreX}" y="${centerY}" dominant-baseline="central">${esc(genreName)}</tspan>`
    tspans += `<tspan x="${bulletX}" y="${centerY}" dominant-baseline="central" fill-opacity="0.6">${esc("\u2022")}</tspan>`
    tspans += `<tspan x="${starX}" y="${centerY}" dominant-baseline="central" font-family="Noto Sans Symbols 2">${esc("\u2605")}</tspan>`
    tspans += `<tspan x="${voteX}" y="${centerY}" dominant-baseline="central">${esc(voteStr)}</tspan>`
    if (yearStr) {
      tspans += `<tspan x="${bullet2X}" y="${centerY}" dominant-baseline="central" fill-opacity="0.6">${esc("\u2022")}</tspan>`
      tspans += `<tspan x="${yearX}" y="${centerY}" dominant-baseline="central">${esc(yearStr)}</tspan>`
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pillW}" height="${pillH}">${fontStyle()}<rect width="${pillW}" height="${pillH}" rx="${pillR}" fill="${bgColor}"/><text font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}" dominant-baseline="central">${tspans}</text></svg>`
    const png = await renderSVG(svg, pillW, pillH)
    return { png, w: pillW, h: pillH }
  }

  // shadow or outline style
  let filterAttr = ""
  let defs = ""
  if (s === "shadow") {
    defs = `<defs><filter id="sh"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="rgba(0,0,0,0.6)"/></filter></defs>`
    filterAttr = ' filter="url(#sh)"'
  } else if (s === "outline") {
    // SVG paint-order trick: stroke behind fill for hard outline
    filterAttr = ' stroke="rgba(0,0,0,0.9)" stroke-width="1" paint-order="stroke fill"'
  }

  const centerX = totalW / 2
  const centerY = svgH / 2

  let xOff = pad
  const genreX = xOff
  xOff += genreW + gap
  const bulletX = xOff
  xOff += bulletW + gap
  const starX = xOff
  xOff += starW + gapStar
  const voteX = xOff
  xOff += voteW + gap
  const bullet2X = yearStr ? xOff : 0
  if (yearStr) xOff += bulletW + gap
  const yearX = xOff

  let tspans = ""
  tspans += `<tspan x="${genreX}" y="${centerY}" dominant-baseline="central">${esc(genreName)}</tspan>`
  tspans += `<tspan x="${bulletX}" y="${centerY}" dominant-baseline="central" fill-opacity="0.6">${esc("\u2022")}</tspan>`
  tspans += `<tspan x="${starX}" y="${centerY}" dominant-baseline="central" font-family="Noto Sans Symbols 2">${esc("\u2605")}</tspan>`
  tspans += `<tspan x="${voteX}" y="${centerY}" dominant-baseline="central">${esc(voteStr)}</tspan>`
  if (yearStr) {
    tspans += `<tspan x="${bullet2X}" y="${centerY}" dominant-baseline="central" fill-opacity="0.6">${esc("\u2022")}</tspan>`
    tspans += `<tspan x="${yearX}" y="${centerY}" dominant-baseline="central">${esc(yearStr)}</tspan>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}">${fontStyle()}${defs}<text x="0" y="0" font-family="Inter" font-weight="700" font-size="${fs}" fill="#e5e7eb"${filterAttr}>${tspans}</text></svg>`
  const png = await renderSVG(svg, totalW, svgH)
  return { png, w: totalW, h: svgH }
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
  if (s === "bar" || s === "glass") return null

  const periodText = label || "Oggi"
  const fullText = `#${rank} ${periodText}`
  const textLen = String(rank).length + periodText.length
  let finalFontSize = Math.round(23 * pw / 380)
  const maxBadgeW = pw - 20
  if (finalFontSize * (textLen * 0.58 + 3.55) > maxBadgeW) {
    finalFontSize = Math.round(maxBadgeW / (textLen * 0.58 + 3.55))
  }
  finalFontSize = Math.max(finalFontSize, 10)

  const fs = finalFontSize
  const px = Math.round(fs * 1.0)
  const isColored = s === "colored"
  const pt = Math.round(fs * 0.5)
  const pb = pt
  const rankPart = String(rank).length * fs * 0.58
  const spacePart = fs * 0.35
  const labelPart = periodText.length * fs * 0.58
  const textW = Math.round(rankPart + spacePart + labelPart)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.7)

  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)")
  const fg = isColored ? textColorForBg(accentColor || "") : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur

  const ox = shadowBlur
  const oy = 0
  const pathD = `M ${ox},${oy} L ${ox + totalW},${oy} L ${ox + totalW},${oy + svgH - r} A ${r},${r} 0 0,1 ${ox + totalW - r},${oy + svgH} L ${ox + r},${oy + svgH} A ${r},${r} 0 0,1 ${ox},${oy + svgH - r} Z`

  const centerX = ox + totalW / 2
  const centerY = oy + svgH / 2

  const defs = `<defs><filter id="ds"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`

  const textEl = `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${fg}" letter-spacing="0.025em">${esc(fullText)}</text>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${fontStyle()}${defs}<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>${textEl}</svg>`
  const png = await renderSVG(svg, renderW, renderH)
  return { png, w: renderW, h: renderH }
}

export async function buildExtraBadgeSVG(
  label: string,
  pw: number,
  topLight?: boolean,
  badgeStyle?: string,
  accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = badgeStyle || "default"
  if (s === "bar" || s === "glass") return null

  let finalFontSize = Math.round(23 * pw / 380)
  const maxBadgeW = pw - 20
  if (finalFontSize * (label.length * 0.58 + 3.2) > maxBadgeW) {
    finalFontSize = Math.round(maxBadgeW / (label.length * 0.58 + 3.2))
  }
  finalFontSize = Math.max(finalFontSize, 10)

  const fs = finalFontSize
  const px = Math.round(fs * 1.0)
  const isColored = s === "colored"
  const pt = Math.round(fs * 0.5)
  const pb = pt
  const textW = Math.max(Math.round(label.length * fs * 0.58), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.7)

  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)")
  const fg = isColored ? textColorForBg(accentColor || "") : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur

  const ox = shadowBlur
  const oy = 0
  const pathD = `M ${ox},${oy} L ${ox + totalW},${oy} L ${ox + totalW},${oy + svgH - r} A ${r},${r} 0 0,1 ${ox + totalW - r},${oy + svgH} L ${ox + r},${oy + svgH} A ${r},${r} 0 0,1 ${ox},${oy + svgH - r} Z`

  const centerX = ox + totalW / 2
  const centerY = oy + svgH / 2

  const defs = `<defs><filter id="ds"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`

  const textEl = `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${fg}" letter-spacing="0.025em">${esc(label)}</text>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${fontStyle()}${defs}<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>${textEl}</svg>`
  const png = await renderSVG(svg, renderW, renderH)
  return { png, w: renderW, h: renderH }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
