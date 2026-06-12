let filterUid = 0
function uid(): string { return `f${++filterUid}` }

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function genreRatingSVG(genreName: string, voteAverage: number, pw: number): { svg: string; totalW: number; svgH: number } {
  const voteStr = voteAverage.toFixed(1)
  const fullText = `${genreName} • ★ ${voteStr}`
  const fontSize = Math.round(60 * pw / 1000)
  const charW = fontSize * 0.58
  const totalW = Math.round(genreName.length * charW + fontSize * 0.35 + fontSize * 0.30 + fontSize * 0.35 + fontSize * 1.0 + fontSize * 0.35 + voteStr.length * charW)
  const svgH = Math.round(fontSize * 1.6)
  const textY = Math.round(svgH * 0.72)
  const fid = uid()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}">
  <defs>
    <filter id="${fid}" x="-10%" y="-20%" width="120%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.12)"/>
    </filter>
  </defs>
  <text x="${totalW / 2}" y="${textY}" text-anchor="middle" fill="rgba(255,255,255,.90)" font-size="${fontSize}" font-family="Noto Sans, sans-serif" font-weight="650" letter-spacing="-0.02em" filter="url(#${fid})">${escapeXml(fullText)}</text>
</svg>`
  return { svg, totalW, svgH }
}

export function bottomGradientSVG(pw: number, ph: number): { svg: string; top: number } {
  const gh = Math.round(ph * 0.18)
  const top = ph - gh
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${gh}" viewBox="0 0 ${pw} ${gh}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.50)"/>
    </linearGradient>
  </defs>
  <rect width="${pw}" height="${gh}" fill="url(#g)"/>
</svg>`
  return { svg, top }
}

export function topGradientSVG(pw: number, badgeH: number): { svg: string; h: number } {
  const gh = Math.max(Math.round(badgeH * 1.5), Math.round(pw * 0.06))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${gh}" viewBox="0 0 ${pw} ${gh}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.55)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
  </defs>
  <rect width="${pw}" height="${gh}" fill="url(#g)"/>
</svg>`
  return { svg, h: gh }
}

export function rankingBadgeSVG(rank: number, pw: number, color = '', period = "day"): { svg: string; totalW: number; svgH: number; cornerR: number } {
  const periodMap: Record<string, string> = { day: "Oggi", week: "Settimana" }
  const periodText = periodMap[period] || "Oggi"
  const rankStr = String(rank)
  const fullText = `#${rankStr} ${periodText}`
  const s = pw / 1000
  const fontSize = Math.round(72 * s)
  const charW = fontSize * 0.58
  const textW = Math.round(rankStr.length * charW + fontSize * 0.35 + periodText.length * charW)
  const px = Math.round(100 * s) * 2
  const pt = Math.round(12 * s)
  const pb = Math.round(56 * s)
  const totalW = textW + px
  const svgH = fontSize + pt + pb
  const textY = Math.round((pt + fontSize + pb) / 2 + fontSize * 0.35)
  const r = Math.round(pb * 1.0)
  const lum = color.startsWith('#') ? hexLuminance(color) : 0.7
  const isDark = lum < 0.5
  const bgTop = isDark ? '#2a2a2a' : '#e0e0e0'
  const bgBot = isDark ? '#111111' : '#c0c0c0'
  const textFill = isDark ? '#fff' : '#111'
  const rimColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'
  const shadowColor = 'rgba(0,0,0,0.30)'
  const textShadow = isDark ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.40)'
  const fid = uid()
  const tid = uid()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgTop}"/>
      <stop offset="100%" stop-color="${bgBot}"/>
    </linearGradient>
    <filter id="${fid}" x="-20%" y="-20%" width="140%" height="200%">
      <feDropShadow dx="0" dy="${Math.round(5 * s)}" stdDeviation="${Math.round(10 * s)}" flood-color="${shadowColor}"/>
    </filter>
    <filter id="${tid}" x="-20%" y="-20%" width="140%" height="200%">
      <feDropShadow dx="0" dy="${Math.round(1 * s)}" stdDeviation="${Math.round(1 * s)}" flood-color="${textShadow}"/>
    </filter>
  </defs>
  <g filter="url(#${fid})">
    <path d="M 0,0 L ${totalW},0 L ${totalW},${svgH-r} A ${r} ${r} 0 0 1 ${totalW-r} ${svgH} L ${r},${svgH} A ${r} ${r} 0 0 1 0 ${svgH-r} Z" fill="url(#g)"/>
    <path d="M ${r},0 L ${totalW - r},0" stroke="${rimColor}" stroke-width="${Math.round(1.5 * s)}" fill="none"/>
    <text x="${totalW / 2}" y="${textY}" text-anchor="middle" fill="${textFill}" font-size="${fontSize}" font-family="Noto Sans, sans-serif" font-weight="800" letter-spacing="-0.01em" filter="url(#${tid})">${escapeXml(fullText)}</text>
  </g>
</svg>`
  return { svg, totalW, svgH, cornerR: r }
}

export function extraBadgeSVG(label: string, pw: number, color = ''): { svg: string; totalW: number; svgH: number; cornerR: number } {
  const s = pw / 1000
  const fontSize = Math.round(72 * s)
  const charW = fontSize * 0.58
  const textW = Math.max(Math.round(label.length * charW), Math.round(72 * s))
  const px = Math.max(Math.round(textW * 0.15), Math.round(40 * s))
  const pt = Math.round(12 * s)
  const pb = Math.round(56 * s)
  const totalW = textW + px
  const svgH = fontSize + pt + pb
  const textY = Math.round((pt + fontSize + pb) / 2 + fontSize * 0.35)
  const r = Math.round(pb * 1.0)
  const lum = color.startsWith('#') ? hexLuminance(color) : 0.7
  const isDark = lum < 0.5
  const bgTop = isDark ? '#2a2a2a' : '#e0e0e0'
  const bgBot = isDark ? '#111111' : '#c0c0c0'
  const textFill = isDark ? '#fff' : '#111'
  const rimColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'
  const shadowColor = 'rgba(0,0,0,0.30)'
  const textShadow = isDark ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.40)'
  const fid = uid()
  const tid = uid()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgTop}"/>
      <stop offset="100%" stop-color="${bgBot}"/>
    </linearGradient>
    <filter id="${fid}" x="-20%" y="-20%" width="140%" height="200%">
      <feDropShadow dx="0" dy="${Math.round(5 * s)}" stdDeviation="${Math.round(10 * s)}" flood-color="${shadowColor}"/>
    </filter>
    <filter id="${tid}" x="-20%" y="-20%" width="140%" height="200%">
      <feDropShadow dx="0" dy="${Math.round(1 * s)}" stdDeviation="${Math.round(1 * s)}" flood-color="${textShadow}"/>
    </filter>
  </defs>
  <g filter="url(#${fid})">
    <path d="M 0,0 L ${totalW},0 L ${totalW},${svgH-r} A ${r} ${r} 0 0 1 ${totalW-r} ${svgH} L ${r},${svgH} A ${r} ${r} 0 0 1 0 ${svgH-r} Z" fill="url(#g)"/>
    <path d="M ${r},0 L ${totalW - r},0" stroke="${rimColor}" stroke-width="${Math.round(1.5 * s)}" fill="none"/>
    <text x="${totalW / 2}" y="${textY}" text-anchor="middle" fill="${textFill}" font-size="${fontSize}" font-family="Noto Sans, sans-serif" font-weight="800" letter-spacing="-0.01em" filter="url(#${tid})">${escapeXml(label)}</text>
  </g>
</svg>`
  return { svg, totalW, svgH, cornerR: r }
}