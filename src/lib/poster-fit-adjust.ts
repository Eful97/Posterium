import sharp from "sharp"
import type { PosterFitResult } from "@/lib/poster-fit-score"

export interface PosterBufferEntry {
  readonly posterPath: string
  readonly posterBuffer: Buffer
  readonly voteAverage: number
  readonly width: number
  readonly height: number
}

export interface RankedFitResult {
  readonly posterPath: string
  readonly score: number
  adjustedScore: number
  readonly textPenalty: number
  readonly logoZoneScore: number
  readonly colorConflictPenalty: number
  readonly qualityScore: number
  readonly metrics: {
    readonly cleanliness: number
    readonly contrast: number
    readonly detailPenalty: number
    readonly badgeReadability: number
  }
  readonly reasons: readonly string[]
}

interface FitAdjustmentInput {
  readonly ranked: readonly PosterFitResult[]
  readonly posterEntries: readonly PosterBufferEntry[]
}

const STD_W = 500
const STD_H = 750
const TEXT_PENALTY_CANDIDATES = 6
export const MIN_ACCEPTED_FIT_SCORE = 0.45

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function posterQualityScore(voteAverage: number, width: number, height: number): number {
  const tmdbVote = clamp((voteAverage - 2) / 8, 0, 1)
  const aspect = width > 0 && height > 0 ? width / height : 2 / 3
  const aspectDiff = Math.abs(aspect - 2 / 3)
  const aspectRatioScore = clamp(1 - aspectDiff / 0.3, 0, 1)
  const pixels = width * height
  const resolutionScore = pixels >= 500_000 ? 1 : pixels >= 200_000 ? 0.7 : pixels >= 100_000 ? 0.4 : 0.15
  return tmdbVote * 0.50 + aspectRatioScore * 0.30 + resolutionScore * 0.20
}

async function computeTextPenalty(posterBuffer: Buffer): Promise<number> {
  const cropY = Math.round(STD_H * 0.55)
  const cropH = Math.round(STD_H * 0.33)
  const cropX = Math.round(STD_W * 0.10)
  const cropW = Math.round(STD_W * 0.80)

  if (cropW <= 0 || cropH <= 0) return 0

  const { data, info } = await sharp(posterBuffer)
    .resize(STD_W, STD_H, { fit: "fill" })
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const totalPixels = w * h
  if (totalPixels === 0) return 0

  let sum = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3
      sum += luma(data[idx], data[idx + 1], data[idx + 2])
    }
  }
  const mean = sum / totalPixels

  let sqSum = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3
      const d = luma(data[idx], data[idx + 1], data[idx + 2]) - mean
      sqSum += d * d
    }
  }
  const stdDev = Math.sqrt(sqSum / totalPixels)

  let edgeSum = 0
  let edgeCount = 0
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const idx = (y * w + x) * 3
      const cur = luma(data[idx], data[idx + 1], data[idx + 2])
      const right = luma(data[idx + 3], data[idx + 4], data[idx + 5])
      const bottomIdx = ((y + 1) * w + x) * 3
      const bottom = luma(data[bottomIdx], data[bottomIdx + 1], data[bottomIdx + 2])
      edgeSum += Math.abs(cur - right) + Math.abs(cur - bottom)
      edgeCount += 2
    }
  }
  const edgeAvg = edgeCount > 0 ? edgeSum / edgeCount : 0

  let hPatternSum = 0
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 2; x++) {
      const idx1 = (y * w + x) * 3
      const idx2 = (y * w + x + 1) * 3
      const idx3 = (y * w + x + 2) * 3
      const d1 = Math.abs(luma(data[idx1], data[idx1 + 1], data[idx1 + 2]) - luma(data[idx2], data[idx2 + 1], data[idx2 + 2]))
      const d2 = Math.abs(luma(data[idx2], data[idx2 + 1], data[idx2 + 2]) - luma(data[idx3], data[idx3 + 1], data[idx3 + 2]))
      if (d1 < 5 && d2 < 5) hPatternSum++
    }
  }
  const hPatternRatio = hPatternSum / Math.max(1, h * (w - 2))

  const densityScore = clamp(stdDev / 70, 0, 1)
  const edgeScore = clamp(edgeAvg / 50, 0, 1)
  const patternScore = clamp(hPatternRatio * 3, 0, 1)

  const textPenalty = clamp(densityScore * 0.35 + edgeScore * 0.35 + patternScore * 0.30, 0, 1)
  if (textPenalty < 0.35) return 0
  return clamp((textPenalty - 0.35) / 0.65, 0, 1)
}

function toRankedFitResult(
  result: PosterFitResult,
  adjustedScore: number,
  textPenalty: number,
  logoZoneScore: number,
  colorConflictPenalty: number,
  qualityScore: number,
): RankedFitResult {
  return {
    posterPath: result.posterPath ?? "",
    score: result.score,
    adjustedScore,
    textPenalty,
    logoZoneScore,
    colorConflictPenalty,
    qualityScore,
    metrics: result.metrics,
    reasons: result.reasons,
  }
}

function computeLogoZoneScore(result: PosterFitResult): number {
  const lowDetailScore = 1 - result.metrics.detailPenalty
  return clamp(
    result.metrics.contrast * 0.45 +
    result.metrics.cleanliness * 0.30 +
    lowDetailScore * 0.25,
    0,
    1,
  )
}

function computeColorConflictPenalty(result: PosterFitResult): number {
  return result.reasons.includes("Colore logo simile allo sfondo") ? 0.12 : 0
}

export function selectAcceptedPosterPath(ranked: readonly RankedFitResult[], fallbackPath: string | null): string | null {
  const best = ranked[0]
  if (!best?.posterPath) return fallbackPath
  if (best.adjustedScore < MIN_ACCEPTED_FIT_SCORE) return fallbackPath
  return best.posterPath
}

export async function adjustFitResults(input: FitAdjustmentInput): Promise<RankedFitResult[]> {
  if (input.ranked.length === 0) return []

  const topCandidates = input.ranked.slice(0, TEXT_PENALTY_CANDIDATES)
  const withPenalty: RankedFitResult[] = await Promise.all(
    topCandidates.map(async (result) => {
      const posterEntry = input.posterEntries.find((p) => p.posterPath === result.posterPath)
      const logoZoneScore = computeLogoZoneScore(result)
      const colorConflictPenalty = computeColorConflictPenalty(result)
      if (!posterEntry) {
        const adjustedScore = result.score + logoZoneScore * 0.08 - colorConflictPenalty
        return toRankedFitResult(result, adjustedScore, 0, logoZoneScore, colorConflictPenalty, 0)
      }
      const textPenalty = await computeTextPenalty(posterEntry.posterBuffer).catch(() => 0)
      const tmdbQualityBonus = clamp((posterEntry.voteAverage - 4) / 6, 0, 1) * 0.04
      const qualityScore = posterQualityScore(posterEntry.voteAverage, posterEntry.width, posterEntry.height)
      const adjustedScore =
        result.score * (1 - textPenalty * 0.38) +
        logoZoneScore * 0.08 +
        tmdbQualityBonus +
        qualityScore * 0.06 -
        colorConflictPenalty
      return toRankedFitResult(result, adjustedScore, textPenalty, logoZoneScore, colorConflictPenalty, qualityScore)
    }),
  )

  const remaining = input.ranked.slice(TEXT_PENALTY_CANDIDATES).map((result) => {
    const logoZoneScore = computeLogoZoneScore(result)
    const colorConflictPenalty = computeColorConflictPenalty(result)
    const adjustedScore = result.score + logoZoneScore * 0.08 - colorConflictPenalty
    return toRankedFitResult(result, adjustedScore, 0, logoZoneScore, colorConflictPenalty, 0)
  })

  const allResults = [...withPenalty, ...remaining]
  allResults.sort((a, b) => b.adjustedScore - a.adjustedScore)

  if (allResults.length >= 2) {
    const diff = allResults[0].adjustedScore - allResults[1].adjustedScore
    if (diff < 0.08) {
      for (const entry of allResults) {
        const posterEntry = input.posterEntries.find((p) => p.posterPath === entry.posterPath)
        if (!posterEntry) continue
        const extraBonus = clamp((posterEntry.voteAverage - 4) / 6, 0, 1) * 0.06
        const textBoost = entry.textPenalty * 0.10
        entry.adjustedScore = entry.adjustedScore + extraBonus - textBoost
      }
      allResults.sort((a, b) => b.adjustedScore - a.adjustedScore)
    }
  }

  return allResults
}
