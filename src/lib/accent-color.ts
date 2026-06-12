export interface AccentResult { r: number; g: number; b: number }

export function findAccentColor(pixels: Uint8ClampedArray | Buffer, width: number, height: number, genre: string): AccentResult {
  const step = 2
  const vals: { r: number; g: number; b: number; s: number; l: number }[] = []

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const l = (max + min) / 2
      const d = max - min
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (s < 0.05 || l < 0.03 || l > 0.97) continue
      vals.push({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], s, l })
    }
  }

  if (vals.length === 0) {
    const GENRE_FALLBACK: Record<string, string> = {
      Action: '#D4A574', Azione: '#D4A574', Horror: '#8B0000', Commedia: '#F4D03F',
      Dramma: '#5D6D7E', Thriller: '#4A4A4A', Avventura: '#2E86AB', Animazione: '#E67E22',
      Fantascienza: '#3498DB', Romantico: '#E74C3C', Documentario: '#7F8C8D',
      Mistero: '#6C3483', Fantasia: '#8E44AD', Guerra: '#6B4226', Western: '#A0522D',
      Musica: '#1ABC9C', Famiglia: '#2ECC71', Storico: '#A67B5B', Crimine: '#2C3E50',
    }
    const fb = GENRE_FALLBACK[genre] || GENRE_FALLBACK[Object.keys(GENRE_FALLBACK)[0]] || '#C0C0C0'
    return { r: parseInt(fb.slice(1, 3), 16), g: parseInt(fb.slice(3, 5), 16), b: parseInt(fb.slice(5, 7), 16) }
  }

  const n = vals.length
  const bgR = vals.reduce((a, p) => a + p.r, 0) / n
  const bgG = vals.reduce((a, p) => a + p.g, 0) / n
  const bgB = vals.reduce((a, p) => a + p.b, 0) / n

  let bestScore = -1, best = vals[0]
  for (const p of vals) {
    const chroma = p.s * (1 - Math.abs(p.l - 0.5))
    const dr = p.r - bgR, dg = p.g - bgG, db = p.b - bgB
    const divergence = Math.sqrt(dr * dr + dg * dg + db * db) / 441.67
    const score = chroma * divergence
    if (score > bestScore) { bestScore = score; best = p }
  }

  let cr = best.r, cg = best.g, cb = best.b
  const clampLum = 0.2126 * cr / 255 + 0.7152 * cg / 255 + 0.0722 * cb / 255
  if (clampLum < 0.4) {
    cr = Math.round(cr + (255 - cr) * 0.2)
    cg = Math.round(cg + (255 - cg) * 0.2)
    cb = Math.round(cb + (255 - cb) * 0.2)
  } else if (clampLum > 0.7) {
    cr = Math.round(cr * 0.85)
    cg = Math.round(cg * 0.85)
    cb = Math.round(cb * 0.85)
  }
  return { r: Math.max(0, Math.min(255, cr)), g: Math.max(0, Math.min(255, cg)), b: Math.max(0, Math.min(255, cb)) }
}

export function topEdgeAverage(pixels: Uint8ClampedArray | Buffer, width: number, height: number): { r: number; g: number; b: number } {
  const rowCount = Math.max(Math.round(height * 0.08), 3)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = 0; y < rowCount; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]
      n++
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}
