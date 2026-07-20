import { GENRE_FALLBACK } from "./badges"

export interface AccentResult { r: number; g: number; b: number }

/** sRGB linearization per componente [0,255] → [0,1] */
function linearize(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/** Luminanza relativa sRGB (WCAG) */
function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** Rapporto di contrasto WCAG tra due luminanze */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Sceglie il colore testo con miglior contrasto WCAG.
 * Valuta colore chiaro (`dark`) e scuro (`light`) contro lo sfondo.
 */
export function textColorForBg(hex: string, dark: string = "#ffffff", light: string = "rgba(0,0,0,0.80)"): string {
  if (!hex || hex === "#555555") return light
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const bgLum = relativeLuminance(r, g, b)

  const best = [dark, light]
    .map((textColor) => {
      const [tr, tg, tb, ta] = parseColor(textColor)
      const effectiveR = ta < 1 ? Math.round(tr * ta + r * (1 - ta)) : tr
      const effectiveG = ta < 1 ? Math.round(tg * ta + g * (1 - ta)) : tg
      const effectiveB = ta < 1 ? Math.round(tb * ta + b * (1 - ta)) : tb
      const textLum = relativeLuminance(effectiveR, effectiveG, effectiveB)
      return { color: textColor, ratio: contrastRatio(textLum, bgLum) }
    })
    .sort((a, b) => b.ratio - a.ratio)[0]

  return best.color
}

/** Parsea "#rrggbb" o "rgba(r,g,b,a)" restituendo [r,g,b,alpha]. Hex: alpha=1 */
function parseColor(color: string): [number, number, number, number] {
  if (color.startsWith("#")) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        1,
      ]
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      1,
    ]
  }
  const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/)
  if (match) {
    return [
      parseInt(match[1]),
      parseInt(match[2]),
      parseInt(match[3]),
      match[4] !== undefined ? parseFloat(match[4]) : 1,
    ]
  }
  return [0, 0, 0, 1]
}

/** Approssimazione hue veloce da RGB normalizzati [0,1], risultato [0, 360) */
function fastHue(r: number, g: number, b: number, d: number, max: number): number {
  if (d === 0) return 0
  let h: number
  if (max === r) h = 60 * ((g - b) / d)
  else if (max === g) h = 60 * (2 + (b - r) / d)
  else h = 60 * (4 + (r - g) / d)
  return h < 0 ? h + 360 : h
}

/** Euristico colore pelle: R dominante e caldo, hue 0-50°, saturazione/luminosità medio-bassa */
function isSkinTone(r255: number, g255: number, b255: number, s: number, l: number, hue?: number): boolean {
  if (s < 0.06 || s > 0.60) return false
  if (l < 0.20 || l > 0.88) return false
  // Hue nella gamma rossi/arancio/gialli
  if (hue !== undefined && (hue < 0 || hue > 55)) return false
  // Test rossastro veloce se hue non disponibile
  if (hue === undefined && (r255 <= g255 || r255 <= b255)) return false
  if (r255 - b255 < 18) return false
  return true
}

/** Convert HSL to RGB (H: 0-360, S: 0-1, L: 0-1) */
function hslToRgb(H: number, S: number, L: number): AccentResult {
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs((H / 60) % 2 - 1))
  const m = L - c / 2
  let r1 = 0, g1 = 0, b1 = 0
  if (H < 60) { r1 = c; g1 = x }
  else if (H < 120) { r1 = x; g1 = c }
  else if (H < 180) { r1 = 0; g1 = c; b1 = x }
  else if (H < 240) { r1 = 0; g1 = x; b1 = c }
  else if (H < 300) { r1 = x; g1 = 0; b1 = c }
  else { r1 = c; g1 = 0; b1 = x }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  }
}

export function findAccentColor(pixels: Uint8ClampedArray | Buffer, width: number, height: number, genre: string): AccentResult {
  const step = 2
  let sumLuma = 0, countLuma = 0
  // Circular mean for weighted average hue (by saturation×chroma)
  let hueSin = 0, hueCos = 0, totalW = 0
  // Quadrant energy: warm (red/orange/yellow), green, cool (cyan/blue), purple
  let qWarm = 0, qGreen = 0, qCool = 0, qPurple = 0

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const pr = pixels[i], pg = pixels[i + 1], pb = pixels[i + 2]
      const alpha = pixels[i + 3]
      // Skip transparent/semi-transparent pixels (e.g. logo PNG)
      if (alpha < 128) continue
      sumLuma += 0.2126 * pr + 0.7152 * pg + 0.0722 * pb
      countLuma++

      const r = pr / 255, g = pg / 255, b = pb / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const l = (max + min) / 2, d = max - min
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (s < 0.08 || l < 0.05 || l > 0.95) continue

      const hue = fastHue(r, g, b, d, max)
      // Weight: saturation × chroma (squared to emphasise pure colours)
      const chroma = s * (1 - Math.abs(l - 0.5) * 2)
      const w = chroma * chroma

      hueSin += Math.sin(hue * Math.PI / 180) * w
      hueCos += Math.cos(hue * Math.PI / 180) * w
      totalW += w

      // Hue quadrant classification
      if (hue < 60 || hue >= 330) qWarm += w
      else if (hue >= 60 && hue < 180) qGreen += w
      else if (hue >= 180 && hue < 270) qCool += w
      else qPurple += w
    }
  }

  const bgLum = countLuma > 0 ? sumLuma / countLuma / 255 : 0.5

  // No chromatic pixels → use genre fallback
  if (totalW === 0) {
    const fb = GENRE_FALLBACK[genre] || '#C0C0C0'
    const cr = parseInt(fb.slice(1, 3), 16)
    const cg = parseInt(fb.slice(3, 5), 16)
    const cb = parseInt(fb.slice(5, 7), 16)
    return pushContrast({ r: cr, g: cg, b: cb }, bgLum)
  }

  // Weighted average hue (circular mean)
  const avgHue = ((Math.atan2(hueSin, hueCos) * 180 / Math.PI) % 360 + 360) % 360

  // Quadrant proportions
  const tq = qWarm + qGreen + qCool + qPurple
  const pWarm = qWarm / tq, pGreen = qGreen / tq, pCool = qCool / tq, pPurple = qPurple / tq

  // --- Generate accent colour based on poster character ---
  let targetHue: number, targetSat: number, targetLum: number

  if (bgLum < 0.5) {
    // DARK POSTER → light, desaturated accent
    // Flatter curve: mostly 0.78-0.88 regardless of how dark the poster is
    targetLum = Math.min(0.90, 0.78 + (0.5 - bgLum) * 0.25)

    // Determine the dominant colour region
    const isRed = (avgHue < 30 || avgHue >= 340) && pWarm > 0.35
    const isGreen = pGreen > 0.35
    const isBlue = pCool > 0.40
    const isPurple = pPurple > 0.25 || (pWarm > 0.30 && avgHue >= 320)
    // Mixed warm+green (e.g. Breaking Bad's yellow-green palette)
    const isMixedGreenWarm = pGreen > 0.30 && pWarm > 0.30 && !isRed && !isBlue

    if (isBlue) {
      // Cool-dominant (blue/cyan) → warm cream complement
      targetHue = 43
      targetSat = Math.min(0.55, 0.30 + (0.5 - bgLum) * 0.35)
    } else if (isPurple && !isMixedGreenWarm) {
      // Strong purple/magenta/pink → cool blue-grey complement
      targetHue = 200
      targetSat = Math.min(0.30, 0.15 + (0.5 - bgLum) * 0.15)
    } else if (isGreen && !isMixedGreenWarm) {
      // Pure green-dominant → lavender/purple complement
      targetHue = 275
      targetSat = Math.min(0.45, 0.20 + (0.5 - bgLum) * 0.30)
    } else if (isMixedGreenWarm || (isGreen && pWarm > 0.30)) {
      // Mixed green+warm → green-toned accent (matches poster's green character)
      // Use a fixed green hue rather than avgHue for a cleaner green
      targetHue = 115
      targetSat = Math.min(0.40, 0.20 + (0.5 - bgLum) * 0.25)
    } else if (isRed) {
      // Strong red → desaturated red accent (matches poster)
      targetHue = avgHue
      targetSat = Math.min(0.40, 0.20 + (0.5 - bgLum) * 0.25)
    } else if (pWarm > 0.35) {
      // Warm-dominant (orange/yellow) → warm cream
      targetHue = 40
      targetSat = Math.min(0.50, 0.25 + (0.5 - bgLum) * 0.30)
    } else {
      // Mixed/neutral → warm cream default
      targetHue = 45
      targetSat = Math.min(0.50, 0.30 + (0.5 - bgLum) * 0.30)
    }
  } else {
    // LIGHT POSTER → darker, more muted accent
    targetLum = Math.max(0.30, 0.55 - (bgLum - 0.5) * 0.80)
    targetSat = 0.20
    targetHue = (pWarm > 0.35 || pPurple > 0.25) ? 200 : 40
  }

  // Clamp
  targetLum = Math.max(0.15, Math.min(0.90, targetLum))
  targetSat = Math.max(0.08, Math.min(0.65, targetSat))
  targetHue = ((targetHue % 360) + 360) % 360

  const result = hslToRgb(targetHue, targetSat, targetLum)
  // Ensure valid range
  result.r = Math.max(0, Math.min(255, result.r))
  result.g = Math.max(0, Math.min(255, result.g))
  result.b = Math.max(0, Math.min(255, result.b))
  return result
}

/**
 * Spinge la luminanza del colore nella direzione opposta allo sfondo,
 * in modo che il badge sia ben visibile.
 * Sfondo scuro → colore chiaro. Sfondo chiaro → colore scuro.
 */
function pushContrast(color: AccentResult, bgLum: number): AccentResult {
  let { r, g, b } = color
  const currentLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

  // Transizione fluida: da bgLum 0.5 nessuna spinta, a bgLum 0.0/1.0 spinta massima
  const contrastNeeded = (bgLum - 0.5) * 2  // -1 (scuro) a +1 (chiaro)
  const rawTarget = 0.53 - contrastNeeded * 0.35  // 0.88 (sfondo scuro) a 0.18 (sfondo chiaro)
  const targetLum = Math.max(0.15, Math.min(0.88, rawTarget))

  const diff = targetLum - currentLum
  if (Math.abs(diff) < 0.02) return { r, g, b }  // già vicino al target

  const pushStrength = 0.65
  const blendedLum = currentLum + diff * pushStrength
  const scale = Math.max(0.15, Math.min(
    blendedLum / Math.max(currentLum, 0.001),
    255 / Math.max(r, g, b, 1),
  ))

  r = Math.min(255, Math.max(0, Math.round(r * scale)))
  g = Math.min(255, Math.max(0, Math.round(g * scale)))
  b = Math.min(255, Math.max(0, Math.round(b * scale)))

  return { r, g, b }
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
