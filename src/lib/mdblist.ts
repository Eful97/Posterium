import crypto from "node:crypto"
import { cacheGet, cacheSet } from "./cache"

export interface MDBListEntry {
  imdb: string
  title: string
  year: number
  tmdb?: number
  mediatype?: "movie" | "show" | "anime" | "tv"
}

export const MDBLISTS = [
  { key: 'mdblistMovie', label: 'Di tendenza', url: 'https://mdblist.com/lists/snoak/trending-movies' },
  { key: 'mdblistShow', label: 'Serie di tendenza', url: 'https://mdblist.com/lists/snoak/trakt-s-trending-shows' },
  { key: 'mdblistAnime', label: 'Anime di tendenza', url: 'https://mdblist.com/lists/snoak/trending-anime-shows' },
] as const

// Override nei test E2E: punta al mock server locale (vedi playwright.config.ts).
const MDBLIST_API_URL = process.env.MDBLIST_API_URL || "https://mdblist.com/api"

// A2: TTL cache liste. Solo risultati NON vuoti vengono cachati: un errore di
// rete (catch → []) non deve congelare la lista per 30min, si ritenta al
// prossimo accesso.
const CACHE_TTL_MS = 30 * 60 * 1000

export async function fetchMDBList(listKey: string, apiKey?: string): Promise<MDBListEntry[]> {
  const list = MDBLISTS.find(l => l.key === listKey)
  if (!list) return []
  // Solo la chiave esplicita della richiesta: non esiste più chiave d'istanza.
  const key = apiKey
  // La key cambia il payload → parte del cache key (hash, mai plaintext),
  // come in ratings.ts: due contesti con key diverse non collidono.
  const keyHash = key ? crypto.createHash("sha1").update(key).digest("hex").slice(0, 8) : "none"
  const cacheKey = `mdblist:list:${listKey}:${keyHash}`
  const cached = cacheGet<MDBListEntry[]>(cacheKey)
  if (cached) return cached
  try {
    const slug = list.url.split('/').pop()
    // MDBLIST_API_URL esplicito (test E2E: punta al mock server locale) vince
    // sempre sulla key, così i test restano deterministici senza chiamate reali.
    // In produzione MDBLIST_API_URL è assente e si usa l'endpoint reale
    // (con key se disponibile).
    const explicitUrl = process.env.MDBLIST_API_URL
    const baseUrl = explicitUrl
      ? `${explicitUrl}/lists/snoak/${slug}`
      : key
        ? `https://api.mdblist.com/lists/snoak/${slug}/items?apikey=${encodeURIComponent(key)}&limit=20`
        : `${MDBLIST_API_URL}/lists/snoak/${slug}`
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json()
    const payload = key && !explicitUrl ? (data?.data || data) : data
    const rawItems = payload?.items || payload?.shows || payload?.movies || (Array.isArray(payload) ? payload : [])
    const items = rawItems.slice(0, 20).map((item: { imdb_id?: string; imdb?: string; title?: string; year?: number; tmdb_id?: number | string; tmdb?: number | string; ids?: { tmdb?: number | string }; id?: number | string }) => ({
      imdb: item.imdb_id || item.imdb || '',
      title: item.title || '',
      year: item.year || 0,
      tmdb: item.tmdb_id || item.tmdb || item.ids?.tmdb || item.id || undefined,
    }))
    if (items.length > 0) cacheSet(cacheKey, items, ["mdblist"], CACHE_TTL_MS)
    return items
  } catch {
    return []
  }
}

export function parseMDBListTarget(input: string): { user?: string; slug?: string; id?: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:api\.)?mdblist\.com\/lists\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i)
  if (urlMatch) {
    return { user: urlMatch[1], slug: urlMatch[2] }
  }
  const idUrlMatch = trimmed.match(/(?:https?:\/\/)?(?:api\.)?mdblist\.com\/lists\/([0-9]+)/i)
  if (idUrlMatch) {
    return { id: idUrlMatch[1] }
  }
  const slashParts = trimmed.split("/")
  if (slashParts.length === 2 && slashParts[0] && slashParts[1]) {
    return { user: slashParts[0], slug: slashParts[1] }
  }
  if (/^[0-9]+$/.test(trimmed)) {
    return { id: trimmed }
  }
  return null
}

export async function fetchCustomMDBList(urlOrSlug: string, apiKey?: string, limit: number = 20): Promise<MDBListEntry[]> {
  const target = parseMDBListTarget(urlOrSlug)
  if (!target) return []

  const key = apiKey
  const keyHash = key ? crypto.createHash("sha1").update(key).digest("hex").slice(0, 8) : "none"
  const targetHash = crypto.createHash("sha1").update(urlOrSlug.trim()).digest("hex").slice(0, 8)
  const cacheKey = `mdblist:custom:${targetHash}:${keyHash}`
  const cached = cacheGet<MDBListEntry[]>(cacheKey)
  if (cached) return cached

  try {
    const explicitUrl = process.env.MDBLIST_API_URL
    let baseUrl = ""
    if (explicitUrl) {
      const slug = target.slug || target.id || "custom"
      baseUrl = `${explicitUrl}/lists/custom/${slug}`
    } else if (key) {
      if (target.id) {
        baseUrl = `https://api.mdblist.com/lists/${target.id}/items?apikey=${encodeURIComponent(key)}&limit=${limit}`
      } else if (target.user && target.slug) {
        baseUrl = `https://api.mdblist.com/lists/${encodeURIComponent(target.user)}/${encodeURIComponent(target.slug)}/items?apikey=${encodeURIComponent(key)}&limit=${limit}`
      }
    } else {
      if (target.id) {
        baseUrl = `https://mdblist.com/api/lists/${target.id}`
      } else if (target.user && target.slug) {
        baseUrl = `https://mdblist.com/api/lists/${encodeURIComponent(target.user)}/${encodeURIComponent(target.slug)}`
      }
    }
    if (!baseUrl) return []

    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json()
    const payload = key && !explicitUrl ? (data?.data || data) : data
    const rawItems = payload?.items || payload?.shows || payload?.movies || (Array.isArray(payload) ? payload : [])
    const items = rawItems.slice(0, limit).map((item: { imdb_id?: string; imdb?: string; title?: string; name?: string; year?: number; release_year?: number; tmdb_id?: number | string; tmdb?: number | string; ids?: { tmdb?: number | string }; id?: number | string; mediatype?: "movie" | "show" | "anime" | "tv"; media_type?: "movie" | "show" | "anime" | "tv"; type?: "movie" | "show" | "anime" | "tv" }) => ({
      imdb: item.imdb_id || item.imdb || '',
      title: item.title || item.name || '',
      year: item.year || item.release_year || 0,
      tmdb: item.tmdb_id || item.tmdb || item.ids?.tmdb || item.id || undefined,
      mediatype: item.mediatype || item.media_type || item.type,
    }))
    if (items.length > 0) cacheSet(cacheKey, items, ["mdblist"], CACHE_TTL_MS)
    return items
  } catch {
    return []
  }
}

export async function checkMDBLists(imdbId: string): Promise<{ key: string; rank: number } | null> {
  for (const list of MDBLISTS) {
    const entries = await fetchMDBList(list.key)
    const idx = entries.findIndex(e => e.imdb === imdbId)
    if (idx >= 0) return { key: list.key, rank: idx + 1 }
  }
  return null
}
