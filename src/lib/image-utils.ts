/**
 * Shared image-processing utilities — single source of truth for:
 * - `STD_W` / `STD_H`: standard poster canvas dimensions
 * - `clamp`: standard clamp without Math.round (rounding is explicit at call site)
 * - `luma`: Rec.709 luminance from RGB
 * - `computeRegionStats`: cached region statistics (mean/stdDev/per-channel)
 *
 * Batch B: centralizes the pixel-analysis pipeline (resize → extract →
 * removeAlpha → raw → JS loop) across poster-fit-score.ts, poster-fit-adjust.ts,
 * poster-render-helpers.ts, and config-token.ts, instead of duplicating loops.
 * The per-region cache lets `topLuminance()` and `computeTextPenalty()` avoid
 * recomputing stats on overlapping crops.
 */

import sharp from "sharp"

// ---- Standard poster dimensions (single source of truth) ----

export const STD_W = 500
export const STD_H = 750

// ---- Math utilities ----

/**
 * Standard clamp: Math.max(min, Math.min(max, val)).
 * Does NOT round — if you need rounding, do it explicitly:
 *   clamp(Math.round(v), min, max)
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/**
 * Rec.709 luminance from 8-bit RGB channels.
 */
export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// ---- Region stats pool (Batch B: eliminates cross-function redundancy) ----

export interface RegionStats {
  /** Mean luminance (0-255) */
  mean: number
  /** Standard deviation of luminance */
  stdDev: number
  /** Mean per channel (0-255) */
  meanR: number
  meanG: number
  meanB: number
  /** Width of the analysed region */
  width: number
  /** Height of the analysed region */
  height: number
}

interface CachedStats {
  stats: RegionStats
  /** Buffer hash for cache invalidation */
  hash: number
}

const statsCache = new Map<string, CachedStats>()
const STATS_CACHE_MAX = 200

function bufferHash(buf: Buffer): number {
  // Fast hash: use first 64 bytes + length as a cheap signature.
  // Not cryptographic — just enough to detect different buffers.
  let h = buf.length
  const sample = Math.min(64, buf.length)
  for (let i = 0; i < sample; i += 4) {
    h = (h * 31 + (buf[i] ?? 0)) | 0
  }
  return h
}

/**
 * Compute mean, stdDev, and per-channel means for a rectangular region of a
 * poster buffer.
 *
 * Pipeline: resize to STD_W × STD_H (fit: fill) → extract region → removeAlpha
 * (RGB, stride 3) → raw pixel buffer → two JS passes over the pixels (first:
 * mean + per-channel means, second: stdDev). Not Sharp's native `.stats()`.
 *
 * Results are cached per (buffer-hash, region). The hash is cheap (first 64
 * bytes + length) — good enough to invalidate when the underlying image buffer
 * changes, not cryptographic.
 *
 * @param posterBuf - Raw poster image buffer (any format Sharp can read)
 * @param left - X offset within the STD_W × STD_H canvas
 * @param top - Y offset within the STD_W × STD_H canvas
 * @param width - Region width
 * @param height - Region height
 * @returns RegionStats, or null if the region is invalid
 */
export async function computeRegionStats(
  posterBuf: Buffer,
  left: number,
  top: number,
  width: number,
  height: number,
): Promise<RegionStats | null> {
  const l = Math.max(0, Math.round(left))
  const t = Math.max(0, Math.round(top))
  const w = Math.min(STD_W - l, Math.round(width))
  const h = Math.min(STD_H - t, Math.round(height))
  if (w <= 0 || h <= 0) return null

  const cacheKey = `${l}:${t}:${w}:${h}`
  const hash = bufferHash(posterBuf)
  const cached = statsCache.get(cacheKey)
  if (cached && cached.hash === hash) return cached.stats

  try {
    const { data: rawPixels, info } = await sharp(posterBuf)
      .resize(STD_W, STD_H, { fit: "fill" })
      .extract({ left: l, top: t, width: w, height: h })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const totalPixels = info.width * info.height
    if (totalPixels === 0) return null

    // Single-pass: mean + per-channel means
    let sum = 0
    let rSum = 0
    let gSum = 0
    let bSum = 0
    for (let i = 0; i < rawPixels.length; i += 3) {
      const r = rawPixels[i] ?? 0
      const g = rawPixels[i + 1] ?? 0
      const b = rawPixels[i + 2] ?? 0
      sum += luma(r, g, b)
      rSum += r
      gSum += g
      bSum += b
    }
    const mean = sum / totalPixels
    const meanR = rSum / totalPixels
    const meanG = gSum / totalPixels
    const meanB = bSum / totalPixels

    // Second pass: stdDev (needs mean from first pass)
    let sqSum = 0
    for (let i = 0; i < rawPixels.length; i += 3) {
      const lum = luma(rawPixels[i] ?? 0, rawPixels[i + 1] ?? 0, rawPixels[i + 2] ?? 0)
      const d = lum - mean
      sqSum += d * d
    }
    const stdDev = Math.sqrt(sqSum / totalPixels)

    const stats: RegionStats = {
      mean,
      stdDev,
      meanR,
      meanG,
      meanB,
      width: info.width,
      height: info.height,
    }

    // Cache management (LRU-ish: evict oldest when full)
    if (statsCache.size >= STATS_CACHE_MAX) {
      const firstKey = statsCache.keys().next().value
      if (firstKey) statsCache.delete(firstKey)
    }
    statsCache.set(cacheKey, { stats, hash })

    return stats
  } catch {
    return null
  }
}

/**
 * Clear the region stats cache. Useful for tests.
 */
export function clearRegionStatsCache(): void {
  statsCache.clear()
}