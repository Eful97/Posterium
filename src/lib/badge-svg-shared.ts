const TEXT_SAFE_PAD = 1.15
const GENRE_TEXT_MAX_RATIO = 0.84
const GENRE_PILL_MAX_RATIO = 0.78
const GENRE_FONT_WEIGHT = 600
const RANKING_FONT_WEIGHT = 700

export function genreBadgeSafePad(fs: number): number {
  return Math.round(fs * TEXT_SAFE_PAD)
}

export function genrePillMaxW(containerW: number): number {
  return Math.min(containerW - 20, Math.round(containerW * GENRE_PILL_MAX_RATIO))
}

export function genreTextMaxW(containerW: number): number {
  return Math.min(containerW - 20, Math.round(containerW * GENRE_TEXT_MAX_RATIO))
}

export function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function charWidthFactor(char: string): number {
  if (char === " ") return 0.33
  if ("iIl.,:;!'|`".includes(char)) return 0.28
  if ("-–_".includes(char)) return 0.36
  if ("fjrt".includes(char.toLowerCase())) return 0.45
  if ("mw".includes(char.toLowerCase())) return 0.86
  if ("#%&@".includes(char)) return 0.75
  if (/\d/.test(char)) return 0.58
  if (/[A-Z]/.test(char)) return 0.68
  return 0.62
}

export function estimateTextWidth(text: string, fs: number): number {
  let units = 0
  for (const char of text) units += charWidthFactor(char)
  return Math.round(Math.max(units * fs, fs * 0.35))
}

function textFitAttrs(width: number): string {
  return ` textLength="${Math.max(Math.round(width), 1)}" lengthAdjust="spacingAndGlyphs"`
}

type GenreBadgeText = {
  readonly genreName: string
  readonly voteStr: string
  readonly yearStr: string
}

type GenreTextFlowArgs = GenreBadgeText & {
  readonly fs: number
  readonly centerX: number
  readonly y: number
}

export function genreBadgeSvgDims(fs: number, genreName: string, voteStr: string, yearStr: string) {
  const gap = Math.round(fs / 3)
  const gapStar = Math.round(fs / 6)
  const bulletW = Math.round(fs * 0.35)
  const starW = Math.round(fs * 0.92)
  const genreW = estimateTextWidth(genreName, fs)
  const voteW = estimateTextWidth(voteStr, fs)
  const yearW = yearStr ? estimateTextWidth(yearStr, fs) : 0
  const buf = Math.round(fs * 0.25)
  const textContentW = genreW + gap + bulletW + gap + starW + gapStar + voteW + (yearStr ? gap + bulletW + gap + yearW : 0)
  const totalW = textContentW + buf
  const svgH = Math.max(Math.round(fs * 1.6), 24)
  return { starW, gap, gapStar, totalW, svgH, genreW, voteW, yearW, bulletW, textContentW }
}

function buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX, y }: GenreTextFlowArgs) {
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
  const totalDx = dims.gap * (yearStr ? 4 : 2) + dims.gapStar
  const adjustedX = centerX - totalDx / 2
  const starDy = Math.max(2, Math.round(fs * 0.14))
  let t = `<text x="${adjustedX}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="${GENRE_FONT_WEIGHT}" font-size="${fs}"${textFitAttrs(dims.textContentW)}>`
  t += `<tspan>${escSvg(genreName)}</tspan>`
  t += `<tspan dx="${dims.gap}" fill-opacity="0.6">${escSvg("\u2022")}</tspan>`
  t += `<tspan dx="${dims.gap}" dy="${starDy}" font-family="Noto Sans Symbols 2" font-weight="400" fill="#F59E0B">${escSvg("\u2605")}</tspan>`
  t += `<tspan dx="${dims.gapStar}" dy="${-starDy}">${escSvg(voteStr)}</tspan>`
  if (yearStr) {
    t += `<tspan dx="${dims.gap}" fill-opacity="0.6">${escSvg("\u2022")}</tspan>`
    t += `<tspan dx="${dims.gap}">${escSvg(yearStr)}</tspan>`
  }
  t += "</text>"
  return t
}

export function buildGenreBarSvg(genreName: string, voteStr: string, yearStr: string, pw: number, fs: number, textColor: string, topLight: boolean, textOffsetX = 0) {
  const barPad = Math.round(fs * 0.5)
  const barH = fs + barPad * 2
  const barR = Math.round(fs * 0.7)
  const barShadowOff = Math.max(Math.round(barH * 0.2), 3)
  const barShadowBlur = Math.max(Math.round(barH * 0.5), 8)
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: pw / 2 + textOffsetX, y: barH / 2 })
  const pathD = `M 0,${barH} L 0,${barR} A ${barR},${barR} 0 0,1 ${barR},0 L ${pw - barR},0 A ${barR},${barR} 0 0,1 ${pw},${barR} L ${pw},${barH} Z`
  const defs = `<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="-${barShadowOff}" stdDeviation="${barShadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<g fill="${textColor}">${textParts}</g>`
  const borderLine = `<line x1="0" y1="0" x2="${pw}" y2="0" stroke="rgba(0,0,0,0.10)" stroke-width="1"/>`
  const inner = `<path d="${pathD}" fill="rgba(255,255,255,0.80)" filter="url(#sh)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${barH}">${defs}${inner}${borderLine}${textEl}</svg>`, w: pw, h: barH }
}

export function buildGenrePillSvg(genreName: string, voteStr: string, yearStr: string, fs: number, bgColor: string, textColor: string, textOffsetX = 0) {
  const pillPad = Math.round(fs * 0.35)
  const safePad = genreBadgeSafePad(fs)
  const pillR = Math.round(fs * 0.8)
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
  const pillW = dims.textContentW + pillPad * 3 + safePad * 2
  const pillH = fs + pillPad * 2
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: pillW / 2 + textOffsetX, y: pillH / 2 })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pillW}" height="${pillH}"><rect width="${pillW}" height="${pillH}" rx="${pillR}" fill="${bgColor}" stroke="rgba(255,255,255,0.18)" stroke-width="1"/><g fill="${textColor}">${textParts}</g></svg>`
  return { svg, w: pillW, h: pillH }
}

export function buildGenreTextSvg(genreName: string, voteStr: string, yearStr: string, fs: number, textColor: string, style: string, textOffsetX = 0) {
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
  const shadowPad = style === "shadow" ? 8 : 0
  const shadowDrop = style === "shadow" ? 5 : 0
  const safePad = genreBadgeSafePad(fs)
  const renderW = dims.totalW + shadowPad * 2 + safePad * 2
  const renderH = dims.svgH + shadowDrop
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: renderW / 2 + textOffsetX, y: shadowDrop + dims.svgH / 2 })
  let defs = ""
  let filterAttr = ""
  if (style === "shadow") {
    defs = `<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.8)"/><feDropShadow dx="0" dy="5" stdDeviation="4.5" flood-color="rgba(0,0,0,0.55)"/></filter></defs>`
    filterAttr = ' filter="url(#sh)"'
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<g fill="${textColor}"${filterAttr}>${textParts}</g></svg>`
  return { svg, w: renderW, h: renderH }
}

export function buildGenreBorderedSvg(genreName: string, voteStr: string, yearStr: string, fs: number, textColor: string, topLight: boolean, textOffsetX = 0) {
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
  const safePad = genreBadgeSafePad(fs)
  const borderPad = Math.max(Math.round(fs * 0.4), 6)
  const borderW = 2
  const renderW = dims.textContentW + borderPad * 2 + safePad * 2
  const rectH = dims.svgH
  const renderH = rectH
  const r = Math.round(fs * 0.55)
  const borderColor = topLight ? "rgba(0,0,0,0.50)" : "rgba(255,255,255,0.60)"
  const bgFill = topLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: renderW / 2 + textOffsetX, y: rectH / 2 })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}"><rect x="${borderW / 2}" y="${borderW / 2}" width="${renderW - borderW}" height="${rectH - borderW}" rx="${r}" fill="${bgFill}" stroke="${borderColor}" stroke-width="${borderW}"/><g fill="${textColor}">${textParts}</g></svg>`
  return { svg, w: renderW, h: renderH }
}

export function buildGenreGlassSvg(genreName: string, voteStr: string, yearStr: string, fs: number, textColor: string, topLight: boolean, textOffsetX = 0) {
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
  const safePad = genreBadgeSafePad(fs)
  const glassPad = Math.max(Math.round(fs * 0.45), 8)
  const renderW = dims.textContentW + glassPad * 2 + safePad * 2
  const rectH = dims.svgH
  const renderH = rectH + Math.round(fs * 0.2)
  const r = Math.round(fs * 0.6)
  // iOS liquid glass — multi-stop gradient: bright top edge → frosted body → bottom depth
  const stops = topLight
    ? `<stop offset="0%" stop-color="rgba(255,255,255,0.92)"/><stop offset="12%" stop-color="rgba(255,255,255,0.55)"/><stop offset="50%" stop-color="rgba(255,255,255,0.32)"/><stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>`
    : `<stop offset="0%" stop-color="rgba(255,255,255,0.45)"/><stop offset="10%" stop-color="rgba(255,255,255,0.14)"/><stop offset="50%" stop-color="rgba(255,255,255,0.07)"/><stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>`
  const borderColor = topLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: renderW / 2 + textOffsetX, y: rectH / 2 })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}"><defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs><rect width="${renderW}" height="${rectH}" rx="${r}" fill="url(#gg)" stroke="${borderColor}" stroke-width="1.5"/><g fill="${textColor}">${textParts}</g></svg>`
  return { svg, w: renderW, h: renderH }
}

export function buildGenreNeonSvg(genreName: string, voteStr: string, yearStr: string, fs: number, accentColor?: string, textOffsetX = 0) {
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
  const safePad = genreBadgeSafePad(fs)
  const neonPad = Math.max(Math.round(fs * 0.4), 6)
  const neonColor = accentColor && accentColor !== "#555555" ? accentColor : "#06B6D4"
  const renderW = dims.textContentW + neonPad * 2 + safePad * 2 + 12
  const rectH = dims.svgH
  const renderH = rectH + 12
  const r = Math.round(fs * 0.6)
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: renderW / 2 + textOffsetX, y: (rectH + 12) / 2 })
  const defs = `<defs><filter id="nf" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${neonColor}" flood-opacity="0.95"/><feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="${neonColor}" flood-opacity="0.65"/></filter></defs>`
  const bgRect = `<rect x="6" y="6" width="${renderW - 12}" height="${rectH}" rx="${r}" fill="rgba(10,10,14,0.88)" stroke="${neonColor}" stroke-width="1.8" filter="url(#nf)"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}${bgRect}<g fill="${neonColor}">${textParts}</g></svg>`
  return { svg, w: renderW, h: renderH }
}

export function buildRankingBarSvg(fullText: string, pw: number, fs: number, textColor: string, bg: string) {
  const pt = Math.round(fs * 0.35)
  const pb = pt
  const svgH = fs + pt + pb
  const textW = estimateTextWidth(fullText, fs)
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const pathD = `M 0,0 L ${pw},0 L ${pw},${svgH - r} A ${r},${r} 0 0,1 ${pw - r},${svgH} L ${r},${svgH} A ${r},${r} 0 0,1 0,${svgH - r} Z`
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text x="${pw / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="${RANKING_FONT_WEIGHT}" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  const inner = `<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${svgH}">${defs}${inner}${textEl}</svg>`, w: pw, h: svgH }
}

export function buildRankingDefaultSvg(fullText: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.5)
  const pb = pt
  const textW = estimateTextWidth(fullText, fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur
  const ox = shadowBlur
  const oy = 0
  const pathD = `M ${ox},${oy} L ${ox + totalW},${oy} L ${ox + totalW},${oy + svgH - r} A ${r},${r} 0 0,1 ${ox + totalW - r},${oy + svgH} L ${ox + r},${oy + svgH} A ${r},${r} 0 0,1 ${ox},${oy + svgH - r} Z`
  const centerX = ox + totalW / 2
  const centerY = oy + svgH / 2
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.6)"/><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.35)"/></filter></defs>`
  const textEl = `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="${RANKING_FONT_WEIGHT}" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<path d="${pathD}" fill="${bg}" stroke="rgba(255,255,255,0.15)" stroke-width="1" filter="url(#ds)"/>${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildRankingPillSvg(fullText: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.4)
  const pb = pt
  const textW = Math.max(estimateTextWidth(fullText, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = svgH / 2
  const renderW = totalW
  const ox = 0
  const oy = 0
  const textEl = `<text x="${renderW / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  const bgEl = `<rect x="${ox}" y="${oy}" width="${totalW}" height="${svgH}" rx="${r}" fill="${bg}" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${svgH}">${bgEl}${textEl}</svg>`, w: renderW, h: svgH }
}

export function buildRankingGlassSvg(fullText: string, fs: number, textColor: string, _bg: string, topLight: boolean) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.4)
  const pb = pt
  const textW = Math.max(estimateTextWidth(fullText, fs), fs)
  const totalW = textW + px * 2
  const rectH = fs + pt + pb
  const r = Math.round(fs * 0.6)
  const renderW = totalW
  const renderH = rectH + Math.round(fs * 0.2)
  // iOS liquid glass — multi-stop gradient
  const stops = topLight
    ? `<stop offset="0%" stop-color="rgba(255,255,255,0.92)"/><stop offset="12%" stop-color="rgba(255,255,255,0.55)"/><stop offset="50%" stop-color="rgba(255,255,255,0.32)"/><stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>`
    : `<stop offset="0%" stop-color="rgba(255,255,255,0.45)"/><stop offset="10%" stop-color="rgba(255,255,255,0.14)"/><stop offset="50%" stop-color="rgba(255,255,255,0.07)"/><stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>`
  const borderColor = topLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"
  const textEl = `<text x="${renderW / 2}" y="${rectH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  const defs = `<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>`
  const bgEl = `<rect x="0" y="0" width="${totalW}" height="${rectH}" rx="${r}" fill="url(#rg)" stroke="${borderColor}" stroke-width="1.5"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}${bgEl}${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildRankingBorderedSvg(fullText: string, fs: number, textColor: string, topLight: boolean) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.45)
  const pb = pt
  const textW = Math.max(estimateTextWidth(fullText, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.55)
  const renderW = totalW
  const borderW = 2
  const borderColor = topLight ? "rgba(0,0,0,0.50)" : "rgba(255,255,255,0.60)"
  const bgFill = topLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"
  const textEl = `<text x="${renderW / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  const bgEl = `<rect x="${borderW / 2}" y="${borderW / 2}" width="${renderW - borderW}" height="${svgH - borderW}" rx="${r}" fill="${bgFill}" stroke="${borderColor}" stroke-width="${borderW}"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${svgH}">${bgEl}${textEl}</svg>`, w: renderW, h: svgH }
}

export function buildExtraBarSvg(label: string, pw: number, fs: number, textColor: string, bg: string) {
  const pt = Math.round(fs * 0.35)
  const pb = pt
  const svgH = fs + pt + pb
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const pathD = `M 0,0 L ${pw},0 L ${pw},${svgH - r} A ${r},${r} 0 0,1 ${pw - r},${svgH} L ${r},${svgH} A ${r},${r} 0 0,1 0,${svgH - r} Z`
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text x="${pw / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  const inner = `<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${svgH}">${defs}${inner}${textEl}</svg>`, w: pw, h: svgH }
}

export function buildExtraDefaultSvg(label: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.5)
  const pb = pt
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur
  const ox = shadowBlur
  const oy = 0
  const pathD = `M ${ox},${oy} L ${ox + totalW},${oy} L ${ox + totalW},${oy + svgH - r} A ${r},${r} 0 0,1 ${ox + totalW - r},${oy + svgH} L ${ox + r},${oy + svgH} A ${r},${r} 0 0,1 ${ox},${oy + svgH - r} Z`
  const centerX = ox + totalW / 2
  const centerY = oy + svgH / 2
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.6)"/><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.35)"/></filter></defs>`
  const textEl = `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<path d="${pathD}" fill="${bg}" stroke="rgba(255,255,255,0.15)" stroke-width="1" filter="url(#ds)"/>${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildExtraPillSvg(label: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.4)
  const pb = pt
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = svgH / 2
  const renderW = totalW
  const textEl = `<text x="${renderW / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  const bgEl = `<rect x="0" y="0" width="${totalW}" height="${svgH}" rx="${r}" fill="${bg}" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${svgH}">${bgEl}${textEl}</svg>`, w: renderW, h: svgH }
}

export function buildExtraGlassSvg(label: string, fs: number, textColor: string, _bg: string, topLight: boolean) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.4)
  const pb = pt
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const totalW = textW + px * 2
  const rectH = fs + pt + pb
  const r = Math.round(fs * 0.6)
  const renderW = totalW
  const renderH = rectH + Math.round(fs * 0.2)
  // iOS liquid glass — multi-stop gradient
  const stops = topLight
    ? `<stop offset="0%" stop-color="rgba(255,255,255,0.92)"/><stop offset="12%" stop-color="rgba(255,255,255,0.55)"/><stop offset="50%" stop-color="rgba(255,255,255,0.32)"/><stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>`
    : `<stop offset="0%" stop-color="rgba(255,255,255,0.45)"/><stop offset="10%" stop-color="rgba(255,255,255,0.14)"/><stop offset="50%" stop-color="rgba(255,255,255,0.07)"/><stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>`
  const borderColor = topLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"
  const textEl = `<text x="${renderW / 2}" y="${rectH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  const defs = `<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>`
  const bgEl = `<rect x="0" y="0" width="${totalW}" height="${rectH}" rx="${r}" fill="url(#eg)" stroke="${borderColor}" stroke-width="1.5"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}${bgEl}${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildExtraNeonSvg(label: string, fs: number, accentColor?: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.4)
  const pb = pt
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const totalW = textW + px * 2
  const rectH = fs + pt + pb
  const r = Math.round(fs * 0.6)
  const neonColor = accentColor && accentColor !== "#555555" ? accentColor : "#06B6D4"
  const renderW = totalW + 12
  const renderH = rectH + 12
  const textEl = `<text x="${renderW / 2}" y="${renderH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${neonColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  const defs = `<defs><filter id="ne" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${neonColor}" flood-opacity="0.95"/><feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="${neonColor}" flood-opacity="0.65"/></filter></defs>`
  const bgEl = `<rect x="6" y="6" width="${totalW}" height="${rectH}" rx="${r}" fill="rgba(10,10,14,0.88)" stroke="${neonColor}" stroke-width="1.8" filter="url(#ne)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}${bgEl}${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildNetflixRankSvg(rank: number, pw: number) {
  const fs = Math.round(Math.max(23 * pw / 380, 14))
  const w = Math.round(fs * 2.4)
  const h = Math.round(fs * 2.0)
  const cut = Math.round(fs * 0.35)
  const topFs = Math.round(fs * 0.5)
  const rankFs = Math.round(fs * 1.0)
  const pathD = `M ${cut},0 L ${w},0 L ${w},${h} L 0,${h} L 0,${cut} Z`
  const textEl = `<text x="${w / 2}" y="${Math.round(h * 0.38)}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${topFs}" fill="#ffffff">TOP</text><text x="${w / 2}" y="${Math.round(h * 0.72)}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="900" font-size="${rankFs}" fill="#ffffff">${rank}</text>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><clipPath id="nf"><path d="${pathD}"/></clipPath></defs><g clip-path="url(#nf)"><rect width="${w}" height="${h}" rx="2" fill="#E50914"/></g>${textEl}</svg>`
  return { svg, w, h }
}
