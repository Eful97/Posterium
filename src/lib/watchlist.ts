// Watchlist orchestrator — unisce le watchlist Trakt + Simkl di un profilo.
// La snapshot è cacheata in memoria (TTL) e ha una `version` (hash delle chiavi):
// quando la watchlist dell'utente cambia, la version cambia → la cache-key dei
// poster (che la include) si invalida da sola.

import crypto from "node:crypto"
import { getFullProfileData, setProfileTokens } from "@/lib/profile-store"
import { fetchTraktWatchlist, refreshTraktTokens } from "@/lib/trakt"
import { fetchSimklWatchlist, refreshSimklTokens } from "@/lib/simkl"
import type { OAuthTokens, WatchlistPlatform } from "@/lib/integrations"
import { createLogger } from "@/lib/logger"

const log = createLogger("watchlist")

export interface WatchlistSnapshot {
  keys: Set<string>
  version: string
}

interface CacheEntry {
  snapshot: WatchlistSnapshot
  ts: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 10 * 60 * 1000
const CACHE_MAX = 200

export const EMPTY_WATCHLIST: WatchlistSnapshot = { keys: new Set(), version: "" }

function snapshotVersion(keys: Set<string>): string {
  const sorted = Array.from(keys).sort().join("|")
  if (!sorted) return ""
  return crypto.createHash("sha256").update(sorted).digest("hex").slice(0, 8)
}

async function fetchWithRefresh(
  tokens: OAuthTokens,
  platform: WatchlistPlatform,
  fetchFn: (tokens: OAuthTokens) => Promise<string[]>,
  refreshFn: (tokens: OAuthTokens) => Promise<OAuthTokens>,
  profileId: string,
): Promise<string[]> {
  if (tokens.expires_at < Date.now()) {
    try {
      const fresh = await refreshFn(tokens)
      await setProfileTokens(profileId, platform, fresh).catch(() => {})
      return fetchFn(fresh)
    } catch (error) {
      log.warn(`${platform} token refresh failed`, { error: error instanceof Error ? error.message : String(error) })
      return fetchFn(tokens)
    }
  }
  return fetchFn(tokens)
}

export async function getProfileWatchlist(profileId: string): Promise<WatchlistSnapshot> {
  const cached = cache.get(profileId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.snapshot

  const profile = await getFullProfileData(profileId)
  const keys = new Set<string>()

  if (profile?.traktTokens) {
    try {
      const items = await fetchWithRefresh(profile.traktTokens, "trakt", fetchTraktWatchlist, refreshTraktTokens, profileId)
      items.forEach((k) => keys.add(k))
    } catch (error) {
      log.warn("Trakt watchlist fetch failed", { error: error instanceof Error ? error.message : String(error) })
    }
  }
  if (profile?.simklTokens) {
    try {
      const items = await fetchWithRefresh(profile.simklTokens, "simkl", fetchSimklWatchlist, refreshSimklTokens, profileId)
      items.forEach((k) => keys.add(k))
    } catch (error) {
      log.warn("Simkl watchlist fetch failed", { error: error instanceof Error ? error.message : String(error) })
    }
  }

  const snapshot: WatchlistSnapshot = { keys, version: snapshotVersion(keys) }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!)
  cache.set(profileId, { snapshot, ts: Date.now() })
  return snapshot
}

/** Solo per i test: svuota la cache condivisa delle watchlist. */
export function __resetWatchlistCache(): void {
  cache.clear()
}
