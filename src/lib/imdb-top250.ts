/**
 * IMDb Top 250 fetcher & membership checker.
 *
 * Fetches the IMDb Top 250 chart, caches the list of IMDb IDs in the
 * in-memory cache (customisable 24 h TTL), and provides a simple check
 * function. Used both server-side (poster generation) and client-side
 * (preview) via the API route.
 */

import { cacheGet, cacheSet } from "./cache"

const CACHE_KEY = "imdb:top250"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 15_000
const USER_AGENT = "Mozilla/5.0 (compatible; Posterium/1.0; +https://posterium.app)"

// In-memory session cache (avoids serialisation overhead on repeated checks)
let memCache: string[] | null = null
let memCacheAt = 0

function isMemFresh(): boolean {
  return memCache !== null && (Date.now() - memCacheAt) < CACHE_TTL_MS
}

async function fetchTop250Ids(): Promise<string[]> {
  const res = await fetch("https://www.imdb.com/chart/top/", {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`IMDb chart returned HTTP ${res.status}`)
  const html = await res.text()
  // Extract all IMDb IDs (tt followed by 7-8 digits)
  const ids = [...html.matchAll(/tt\d{7,8}/g)].map((m) => m[0])
  return [...new Set(ids)]
}

/**
 * Returns the current list of IMDb Top 250 IDs (as a fresh Set).
 *
 * Uses a two-tier cache:
 *  1. In-memory (fast, process-lifetime)
 *  2. Shared in-memory cache (cross-request, configurable TTL)
 */
async function getTop250Ids(): Promise<Set<string>> {
  // 1. In-memory hot cache
  if (isMemFresh()) return new Set(memCache!)

  // 2. Shared cache
  const shared = cacheGet<string[]>(CACHE_KEY)
  if (shared) {
    memCache = shared
    memCacheAt = Date.now()
    return new Set(shared)
  }

  // 3. Fetch from IMDb
  const ids = await fetchTop250Ids()
  cacheSet(CACHE_KEY, ids, ["imdb"], CACHE_TTL_MS)
  memCache = ids
  memCacheAt = Date.now()
  return new Set(ids)
}

/**
 * Returns `true` when the given IMDb ID is in the current Top 250.
 *
 * Fails gracefully — returns `false` on any fetch/parse error so a
 * transient IMDb blip never ruins a poster.
 */
export async function isImdbTop250(imdbId: string | null | undefined): Promise<boolean> {
  if (!imdbId || !/^tt\d{7,8}$/.test(imdbId)) return false
  try {
    const ids = await getTop250Ids()
    return ids.has(imdbId)
  } catch {
    return false
  }
}
