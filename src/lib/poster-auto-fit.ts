import sharp from "sharp"
import { rankPostersByFit } from "@/lib/poster-fit-score"
import {
  adjustFitResults,
  selectAcceptedPosterPath,
  type PosterBufferEntry,
  type RankedFitResult,
} from "@/lib/poster-fit-adjust"

export interface PosterCandidate {
  readonly file_path: string
  readonly iso_639_1: string | null
  readonly vote_average?: number
  readonly width?: number
  readonly height?: number
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

const TMDB_CANDIDATE_COUNT = 12
const AUTO_FIT_TIMEOUT_MS = 1200
const CACHE_TTL = 24 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 500

interface CacheEntry {
  posterPath: string
  createdAt: number
}

const autoFitCache = new Map<string, CacheEntry>()

function cacheKey(candidates: readonly PosterCandidate[], input: SelectBestLogoFitPosterInput, renderVersion?: number): string {
  const posterSignature = candidates.map((poster) => poster.file_path).join(",")
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

const IDEAL_ASPECT = 2 / 3
const MAX_ASPECT_DIFF = 0.08

function hasPosterAspectRatio(poster: PosterCandidate): boolean {
  const width = poster.width ?? 0
  const height = poster.height ?? 0
  if (width <= 0 || height <= 0) return true
  return Math.abs(width / height - IDEAL_ASPECT) <= MAX_ASPECT_DIFF
}

export function selectAutoFitCandidates(posters: readonly PosterCandidate[]): PosterCandidate[] {
  const clean = posters.filter((poster) => poster.iso_639_1 === null && hasPosterAspectRatio(poster))
  return Array.from(
    new Map(clean.map((poster) => [poster.file_path, poster])).values(),
  ).slice(0, TMDB_CANDIDATE_COUNT)
}

export async function rankBestFitPosters(
  posterEntries: PosterBufferEntry[],
  logoBuffer: Buffer,
  logoScale: number,
  logoOffsetX: number,
  logoOffsetY: number,
  hasBadges: boolean,
  offsetYVariants?: number[],
): Promise<RankedFitResult[]> {
  if (posterEntries.length === 0) return []

  const ranked = await withTimeout(
    rankPostersByFit(posterEntries, logoBuffer, logoScale, logoOffsetX, logoOffsetY, hasBadges, offsetYVariants),
    posterEntries.map((p) => ({ posterPath: p.posterPath, score: 0, metrics: { cleanliness: 0, contrast: 0, detailPenalty: 0, badgeReadability: 0 }, reasons: [] })),
    AUTO_FIT_TIMEOUT_MS,
  )

  if (ranked.length === 0) return []

  return adjustFitResults({ ranked, posterEntries })
}

export async function selectBestLogoFitPosterPath(input: SelectBestLogoFitPosterInput): Promise<string | null> {
  const candidates = selectAutoFitCandidates(input.posters)

  const firstCandidate = candidates[0]?.file_path ?? null
  if (candidates.length < 2) return firstCandidate

  const key = cacheKey(candidates, input, input.renderVersion)
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
        return { posterPath: poster.file_path, posterBuffer: buf, voteAverage: poster.vote_average ?? 0, width: poster.width ?? 0, height: poster.height ?? 0 }
      } catch {
        return null
      }
    }),
  )

  const usablePosters = posterBuffersRaw.filter((entry): entry is PosterBufferEntry => entry !== null)
  if (usablePosters.length === 0) return fallbackResult

  const logoScale = input.logoScale ?? await defaultLogoScale(logoBuffer)

  const rankedResults = await rankBestFitPosters(
    usablePosters,
    logoBuffer,
    logoScale,
    input.logoOffsetX ?? 0,
    input.logoOffsetY ?? 0,
    input.hasBadges,
    [-20, 0, 20],
  )

  const selectedPosterPath = selectAcceptedPosterPath(rankedResults, fallbackResult)
  if (selectedPosterPath) cacheSet(key, selectedPosterPath)
  return selectedPosterPath
}

export function clearAutoFitCache(): void {
  autoFitCache.clear()
}
