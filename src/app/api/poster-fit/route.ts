import { NextRequest } from "next/server"
import { rankBestFitPosters } from "@/lib/poster-auto-fit"

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"
const MAX_POSTERS = 20
const FETCH_TIMEOUT_MS = 5_000

interface PosterFitBody {
  posterPaths: string[]
  logoPath: string
  logoScale?: number
  logoOffsetX?: number
  logoOffsetY?: number
  hasBadges?: boolean
  posterSize?: "w342" | "w500"
  voteAverages?: number[]
  widths?: number[]
  heights?: number[]
}

interface PosterFitEntry {
  posterPath: string
  score: number
  adjustedScore: number
  textPenalty: number
  metrics: {
    cleanliness: number
    contrast: number
    lowDetailScore: number
    badgeReadability: number
  }
  reasons: string[]
}

interface PosterFitResponse {
  ranked: PosterFitEntry[]
  total: number
  failed: number
}

async function fetchImage(url: string, signal: AbortSignal): Promise<Buffer> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 100) throw new Error(`Image too small (${buf.length} bytes)`)
  return buf
}

export async function POST(req: NextRequest) {
  let body: PosterFitBody
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.posterPaths?.length || !body.logoPath) {
    return Response.json({ error: "posterPaths and logoPath are required" }, { status: 400 })
  }

  const posterPaths = body.posterPaths.slice(0, MAX_POSTERS)
  const posterSize = body.posterSize || "w342"
  const logoScale = body.logoScale ?? 75
  const logoOffsetX = body.logoOffsetX ?? 0
  const logoOffsetY = body.logoOffsetY ?? 0
  const hasBadges = body.hasBadges ?? true

  const logoUrl = `${TMDB_IMAGE_BASE}/w500${body.logoPath}`

  let logoBuffer: Buffer
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    logoBuffer = await fetchImage(logoUrl, ac.signal)
    clearTimeout(timer)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: `Failed to fetch logo: ${msg}` }, { status: 502 })
  }

  const settled = await Promise.allSettled(
    posterPaths.map(async (posterPath, index) => {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
      try {
        const posterUrl = `${TMDB_IMAGE_BASE}/${posterSize}${posterPath}`
        const posterBuffer = await fetchImage(posterUrl, ac.signal)
        clearTimeout(timer)
        return {
          posterPath,
          posterBuffer,
          voteAverage: body.voteAverages?.[index] ?? 0,
          width: body.widths?.[index] ?? 0,
          height: body.heights?.[index] ?? 0,
        }
      } catch (err) {
        clearTimeout(timer)
        console.warn(`[poster-fit] Skipping ${posterPath}: ${err instanceof Error ? err.message : "Unknown error"}`)
        return null
      }
    }),
  )

  const posterEntries: { posterPath: string; posterBuffer: Buffer; voteAverage: number; width: number; height: number }[] = []
  let failed = 0
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value !== null) {
      posterEntries.push(r.value)
    } else {
      failed++
    }
  }

  const rankedResults = await rankBestFitPosters(
    posterEntries,
    logoBuffer,
    logoScale,
    logoOffsetX,
    logoOffsetY,
    hasBadges,
  )

  const ranked = rankedResults.map((r) => ({
    posterPath: r.posterPath,
    score: r.score,
    adjustedScore: r.adjustedScore,
    textPenalty: r.textPenalty,
    metrics: {
      cleanliness: r.metrics.cleanliness,
      contrast: r.metrics.contrast,
      lowDetailScore: 1 - r.metrics.detailPenalty,
      badgeReadability: r.metrics.badgeReadability,
    },
    reasons: r.reasons,
  }))

  const response: PosterFitResponse = { ranked, total: posterPaths.length, failed }

  return Response.json(response)
}