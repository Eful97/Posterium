import sharp from "sharp"
import { computeLogoLayout } from "@/lib/logo-layout"

export interface PosterFitInput {
  posterBuffer: Buffer
  logoBuffer: Buffer
  posterPath?: string
  logoScale: number
  logoOffsetX: number
  logoOffsetY: number
  hasBadges: boolean
}

export interface PosterFitMetrics {
  cleanliness: number
  contrast: number
  detailPenalty: number
  badgeReadability: number
}

export interface PosterFitResult {
  posterPath: string | undefined
  score: number
  metrics: PosterFitMetrics
  reasons: string[]
}

const STD_W = 500
const STD_H = 750

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

interface RgbData {
  data: Buffer
  width: number
  height: number
}

async function extractRgb(buffer: Buffer, left: number, top: number, width: number, height: number): Promise<RgbData | null> {
  const l = Math.max(0, Math.round(left))
  const t = Math.max(0, Math.round(top))
  const w = Math.min(STD_W - l, Math.round(width))
  const h = Math.min(STD_H - t, Math.round(height))
  if (w <= 0 || h <= 0) return null
  const data = await sharp(buffer)
    .resize(STD_W, STD_H, { fit: "fill" })
    .extract({ left: l, top: t, width: w, height: h })
    .removeAlpha()
    .raw()
    .toBuffer()
  return { data, width: w, height: h }
}

function analyzeLuma(rgb: RgbData): { mean: number; stdDev: number; edgeAvg: number } {
  const { data, width, height } = rgb
  const totalPixels = width * height
  if (totalPixels === 0) return { mean: 0, stdDev: 0, edgeAvg: 0 }

  let sum = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      sum += luma(data[idx], data[idx + 1], data[idx + 2])
    }
  }
  const mean = sum / totalPixels

  let sqSum = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      const d = luma(data[idx], data[idx + 1], data[idx + 2]) - mean
      sqSum += d * d
    }
  }
  const stdDev = Math.sqrt(sqSum / totalPixels)

  let edgeSum = 0
  let edgeCount = 0
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 3
      const cur = luma(data[idx], data[idx + 1], data[idx + 2])
      const right = luma(data[idx + 3], data[idx + 4], data[idx + 5])
      const bottomIdx = ((y + 1) * width + x) * 3
      const bottom = luma(data[bottomIdx], data[bottomIdx + 1], data[bottomIdx + 2])
      edgeSum += Math.abs(cur - right) + Math.abs(cur - bottom)
      edgeCount += 2
    }
  }
  const edgeAvg = edgeCount > 0 ? edgeSum / edgeCount : 0

  return { mean, stdDev, edgeAvg }
}

async function logoAvgLuma(logoBuffer: Buffer): Promise<number> {
  const { data, info } = await sharp(logoBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let sum = 0
  let count = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4
      if (data[idx + 3] > 32) {
        sum += luma(data[idx], data[idx + 1], data[idx + 2])
        count++
      }
    }
  }
  return count > 0 ? sum / count / 255 : 0.5
}

export async function scorePosterLogoFit(input: PosterFitInput): Promise<PosterFitResult> {
  const { posterBuffer, logoBuffer, posterPath, logoScale, logoOffsetX, logoOffsetY, hasBadges } = input

  const resizedPoster = await sharp(posterBuffer)
    .resize(STD_W, STD_H, { fit: "fill" })
    .png()
    .toBuffer()

  const logoMeta = await sharp(logoBuffer).metadata()
  const logoW = logoMeta.width ?? 100
  const logoH = logoMeta.height ?? 100

  const logoLayout = computeLogoLayout({
    posterW: STD_W,
    posterH: STD_H,
    logoW,
    logoH,
    logoScale,
    logoOffsetX,
    logoOffsetY,
    hasBadges,
  })

  const padding = 24
  const analysisBox = {
    left: logoLayout.left - padding,
    top: logoLayout.top - padding,
    width: logoLayout.width + padding * 2,
    height: logoLayout.height + padding * 2,
  }

  const safetyArea = await extractRgb(resizedPoster, analysisBox.left, analysisBox.top, analysisBox.width, analysisBox.height)

  let cleanliness = 0.5
  let contrast = 0.5
  let lowDetailScore = 0.5
  let badgeReadability = 0.5
  const reasons: string[] = []

  if (safetyArea) {
    const analysis = analyzeLuma(safetyArea)
    cleanliness = 1 - clamp(analysis.stdDev / 80, 0, 1)
    lowDetailScore = 1 - clamp(analysis.edgeAvg / 60, 0, 1)

    const logoLumaAvg = await logoAvgLuma(logoBuffer)
    const bgLumaAvg = analysis.mean / 255
    const rawContrast = Math.abs(logoLumaAvg - bgLumaAvg)
    contrast = clamp(rawContrast * 1.8, 0, 1)

    if (contrast > 0.55) reasons.push("Buon contrasto logo/sfondo")
    else if (contrast < 0.25) reasons.push("Scarso contrasto logo/sfondo")

    if (cleanliness > 0.75) reasons.push("Zona logo pulita")
    else if (cleanliness < 0.4) reasons.push("Zona logo caotica")

    if (lowDetailScore < 0.45) reasons.push("Molti dettagli dietro il logo")
    else if (lowDetailScore > 0.8) reasons.push("Zona logo senza distrazioni")
  } else {
    reasons.push("Zona logo non disponibile")
  }

  if (hasBadges) {
    const badgeTop = Math.round(STD_H * 0.82)
    const badgeHeight = Math.round(STD_H * 0.16)
    if (badgeHeight > 0) {
      const badgeArea = await extractRgb(resizedPoster, 0, badgeTop, STD_W, badgeHeight)
      if (badgeArea) {
        const badgeAnalysis = analyzeLuma(badgeArea)
        badgeReadability = 1 - clamp(badgeAnalysis.stdDev / 90, 0, 1)
        if (badgeReadability < 0.45) reasons.push("Zona badge caotica")
      }
    }
  }

  // When contrast is poor, penalize the overall score multiplicatively
  const contrastMultiplier = Math.min(1, contrast * 2.5 + 0.25)
  const score = clamp(
    (cleanliness * 0.35 +
    contrast * 0.30 +
    lowDetailScore * 0.25 +
    badgeReadability * 0.10) * contrastMultiplier,
    0, 1,
  )

  return {
    posterPath,
    score,
    metrics: { cleanliness, contrast, detailPenalty: 1 - lowDetailScore, badgeReadability },
    reasons,
  }
}

export async function rankPostersByFit(
  posters: { posterPath: string; posterBuffer: Buffer }[],
  logoBuffer: Buffer,
  logoScale: number,
  logoOffsetX: number,
  logoOffsetY: number,
  hasBadges: boolean,
): Promise<PosterFitResult[]> {
  const results = await Promise.all(
    posters.map((p) =>
      scorePosterLogoFit({
        posterBuffer: p.posterBuffer,
        logoBuffer,
        posterPath: p.posterPath,
        logoScale,
        logoOffsetX,
        logoOffsetY,
        hasBadges,
      }).catch((err: Error) => {
        console.warn(`[poster-fit] Score failed for ${p.posterPath}: ${err.message}`)
        return null
      }),
    ),
  )
  return results
    .filter((r): r is PosterFitResult => r !== null)
    .sort((a, b) => b.score - a.score)
}
