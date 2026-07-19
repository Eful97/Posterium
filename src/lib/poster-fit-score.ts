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
  offsetYVariants?: number[]
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

function analyzeLuma(rgb: RgbData): { mean: number; stdDev: number; edgeAvg: number; meanR: number; meanG: number; meanB: number } {
  const { data, width, height } = rgb
  const totalPixels = width * height
  if (totalPixels === 0) return { mean: 0, stdDev: 0, edgeAvg: 0, meanR: 0, meanG: 0, meanB: 0 }

  let sum = 0
  let rSum = 0, gSum = 0, bSum = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      sum += luma(data[idx], data[idx + 1], data[idx + 2])
      rSum += data[idx]
      gSum += data[idx + 1]
      bSum += data[idx + 2]
    }
  }
  const mean = sum / totalPixels
  const meanR = rSum / totalPixels
  const meanG = gSum / totalPixels
  const meanB = bSum / totalPixels

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

  return { mean, stdDev, edgeAvg, meanR, meanG, meanB }
}

interface LumaAnalysisGrid {
  mean: number
  stdDev: number
  edgeAvg: number
  meanR: number
  meanG: number
  meanB: number
  grid: number[][]
}

function analyzeLumaWithGrid(rgb: RgbData, gridStride = 4): LumaAnalysisGrid {
  const { data, width, height } = rgb
  const totalPixels = width * height
  if (totalPixels === 0) return { mean: 0, stdDev: 0, edgeAvg: 0, meanR: 0, meanG: 0, meanB: 0, grid: [] }

  let sum = 0
  let rSum = 0, gSum = 0, bSum = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      sum += luma(data[idx], data[idx + 1], data[idx + 2])
      rSum += data[idx]
      gSum += data[idx + 1]
      bSum += data[idx + 2]
    }
  }
  const mean = sum / totalPixels
  const meanR = rSum / totalPixels
  const meanG = gSum / totalPixels
  const meanB = bSum / totalPixels

  let sqSum = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3
      const d = luma(data[idx], data[idx + 1], data[idx + 2]) - mean
      sqSum += d * d
    }
  }
  const stdDev = Math.sqrt(sqSum / totalPixels)

  const cols = Math.ceil(width / gridStride)
  const rows = Math.ceil(height / gridStride)
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  let edgeSum = 0
  let edgeCount = 0

  for (let gy = 0; gy < height - 1; gy += gridStride) {
    for (let gx = 0; gx < width - 1; gx += gridStride) {
      let cellEdgeSum = 0
      let cellPixelCount = 0
      for (let dy = 0; dy < gridStride && gy + dy < height - 1; dy++) {
        for (let dx = 0; dx < gridStride && gx + dx < width - 1; dx++) {
          const idx = ((gy + dy) * width + (gx + dx)) * 3
          const cur = luma(data[idx], data[idx + 1], data[idx + 2])
          const right = luma(data[((gy + dy) * width + (gx + dx + 1)) * 3], data[((gy + dy) * width + (gx + dx + 1)) * 3 + 1], data[((gy + dy) * width + (gx + dx + 1)) * 3 + 2])
          const bottom = luma(data[((gy + dy + 1) * width + (gx + dx)) * 3], data[((gy + dy + 1) * width + (gx + dx)) * 3 + 1], data[((gy + dy + 1) * width + (gx + dx)) * 3 + 2])
          cellEdgeSum += Math.abs(cur - right) + Math.abs(cur - bottom)
          cellPixelCount++
        }
      }
      const cellIdxX = Math.floor(gx / gridStride)
      const cellIdxY = Math.floor(gy / gridStride)
      grid[cellIdxY][cellIdxX] = cellPixelCount > 0 ? cellEdgeSum / cellPixelCount : 0
      edgeSum += cellEdgeSum
      edgeCount += cellPixelCount * 2
    }
  }

  const edgeAvg = edgeCount > 0 ? edgeSum / edgeCount : 0

  return { mean, stdDev, edgeAvg, meanR, meanG, meanB, grid }
}

async function logoAvgColor(logoBuffer: Buffer): Promise<{ r: number; g: number; b: number }> {
  const { data, info } = await sharp(logoBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let rSum = 0, gSum = 0, bSum = 0, count = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4
      if (data[idx + 3] > 32) {
        rSum += data[idx]
        gSum += data[idx + 1]
        bSum += data[idx + 2]
        count++
      }
    }
  }
  return count > 0
    ? { r: rSum / count, g: gSum / count, b: bSum / count }
    : { r: 128, g: 128, b: 128 }
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt(dr * dr + dg * dg + db * db) / 441.67
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
  const { posterBuffer, logoBuffer, posterPath, logoScale, logoOffsetX, logoOffsetY, hasBadges, offsetYVariants } = input

  const resizedPoster = await sharp(posterBuffer)
    .resize(STD_W, STD_H, { fit: "fill" })
    .png()
    .toBuffer()

  const logoMeta = await sharp(logoBuffer).metadata()
  const logoW = logoMeta.width ?? 100
  const logoH = logoMeta.height ?? 100

  const baseLayout = computeLogoLayout({
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
    left: baseLayout.left - padding,
    top: baseLayout.top - padding,
    width: baseLayout.width + padding * 2,
    height: baseLayout.height + padding * 2,
  }

  const safetyArea = await extractRgb(resizedPoster, analysisBox.left, analysisBox.top, analysisBox.width, analysisBox.height)

  let cleanliness = 0.5
  let contrast = 0.5
  let lowDetailScore = 0.5
  let badgeReadability = 0.5
  const reasons: string[] = []

  if (safetyArea) {
    const analysis = analyzeLumaWithGrid(safetyArea, 4)
    cleanliness = 1 - clamp(analysis.stdDev / 80, 0, 1)
    lowDetailScore = 1 - clamp(analysis.edgeAvg / 60, 0, 1)

    // Edge grid hotspot check: penalize if logo covers high-detail regions
    if (analysis.grid.length > 0) {
      const cellSize = 4
      const logoStartCol = Math.floor((analysisBox.left + cellSize) / cellSize)
      const logoStartRow = Math.floor((analysisBox.top + cellSize) / cellSize)
      const logoCols = Math.ceil(baseLayout.width / cellSize)
      const logoRows = Math.ceil(baseLayout.height / cellSize)

      let hotspotScore = 0
      let hotspotCount = 0
      for (let r = logoStartRow; r < logoStartRow + logoRows; r++) {
        for (let c = logoStartCol; c < logoStartCol + logoCols; c++) {
          if (r >= 0 && r < analysis.grid.length && c >= 0 && c < analysis.grid[0].length) {
            hotspotScore += analysis.grid[r][c]
            hotspotCount++
          }
        }
      }
      const avgHotspot = hotspotCount > 0 ? hotspotScore / hotspotCount : 0
      if (avgHotspot > 30) {
        lowDetailScore *= (1 - (avgHotspot - 30) / 120)
        reasons.push("Dettagli nell'area logo")
      }
    }

    const logoLumaAvg = await logoAvgLuma(logoBuffer)
    const bgLumaAvg = analysis.mean / 255
    const rawContrast = Math.abs(logoLumaAvg - bgLumaAvg)
    contrast = clamp(rawContrast * 1.8, 0, 1)

    const logoColor = await logoAvgColor(logoBuffer)
    const bgColor = { r: analysis.meanR, g: analysis.meanG, b: analysis.meanB }
    const chromaDistance = colorDistance(logoColor, bgColor)
    const chromaMultiplier = chromaDistance < 0.28
      ? 0.65 + chromaDistance / 0.28 * 0.35
      : 1
    contrast = contrast * chromaMultiplier

    if (chromaDistance < 0.20) reasons.push("Colore logo simile allo sfondo")

    if (contrast > 0.55) reasons.push("Buon contrasto logo/sfondo")
    else if (contrast < 0.25) reasons.push("Scarso contrasto logo/sfondo")

    if (cleanliness > 0.75) reasons.push("Zona logo pulita")
    else if (cleanliness < 0.4) reasons.push("Zona logo caotica")

    if (lowDetailScore < 0.45) reasons.push("Molti dettagli dietro il logo")
    else if (lowDetailScore > 0.8) reasons.push("Zona logo senza distrazioni")
  } else {
    reasons.push("Zona logo non disponibile")
  }

  // Gradient smoothness: compare top/bottom half of safety area
  if (safetyArea && safetyArea.height >= 4) {
    const halfH = Math.floor(safetyArea.height / 2)
    const topHalfRgb = { data: safetyArea.data.subarray(0, halfH * safetyArea.width * 3), width: safetyArea.width, height: halfH }
    const bottomHalfRgb = { data: safetyArea.data.subarray(halfH * safetyArea.width * 3), width: safetyArea.width, height: safetyArea.height - halfH }
    const topL = analyzeLuma(topHalfRgb)
    const botL = analyzeLuma(bottomHalfRgb)
    const meanDiff = Math.abs(topL.mean - botL.mean)
    const gradientSmooth = 1 - clamp(meanDiff / 80, 0, 1)
    if (gradientSmooth < 0.3) {
      cleanliness *= 0.9
      reasons.push("Gradiente brusco nella zona logo")
    }
  }

  // Skin-tone detection in bottom 30%
  if (safetyArea) {
    const skinZoneTop = Math.round(STD_H * 0.65)
    const skinZoneH = STD_H - skinZoneTop
    if (skinZoneH > 0) {
      const skinData = await extractRgb(resizedPoster, 0, skinZoneTop, STD_W, skinZoneH)
      if (skinData) {
        let skinPixelCount = 0
        let skinZonePixels = 0
        for (let i = 0; i < skinData.data.length; i += 3) {
          skinZonePixels++
          const r = skinData.data[i]
          const g = skinData.data[i + 1]
          const b = skinData.data[i + 2]
          const lum = luma(r, g, b)
          if (r > g && g > b && r > 150 && lum > 90 && lum < 210) {
            skinPixelCount++
          }
        }
        const skinRatio = skinZonePixels > 0 ? skinPixelCount / skinZonePixels : 0
        if (skinRatio > 0.08) {
          const logoBottom = baseLayout.top + baseLayout.height
          const logoTop = baseLayout.top
          const overlapTop = Math.max(logoTop, skinZoneTop)
          const overlapBottom = Math.min(logoBottom, STD_H)
          const overlapH = Math.max(0, overlapBottom - overlapTop)
          if (overlapH > 0) {
            const overlapRatio = overlapH / skinZoneH
            const skinPenalty = overlapRatio * skinRatio * 2
            cleanliness = clamp(cleanliness - skinPenalty, 0, 1)
            reasons.push("Pelle/volto nella zona logo")
          }
        }
      }
    }
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
  let score = clamp(
    (cleanliness * 0.35 +
    contrast * 0.30 +
    lowDetailScore * 0.25 +
    badgeReadability * 0.10) * contrastMultiplier,
    0, 1,
  )

  if (contrast < 0.35) {
    score = Math.min(score, 0.55)
  }

  // OffsetY variants robustness bonus
  const variants = offsetYVariants ?? [0]
  if (variants.length > 1 && safetyArea) {
    let worstCaseScore = 1
    for (const oyVariant of variants) {
      if (oyVariant === logoOffsetY) continue
      const variantLayout = computeLogoLayout({
        posterW: STD_W, posterH: STD_H, logoW, logoH,
        logoScale, logoOffsetX, logoOffsetY: oyVariant,
        hasBadges,
      })
      const variantBox = {
        left: variantLayout.left - padding,
        top: variantLayout.top - padding,
        width: variantLayout.width + padding * 2,
        height: variantLayout.height + padding * 2,
      }
      const variantSafety = await extractRgb(resizedPoster, variantBox.left, variantBox.top, variantBox.width, variantBox.height)
      if (variantSafety) {
        const vAnalysis = analyzeLumaWithGrid(variantSafety, 4)
        const vCleanliness = 1 - clamp(vAnalysis.stdDev / 80, 0, 1)
        const vLowDetail = 1 - clamp(vAnalysis.edgeAvg / 60, 0, 1)
        const vScore = (vCleanliness * 0.35 + contrast * 0.30 + vLowDetail * 0.25) * contrastMultiplier
        worstCaseScore = Math.min(worstCaseScore, vScore)
      }
    }
    score = clamp(score * 0.7 + worstCaseScore * 0.3, 0, 1)
  }

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
  offsetYVariants?: number[],
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
        offsetYVariants,
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
