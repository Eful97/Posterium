import sharp from "sharp"
import { rankPostersByFit } from "@/lib/poster-fit-score"

interface PosterCandidate {
  readonly file_path: string
  readonly iso_639_1: string | null
  readonly vote_average?: number
}

interface PosterBufferEntry {
  readonly posterPath: string
  readonly posterBuffer: Buffer
  readonly voteAverage: number
}

interface SelectBestLogoFitPosterInput {
  readonly posters: readonly PosterCandidate[]
  readonly logoPath: string
  readonly fetchImage: (path: string) => Promise<Buffer>
  readonly logoScale?: number | null
  readonly logoOffsetX?: number | null
  readonly logoOffsetY?: number | null
  readonly hasBadges: boolean
  readonly renderVersion?: number
}

const MAX_AUTO_FIT_POSTERS = 20
const TEXT_PENALTY_CANDIDATES = 6
const AUTO_FIT_TIMEOUT_MS = 1200
const CACHE_TTL = 24 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 500

interface CacheEntry {
  posterPath: string
  createdAt: number
}

const autoFitCache = new Map<string, CacheEntry>()

function cacheKey(input: SelectBestLogoFitPosterInput, renderVersion?: number): string {
  const posterSignature = input.posters
    .filter((poster) => poster.iso_639_1 === null)
    .slice(0, MAX_AUTO_FIT_POSTERS)
    .map((poster) => poster.file_path)
    .join(",")
  return `auto-fit:${posterSignature}:${input.logoPath}:${input.logoScale ?? "auto"}:${input.logoOffsetX ?? 0}:${input.logoOffsetY ?? 0}:${input.hasBadges}:${renderVersion ?? 0}`
}

function cacheGet(key: string): string | null {
  const entry = autoFitCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt > CACHE_TTL) {
    autoFitCache.delete(key)
    return null
  }
  return entry.posterPath
}

function cacheSet(key: string, posterPath: string): void {
  if (autoFitCache.size >= CACHE_MAX_ENTRIES && !autoFitCache.has(key)) {
    const first = autoFitCache.keys().next().value
    if (first) autoFitCache.delete(first)
  }
  autoFitCache.set(key, { posterPath, createdAt: Date.now() })
}

function withTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(fallback) }
    }, ms)
    promise.then((val) => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(val) }
    }).catch(() => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(fallback) }
    })
  })
}

function defaultLogoScale(logoBuffer: Buffer): Promise<number> {
  return sharp(logoBuffer).metadata().then((meta) => {
    const logoW = meta.width || 200
    const logoH = meta.height || 100
    return Math.min(Math.round(37.5 * logoW / logoH), 75)
  })
}

const STD_W = 500
const STD_H = 750

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
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
  const hPatternRatio = hPatternSum / Math.max(1, (h * (w - 2)))

  const densityScore = clamp(stdDev / 70, 0, 1)
  const edgeScore = clamp(edgeAvg / 50, 0, 1)
  const patternScore = clamp(hPatternRatio * 3, 0, 1)

  const textPenalty = clamp(densityScore * 0.35 + edgeScore * 0.35 + patternScore * 0.30, 0, 1)
  if (textPenalty < 0.35) return 0
  return clamp((textPenalty - 0.35) / 0.65, 0, 1)
}

export async function selectBestLogoFitPosterPath(input: SelectBestLogoFitPosterInput): Promise<string | null> {
  const candidates = input.posters
    .filter((poster) => poster.iso_639_1 === null)
    .slice(0, MAX_AUTO_FIT_POSTERS)

  const firstCandidate = candidates[0]?.file_path ?? null
  if (candidates.length < 2) return firstCandidate

  const key = cacheKey(input, input.renderVersion)
  const cached = cacheGet(key)
  if (cached) return cached

  const fallbackResult = firstCandidate

  let logoBuffer: Buffer
  try {
    logoBuffer = await withTimeout(
      input.fetchImage(input.logoPath),
      Buffer.alloc(0),
      AUTO_FIT_TIMEOUT_MS,
    )
    if (logoBuffer.length === 0) {
      return fallbackResult
    }
  } catch {
    return fallbackResult
  }

  const posterBuffersRaw = await Promise.all(
    candidates.map(async (poster): Promise<PosterBufferEntry | null> => {
      try {
        const buf = await withTimeout(
          input.fetchImage(poster.file_path),
          null,
          AUTO_FIT_TIMEOUT_MS,
        )
        if (!buf) return null
        return { posterPath: poster.file_path, posterBuffer: buf, voteAverage: poster.vote_average ?? 0 }
      } catch {
        return null
      }
    }),
  )

  const usablePosters = posterBuffersRaw.filter((entry): entry is PosterBufferEntry => entry !== null)
  if (usablePosters.length === 0) return fallbackResult

  const logoScale = input.logoScale ?? await defaultLogoScale(logoBuffer)

  const ranked = await withTimeout(
    rankPostersByFit(
      usablePosters,
      logoBuffer,
      logoScale,
      input.logoOffsetX ?? 0,
      input.logoOffsetY ?? 0,
      input.hasBadges,
    ),
    usablePosters.map((p) => ({ posterPath: p.posterPath, score: 0, metrics: { cleanliness: 0, contrast: 0, detailPenalty: 0, badgeReadability: 0 }, reasons: [] })),
    AUTO_FIT_TIMEOUT_MS,
  )

  if (ranked.length === 0) return fallbackResult

  const topCandidates = ranked.slice(0, TEXT_PENALTY_CANDIDATES)
  const withPenalty = await Promise.all(
    topCandidates.map(async (result) => {
      const posterEntry = usablePosters.find((p) => p.posterPath === result.posterPath)
      if (!posterEntry) return { ...result, adjustedScore: result.score }
      const textPenalty = await computeTextPenalty(posterEntry.posterBuffer).catch(() => 0)
      const tmdbQualityBonus = clamp((posterEntry.voteAverage - 4) / 6, 0, 1) * 0.04
      const adjustedScore = result.score * (1 - textPenalty * 0.28) + tmdbQualityBonus
      return { ...result, adjustedScore, textPenalty }
    }),
  )

  withPenalty.sort((a, b) => b.adjustedScore - a.adjustedScore)
  const best = withPenalty[0]

  if (best?.posterPath) {
    cacheSet(key, best.posterPath)
    return best.posterPath
  }

  return fallbackResult
}

export function clearAutoFitCache(): void {
  autoFitCache.clear()
}
