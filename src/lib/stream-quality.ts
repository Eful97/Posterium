import { createLogger } from "./logger"
import { getJWTitleQuality } from "./justwatch"
import { getExternalIds } from "./tmdb"

const log = createLogger("stream-quality")

export type StreamQuality = "4K" | "1080p" | "720p" | "SD"

const TORRENTIO_BASE_URL = (process.env.POSTERIUM_TORRENTIO_URL || process.env.TORRENTIO_URL || "https://torrentio.strem.fun").replace(/\/+$/, "")
const STREAM_CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const qualityCache = new Map<string, { quality: StreamQuality | null; timestamp: number }>()

export function parseStreamQualityFromStreams(
  streams: Array<{ name?: string; title?: string; behaviorHints?: { filename?: string; bingeGroup?: string } }>
): StreamQuality | null {
  if (!Array.isArray(streams) || streams.length === 0) return null

  let has1080p = false
  let has720p = false
  let hasSD = false

  for (const s of streams) {
    const text = `${s.name || ""} ${s.title || ""} ${s.behaviorHints?.filename || ""} ${s.behaviorHints?.bingeGroup || ""}`
    if (/\b(4k|2160[pi]?|uhd)\b/i.test(text)) {
      return "4K"
    }
    if (/\b(1080[pi]?|fhd)\b/i.test(text)) {
      has1080p = true
    } else if (/\b(720[pi]?|hd)\b/i.test(text)) {
      has720p = true
    } else if (/\b(480[pi]?|576[pi]?|sd|dvdrip|cam|ts)\b/i.test(text)) {
      hasSD = true
    }
  }

  if (has1080p) return "1080p"
  if (has720p) return "720p"
  if (hasSD) return "SD"
  return null
}

export async function fetchTorrentioQuality(
  type: "movie" | "series",
  imdbId: string,
  signal?: AbortSignal
): Promise<StreamQuality | null> {
  const streamId = type === "movie" ? imdbId : `${imdbId}:1:1`
  const urls = [
    `${TORRENTIO_BASE_URL}/stream/${type}/${encodeURIComponent(streamId)}.json`,
    // Fallback mirror se il primary è bloccato da WAF/IP su Vercel
    `https://torrentio.strem.io/stream/${type}/${encodeURIComponent(streamId)}.json`,
  ]
  for (const url of urls) {
    try {
      const timeoutSignal = AbortSignal.timeout(4000)
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

      const res = await fetch(url, {
        headers: { "User-Agent": "Posterium/1.0" },
        signal: combinedSignal,
      })
      if (!res.ok) continue
      const data = await res.json()
      const q = parseStreamQualityFromStreams(data?.streams)
      if (q) return q
      // se il primo mirror risponde senza 4K, prova il secondo solo se null
      if (q === null && url === urls[0]) continue
      return q
    } catch (err) {
      log.debug("Torrentio stream quality check failed or timed out", { imdbId, url, error: err instanceof Error ? err.message : String(err) })
      // prova il mirror successivo
    }
  }
  return null
}

export async function resolveStreamQuality(
  type: "movie" | "series",
  imdbId?: string | null,
  tmdbId?: number | null,
  searchTitle?: string | null,
  signal?: AbortSignal
): Promise<StreamQuality | null> {
  const cacheKey = `${type}:${imdbId || tmdbId || searchTitle}`
  const cached = qualityCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < STREAM_CACHE_TTL) {
    return cached.quality
  }

  let quality: StreamQuality | null = null

  // 1. Try Torrentio via IMDb ID
  let targetImdbId = imdbId
  if (!targetImdbId && tmdbId) {
    try {
      const ext = await getExternalIds(type === "movie" ? "movie" : "tv", tmdbId)
      if (ext.imdb_id) targetImdbId = ext.imdb_id
    } catch {}
  }

  if (targetImdbId && targetImdbId.startsWith("tt")) {
    quality = await fetchTorrentioQuality(type, targetImdbId, signal)
  }

  // 2. Fallback to JustWatch GraphQL if Torrentio returned nothing and tmdbId is present
  if (!quality && tmdbId) {
    try {
      quality = await getJWTitleQuality(
        tmdbId,
        type === "movie" ? "MOVIE" : "SHOW",
        searchTitle,
        "IT",
        signal
      )
    } catch {}
  }

  qualityCache.set(cacheKey, { quality, timestamp: Date.now() })
  return quality
}

export function __resetStreamQualityCache() {
  qualityCache.clear()
}
