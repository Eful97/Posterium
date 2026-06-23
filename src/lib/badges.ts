export function bottomGradientSVG(pw: number, ph: number, color = "#000000", opacity = 1, pct = 50, fade = 0, dir = "up"): { svg: string; top: number; height: number } {
  const gh = Math.max(Math.round(ph * pct / 100), 100)
  const top = dir === "up" ? ph - gh : 0
  const hex = color.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16) || 0
  const g = parseInt(hex.substring(2, 4), 16) || 0
  const b = parseInt(hex.substring(4, 6), 16) || 0
  const cappedFade = Math.min(fade, 100)
  const svgSolidPct = 100 - cappedFade
  const svgFadeEnd = Math.max(100 - Math.min(cappedFade + 20, 100), 0)
  const y1 = dir === "up" ? "0" : "1"
  const y2 = dir === "up" ? "1" : "0"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${gh}">
  <defs>
    <linearGradient id="g" x1="0" y1="${y1}" x2="0" y2="${y2}">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},0)"/>
      <stop offset="${svgFadeEnd}%" stop-color="rgba(${r},${g},${b},0)"/>
      <stop offset="${svgSolidPct}%" stop-color="rgba(${r},${g},${b},${opacity})"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},${opacity})"/>
    </linearGradient>
  </defs>
  <rect width="${pw}" height="${gh}" fill="url(#g)"/>
</svg>`
  return { svg, top, height: gh }
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
