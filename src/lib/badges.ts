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

export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function adjustColor(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(amount * 255)))
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(amount * 255)))
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(amount * 255)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function hexToHsl(hex: string): [number, number, number] {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const ri = Math.max(0, Math.min(255, Math.round(r * 255)))
  const gi = Math.max(0, Math.min(255, Math.round(g * 255)))
  const bi = Math.max(0, Math.min(255, Math.round(b * 255)))
  return `#${ri.toString(16).padStart(2, '0')}${gi.toString(16).padStart(2, '0')}${bi.toString(16).padStart(2, '0')}`
}

function badgeColors(color: string): { bgTop: string; bgBot: string; textFill: string; textShadow: string } {
  if (!color || !color.startsWith('#')) {
    return {
      bgTop: '#ffffff',
      bgBot: '#f0f0f0',
      textFill: '#1a1a1a',
      textShadow: 'rgba(0,0,0,0.10)',
    }
  }

  const lit = adjustColor(color, 0.15)
  const bgLum = relativeLuminance(lit)

  // If color is light, use a DARKENED version with white text
  if (bgLum > 0.5) {
    const dark = adjustColor(color, -0.4)
    const bgBot = adjustColor(dark, -0.06)
    return { bgTop: dark, bgBot, textFill: '#fff', textShadow: 'rgba(0,0,0,0.40)' }
  }

  // Otherwise default white bg, dark text
  return { bgTop: '#ffffff', bgBot: '#f0f0f0', textFill: '#1a1a1a', textShadow: 'rgba(0,0,0,0.10)' }
}

export function genreRatingSVG(genreName: string, voteAverage: number, pw: number): { svg: string; totalW: number; svgH: number } {
  const voteStr = voteAverage.toFixed(1)
  const fontSize = Math.round(24 * pw / 380)
  const charW = fontSize * 0.58
  const genreW = genreName.length * charW
  const bulletFontSize = Math.round(fontSize * 19 / 24)
  const bulletW = Math.round(fontSize * 0.3)
  const rightW = voteStr.length * fontSize * 0.55
  const starR = Math.round(fontSize * 0.45)
  const starW = starR * 2
  const gap = Math.round(fontSize / 3)
  const gap2 = Math.round(fontSize / 4)
  const pad = Math.round(fontSize * 0.5)
  const totalW = Math.round(genreW + gap + bulletW + gap + starW + gap2 + rightW + pad * 2)
  const svgH = Math.round(fontSize * 1.6)
  const axisY = Math.round(svgH / 2)
  const sin54 = Math.sin(54 * Math.PI / 180)
  const starY = axisY + Math.round(starR * (1 - sin54) / 2)
  const textY = axisY + Math.round(fontSize * 0.28)
  const fid = uid()

  const starPts = []
  for (let i = 0; i < 5; i++) {
    const oa = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const ia = oa + Math.PI / 5
    starPts.push(`${(starR * Math.cos(oa)).toFixed(2)},${(starR * Math.sin(oa)).toFixed(2)}`)
    starPts.push(`${(starR * 0.4 * Math.cos(ia)).toFixed(2)},${(starR * 0.4 * Math.sin(ia)).toFixed(2)}`)
  }

  const genreX = pad
  const bulletX = pad + genreW + gap
  const starX = pad + genreW + gap + bulletW + gap + starR
  const rightX = pad + genreW + gap + bulletW + gap + starW + gap2

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}">
  <defs>
    <filter id="${fid}" x="-10%" y="-20%" width="120%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.12)"/>
    </filter>
  </defs>
  <text x="${genreX}" y="${textY}" text-anchor="start" fill="#fff" font-size="${fontSize}" font-family="sans-serif" font-weight="500" filter="url(#${fid})">${escapeXml(genreName)}</text>
  <text x="${bulletX}" y="${textY}" text-anchor="start" fill="rgba(255,255,255,0.6)" font-size="${bulletFontSize}" font-family="sans-serif" font-weight="400" filter="url(#${fid})">•</text>
  <polygon points="${starPts.join(' ')}" transform="translate(${starX}, ${starY})" fill="#F5C518"/>
  <text x="${rightX}" y="${textY}" text-anchor="start" fill="#fff" font-size="${fontSize}" font-family="sans-serif" font-weight="600" filter="url(#${fid})">${escapeXml(voteStr)}</text>
</svg>`
  return { svg, totalW, svgH }
}

export function bottomGradientSVG(pw: number, ph: number): { svg: string; top: number } {
  const gh = Math.round(ph * 0.18)
  const top = ph - gh
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${gh}" viewBox="0 0 ${pw} ${gh}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.7)"/>
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

export function rankingBadgeSVG(rank: number, pw: number, color = '', period = "day", label?: string): { svg: string; totalW: number; svgH: number; cornerR: number } {
  const periodMap: Record<string, string> = { day: "Oggi", week: "Settimana" }
  const periodText = label || periodMap[period] || "Oggi"
  const rankStr = String(rank)
  const fullText = `#${rankStr} ${periodText}`
  const fontSize = Math.round(24 * pw / 380)
  const charW = fontSize * 0.58
  const textW = Math.round(rankStr.length * charW + fontSize * 0.35 + periodText.length * charW)
  const px = Math.round(fontSize * 100 / 72) * 2
  const pt = Math.round(fontSize * 12 / 72)
  const pb = Math.round(fontSize * 56 / 72)
  const totalW = textW + px
  const svgH = fontSize + pt + pb
  const textY = Math.round((pt + fontSize + pb) / 2 + fontSize * 0.35)
  const r = Math.round(pb * 1.0)
  const { bgTop, bgBot, textFill, textShadow } = badgeColors(color)
  const shadowColor = 'rgba(0,0,0,0.30)'
  const fid = uid()
  const tid = uid()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgTop}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${bgBot}" stop-opacity="0.85"/>
    </linearGradient>
    <filter id="${fid}" x="-20%" y="-20%" width="140%" height="200%">
      <feDropShadow dx="0" dy="${Math.round(fontSize * 5 / 72)}" stdDeviation="${Math.round(fontSize * 10 / 72)}" flood-color="${shadowColor}"/>
    </filter>
    <filter id="${tid}" x="-20%" y="-20%" width="140%" height="200%">
      <feDropShadow dx="0" dy="${Math.round(fontSize * 1 / 72)}" stdDeviation="${Math.round(fontSize * 1 / 72)}" flood-color="${textShadow}"/>
    </filter>
  </defs>
  <g filter="url(#${fid})">
    <path d="M 0,0 L ${totalW},0 L ${totalW},${svgH-r} A ${r} ${r} 0 0 1 ${totalW-r} ${svgH} L ${r},${svgH} A ${r} ${r} 0 0 1 0 ${svgH-r} Z" fill="url(#g)"/>
    <text x="${totalW / 2}" y="${textY}" text-anchor="middle" fill="${textFill}" font-size="${fontSize}" font-family="sans-serif" font-weight="800" letter-spacing="-0.01em" filter="url(#${tid})">${escapeXml(fullText)}</text>
  </g>
</svg>`
  return { svg, totalW, svgH, cornerR: r }
}

export function extraBadgeSVG(label: string, pw: number, color = ''): { svg: string; totalW: number; svgH: number; cornerR: number } {
  const fontSize = Math.round(24 * pw / 380)
  const charW = fontSize * 0.58
  const textW = Math.max(Math.round(label.length * charW), fontSize)
  const px = Math.max(Math.round(textW * 0.15), Math.round(fontSize * 40 / 72))
  const pt = Math.round(fontSize * 12 / 72)
  const pb = Math.round(fontSize * 56 / 72)
  const totalW = textW + px
  const svgH = fontSize + pt + pb
  const textY = Math.round((pt + fontSize + pb) / 2 + fontSize * 0.35)
  const r = Math.round(pb * 1.0)
  const { bgTop, bgBot, textFill, textShadow } = badgeColors(color)
  const shadowColor = 'rgba(0,0,0,0.30)'
  const fid = uid()
  const tid = uid()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgTop}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${bgBot}" stop-opacity="0.85"/>
    </linearGradient>
    <filter id="${fid}" x="-20%" y="-20%" width="140%" height="200%">
      <feDropShadow dx="0" dy="${Math.round(fontSize * 5 / 72)}" stdDeviation="${Math.round(fontSize * 10 / 72)}" flood-color="${shadowColor}"/>
    </filter>
    <filter id="${tid}" x="-20%" y="-20%" width="140%" height="200%">
      <feDropShadow dx="0" dy="${Math.round(fontSize * 1 / 72)}" stdDeviation="${Math.round(fontSize * 1 / 72)}" flood-color="${textShadow}"/>
    </filter>
  </defs>
  <g filter="url(#${fid})">
    <path d="M 0,0 L ${totalW},0 L ${totalW},${svgH-r} A ${r} ${r} 0 0 1 ${totalW-r} ${svgH} L ${r},${svgH} A ${r} ${r} 0 0 1 0 ${svgH-r} Z" fill="url(#g)"/>
    <text x="${totalW / 2}" y="${textY}" text-anchor="middle" fill="${textFill}" font-size="${fontSize}" font-family="sans-serif" font-weight="800" letter-spacing="-0.01em" filter="url(#${tid})">${escapeXml(label)}</text>
  </g>
</svg>`
  return { svg, totalW, svgH, cornerR: r }
}

export const GENRE_FALLBACK: Record<string, string> = {
  Action: '#D4A574', Azione: '#D4A574',
  Horror: '#8B0000', Horreur: '#8B0000',
  Comedy: '#F4D03F', Commedia: '#F4D03F', Comédie: '#F4D03F',
  Drama: '#5D6D7E', Dramma: '#5D6D7E', Drame: '#5D6D7E',
  Thriller: '#4A4A4A',
  Adventure: '#2E86AB', Avventura: '#2E86AB', Aventure: '#2E86AB',
  Animation: '#E67E22', Animazione: '#E67E22',
  'Science Fiction': '#3498DB', 'Science-Fiction': '#3498DB', Fantascienza: '#3498DB',
  Romance: '#E74C3C', Romantico: '#E74C3C',
  Documentary: '#7F8C8D', Documentario: '#7F8C8D',
  Mystery: '#6C3483', Mistero: '#6C3483',
  Fantasy: '#8E44AD', Fantasia: '#8E44AD',
  War: '#6B4226', Guerra: '#6B4226',
  Western: '#A0522D',
  Music: '#1ABC9C', Musica: '#1ABC9C',
  Family: '#2ECC71', Famiglia: '#2ECC71',
  History: '#A67B5B', Storico: '#A67B5B', Storia: '#A67B5B',
  Crime: '#2C3E50', Crimine: '#2C3E50',
}