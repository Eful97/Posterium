let filterUid = 0
function uid(): string { return `f${++filterUid}` }

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
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

export function genreRatingSVG(genreName: string, voteAverage: number, pw: number): { svg: string; totalW: number; svgH: number } {
  const voteStr = voteAverage.toFixed(1)
  const fontSize = Math.round(24 * pw / 380)
  const starFontSize = Math.round(20 * pw / 380)
  const charW = fontSize * 0.58
  const starCharW = starFontSize * 0.58
  const genreW = Math.round(genreName.length * charW)
  const bulletW = Math.round(starFontSize * 0.4)
  const starW = Math.round(starFontSize * 0.75)
  const voteW = Math.round(voteStr.length * charW)
  const gap = Math.round(fontSize * 0.33)
  const pad = Math.round(fontSize * 0.35)
  const totalW = Math.round(genreW + gap + bulletW + gap + starW + gap + voteW + pad * 2)
  const svgH = Math.round(fontSize * 1.6)
  const textY = Math.round(svgH * 0.72)
  const fid = uid()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}">
  <defs>
    <filter id="${fid}" x="-10%" y="-20%" width="120%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>
  <text x="${pad}" y="${textY}" text-anchor="start" fill="#e5e7eb" font-size="${fontSize}" font-family="sans-serif" font-weight="700" filter="url(#${fid})">${escapeXml(genreName)}</text>
  <text x="${pad + genreW + gap}" y="${textY}" text-anchor="start" fill="#e5e7eb" font-size="${starFontSize}" font-family="sans-serif" font-weight="700" filter="url(#${fid})">•</text>
  <text x="${pad + genreW + gap + bulletW + gap}" y="${textY}" text-anchor="start" fill="#e5e7eb" font-size="${starFontSize}" font-family="sans-serif" font-weight="700" filter="url(#${fid})">★</text>
  <text x="${pad + genreW + gap + bulletW + gap + starW + gap}" y="${textY}" text-anchor="start" fill="#e5e7eb" font-size="${fontSize}" font-family="sans-serif" font-weight="700" filter="url(#${fid})">${escapeXml(voteStr)}</text>
</svg>`
  return { svg, totalW, svgH }
}

export function bottomGradientSVG(pw: number, ph: number): { svg: string; top: number } {
  const gh = Math.max(Math.round(ph * 0.4), 100)
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
  const fontSize = Math.round(20 * pw / 380)
  const charW = fontSize * 0.58
  const textW = Math.round(rankStr.length * charW + fontSize * 0.35 + periodText.length * charW)
  const px = Math.round(fontSize * 1.2)
  const pt = Math.round(fontSize * 0.25)
  const pb = Math.round(fontSize * 0.25)
  const totalW = textW + px * 2
  const svgH = fontSize + pt + pb
  const textY = Math.round(pt + fontSize * 0.78)
  const r = Math.round(fontSize * 0.67)
  const shadowColor = 'rgba(0,0,0,0.30)'
  const fid = uid()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}">
  <defs>
    <filter id="${fid}" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="${Math.round(fontSize * 0.08)}" stdDeviation="${Math.round(fontSize * 0.15)}" flood-color="${shadowColor}"/>
    </filter>
  </defs>
  <path d="M 0,0 L ${totalW},0 L ${totalW},${svgH-r} A ${r} ${r} 0 0 1 ${totalW-r} ${svgH} L ${r},${svgH} A ${r} ${r} 0 0 1 0 ${svgH-r} Z" fill="#000000" fill-opacity="0.6" filter="url(#${fid})"/>
  <text x="${totalW / 2}" y="${textY}" text-anchor="middle" fill="#fff" fill-opacity="0.9" font-size="${fontSize}" font-family="sans-serif" font-weight="600" letter-spacing="0.025em">${escapeXml(fullText)}</text>
</svg>`
  return { svg, totalW, svgH, cornerR: r }
}

export function extraBadgeSVG(label: string, pw: number, color = ''): { svg: string; totalW: number; svgH: number; cornerR: number } {
  const fontSize = Math.round(20 * pw / 380)
  const charW = fontSize * 0.58
  const textW = Math.max(Math.round(label.length * charW), fontSize)
  const px = Math.round(fontSize * 1.2)
  const pt = Math.round(fontSize * 0.25)
  const pb = Math.round(fontSize * 0.25)
  const totalW = textW + px * 2
  const svgH = fontSize + pt + pb
  const textY = Math.round(pt + fontSize * 0.78)
  const r = Math.round(fontSize * 0.67)
  const shadowColor = 'rgba(0,0,0,0.30)'
  const fid = uid()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}">
  <defs>
    <filter id="${fid}" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="${Math.round(fontSize * 0.08)}" stdDeviation="${Math.round(fontSize * 0.15)}" flood-color="${shadowColor}"/>
    </filter>
  </defs>
  <path d="M 0,0 L ${totalW},0 L ${totalW},${svgH-r} A ${r} ${r} 0 0 1 ${totalW-r} ${svgH} L ${r},${svgH} A ${r} ${r} 0 0 1 0 ${svgH-r} Z" fill="#000000" fill-opacity="0.6" filter="url(#${fid})"/>
  <text x="${totalW / 2}" y="${textY}" text-anchor="middle" fill="#fff" fill-opacity="0.9" font-size="${fontSize}" font-family="sans-serif" font-weight="600" letter-spacing="0.025em">${escapeXml(label)}</text>
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