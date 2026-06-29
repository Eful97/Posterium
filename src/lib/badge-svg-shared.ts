const CHAR_WIDTH = 0.62

export function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function genreBadgeSvgDims(fs: number, genreName: string, voteStr: string, yearStr: string) {
  const gap = Math.round(fs / 3)
  const gapStar = Math.round(fs / 6)
  const bulletW = Math.round(fs * 0.35)
  const starW = Math.round(fs * 0.92)
  const genreW = Math.round(genreName.length * fs * CHAR_WIDTH)
  const voteW = Math.round(voteStr.length * fs * CHAR_WIDTH)
  const yearW = yearStr ? Math.round(yearStr.length * fs * CHAR_WIDTH) : 0
  const buf = Math.round(fs * 0.25)
  const textContentW = genreW + gap + bulletW + gap + starW + gapStar + voteW + (yearStr ? gap + bulletW + gap + yearW : 0)
  const totalW = textContentW + buf
  const svgH = Math.max(Math.round(fs * 1.6), 24)
  return { starW, gap, gapStar, totalW, svgH, genreW, voteW, yearW, bulletW, textContentW }
}

function buildGenreTspans(genreName: string, voteStr: string, yearStr: string, gap: number, gapStar: number) {
  let t = ""
  t += `<tspan>${escSvg(genreName)}</tspan>`
  t += `<tspan dx="${gap}" fill-opacity="0.6">${escSvg("\u2022")}</tspan>`
  t += `<tspan dx="${gap}" font-family="Noto Sans Symbols 2">${escSvg("\u2605")}</tspan>`
  t += `<tspan dx="${gapStar}">${escSvg(voteStr)}</tspan>`
  if (yearStr) {
    t += `<tspan dx="${gap}" fill-opacity="0.6">${escSvg("\u2022")}</tspan>`
    t += `<tspan dx="${gap}">${escSvg(yearStr)}</tspan>`
  }
  return t
}

export function buildGenreBarSvg(genreName: string, voteStr: string, yearStr: string, pw: number, fs: number, textColor: string, topLight: boolean, textOffsetX = 0) {
  const gap = Math.round(fs / 3)
  const gapStar = Math.round(fs / 6)
  const barPad = Math.round(fs * 0.5)
  const barH = fs + barPad * 2
  const barR = Math.round(fs * 0.7)
  const barShadowOff = Math.max(Math.round(barH * 0.2), 3)
  const barShadowBlur = Math.max(Math.round(barH * 0.5), 8)
  const tspans = buildGenreTspans(genreName, voteStr, yearStr, gap, gapStar)
  const pathD = `M 0,${barH} L 0,${barR} A ${barR},${barR} 0 0,1 ${barR},0 L ${pw - barR},0 A ${barR},${barR} 0 0,1 ${pw},${barR} L ${pw},${barH} Z`
  const defs = `<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="-${barShadowOff}" stdDeviation="${barShadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text text-anchor="middle" x="${pw / 2 + textOffsetX}" y="${barH / 2}" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}">${tspans}</text>`
  const borderLine = `<line x1="0" y1="0" x2="${pw}" y2="0" stroke="rgba(0,0,0,0.10)" stroke-width="1"/>`
  const inner = `<path d="${pathD}" fill="rgba(255,255,255,0.80)" filter="url(#sh)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${barH}">${defs}${inner}${borderLine}${textEl}</svg>`, w: pw, h: barH }
}

export function buildGenrePillSvg(genreName: string, voteStr: string, yearStr: string, fs: number, bgColor: string, textColor: string, textOffsetX = 0) {
  const gap = Math.round(fs / 3)
  const gapStar = Math.round(fs / 6)
  const pillPad = Math.round(fs * 0.35)
  const pillR = Math.round(fs * 0.8)
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
  const pillW = dims.textContentW + pillPad * 3
  const pillH = fs + pillPad * 2
  const tspans = buildGenreTspans(genreName, voteStr, yearStr, gap, gapStar)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pillW}" height="${pillH}"><rect width="${pillW}" height="${pillH}" rx="${pillR}" fill="${bgColor}"/><text text-anchor="middle" x="${pillW / 2 + textOffsetX}" y="${pillH / 2}" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}">${tspans}</text></svg>`
  return { svg, w: pillW, h: pillH }
}

export function buildGenreTextSvg(genreName: string, voteStr: string, yearStr: string, fs: number, textColor: string, style: string, textOffsetX = 0) {
  const gap = Math.round(fs / 3)
  const gapStar = Math.round(fs / 6)
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
  const tspans = buildGenreTspans(genreName, voteStr, yearStr, gap, gapStar)
  const shadowPad = style === "shadow" ? 8 : 0
  const shadowDrop = style === "shadow" ? 5 : 0
  const renderW = dims.totalW + shadowPad * 2
  const renderH = dims.svgH + shadowDrop
  let defs = ""
  let filterAttr = ""
  if (style === "shadow") {
    defs = `<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="rgba(0,0,0,0.6)"/></filter></defs>`
    filterAttr = ' filter="url(#sh)"'
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<text text-anchor="middle" x="${shadowPad + dims.totalW / 2 + textOffsetX}" y="${shadowDrop + dims.svgH / 2}" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}"${filterAttr}>${tspans}</text></svg>`
  return { svg, w: renderW, h: renderH }
}

export function buildRankingBarSvg(fullText: string, pw: number, fs: number, textColor: string, bg: string) {
  const pt = Math.round(fs * 0.35)
  const pb = pt
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const pathD = `M 0,0 L ${pw},0 L ${pw},${svgH - r} A ${r},${r} 0 0,1 ${pw - r},${svgH} L ${r},${svgH} A ${r},${r} 0 0,1 0,${svgH - r} Z`
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text x="${pw / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="900" font-size="${fs}" fill="${textColor}" letter-spacing="0.025em">${escSvg(fullText)}</text>`
  const inner = `<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${svgH}">${defs}${inner}${textEl}</svg>`, w: pw, h: svgH }
}

export function buildRankingDefaultSvg(fullText: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.5)
  const pb = pt
  const rankPart = String(fullText).split(" ")[0].replace("#", "").length * fs * CHAR_WIDTH
  const spacePart = fs * 0.35
  const labelPart = fullText.split(" ").slice(1).join(" ").length * fs * CHAR_WIDTH
  const textW = Math.round(rankPart + spacePart + labelPart)
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
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="900" font-size="${fs}" fill="${textColor}" letter-spacing="0.025em">${escSvg(fullText)}</text>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildExtraBarSvg(label: string, pw: number, fs: number, textColor: string, bg: string) {
  const pt = Math.round(fs * 0.35)
  const pb = pt
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const pathD = `M 0,0 L ${pw},0 L ${pw},${svgH - r} A ${r},${r} 0 0,1 ${pw - r},${svgH} L ${r},${svgH} A ${r},${r} 0 0,1 0,${svgH - r} Z`
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text x="${pw / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}" letter-spacing="0.025em">${escSvg(label)}</text>`
  const inner = `<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${svgH}">${defs}${inner}${textEl}</svg>`, w: pw, h: svgH }
}

export function buildExtraDefaultSvg(label: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.5)
  const pb = pt
  const textW = Math.max(Math.round(label.length * fs * CHAR_WIDTH), fs)
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
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${fs}" fill="${textColor}" letter-spacing="0.025em">${escSvg(label)}</text>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>${textEl}</svg>`, w: renderW, h: renderH }
}
