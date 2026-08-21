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
  { key: 'mdblistAnimeMovie', label: 'Film anime di tendenza', url: 'https://mdblist.com/lists/snoak/trending-anime-movies' },
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
    let res: Response | null = null

    if (explicitUrl) {
      res = await fetch(`${explicitUrl}/lists/snoak/${slug}`, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    } else if (key) {
      res = await fetch(`https://api.mdblist.com/lists/snoak/${slug}/items?apikey=${encodeURIComponent(key)}&limit=20`, {
        headers: { "User-Agent": "Mozilla/5.0 Posterium" },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null)
    }

    if (!res || !res.ok) {
      // Fallback endpoint pubblico JSON diretto
      res = await fetch(`https://mdblist.com/lists/snoak/${slug}/json`, {
        headers: { "User-Agent": "Mozilla/5.0 Posterium" },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null)
    }

    if (!res || !res.ok) return []
    const data = await res.json()
    const payload = Array.isArray(data) ? data : (data?.data || data)
    const rawItems = Array.isArray(payload) ? payload : (payload?.items || payload?.shows || payload?.movies || [])
    const items = rawItems.slice(0, 20).map((item: { imdb_id?: string; imdb?: string; title?: string; year?: number; tmdb_id?: number | string; tmdb?: number | string; ids?: { tmdb?: number | string }; id?: number | string }) => ({
      imdb: item.imdb_id || item.imdb || "",
      title: item.title || "",
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
  let trimmed = input.trim()
  if (!trimmed) return null
  // Rimuove eventuali /json, /items, query params e trailing slash
  trimmed = trimmed.replace(/\/json\/?$/i, "").replace(/\/items\/?$/i, "").replace(/\?.*$/, "").replace(/\/+$/, "")

  // https://mdblist.com/lists/user/slug
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:api\.)?mdblist\.com\/lists\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i)
  if (urlMatch) {
    return { user: urlMatch[1], slug: urlMatch[2] }
  }

  // https://mdblist.com/lists/12345
  const idUrlMatch = trimmed.match(/(?:https?:\/\/)?(?:api\.)?mdblist\.com\/lists\/([0-9]+)/i)
  if (idUrlMatch) {
    return { id: idUrlMatch[1] }
  }

  // https://mdblist.com/lists/some-slug
  const singleSlugUrlMatch = trimmed.match(/(?:https?:\/\/)?(?:api\.)?mdblist\.com\/lists\/([a-zA-Z0-9_.-]+)/i)
  if (singleSlugUrlMatch) {
    return { slug: singleSlugUrlMatch[1] }
  }

  const slashParts = trimmed.split("/")
  if (slashParts.length === 2 && slashParts[0] && slashParts[1]) {
    return { user: slashParts[0], slug: slashParts[1] }
  }
  if (/^[0-9]+$/.test(trimmed)) {
    return { id: trimmed }
  }
  if (/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { slug: trimmed }
  }
  return null
}

export async function fetchCustomMDBList(urlOrSlug: string, apiKey?: string, limit: number = 20): Promise<MDBListEntry[]> {
  const target = parseMDBListTarget(urlOrSlug)
  if (!target) return []

  const key = apiKey || process.env.POSTERIUM_MDBLIST_KEY || process.env.MDBLIST_KEY || process.env.MDBLIST_API_KEY
  const keyHash = key ? crypto.createHash("sha1").update(key).digest("hex").slice(0, 8) : "none"
  const targetHash = crypto.createHash("sha1").update(urlOrSlug.trim()).digest("hex").slice(0, 8)
  const cacheKey = `mdblist:custom:${targetHash}:${keyHash}`
  const cached = cacheGet<MDBListEntry[]>(cacheKey)
  if (cached) return cached

  try {
    const explicitUrl = process.env.MDBLIST_API_URL
    let res: Response | null = null

    if (explicitUrl) {
      const slug = target.slug || target.id || "custom"
      res = await fetch(`${explicitUrl}/lists/custom/${slug}`, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    } else if (key) {
      let keyUrl = ""
      if (target.id) {
        keyUrl = `https://api.mdblist.com/lists/${target.id}/items?apikey=${encodeURIComponent(key)}&limit=${limit}`
      } else if (target.user && target.slug) {
        keyUrl = `https://api.mdblist.com/lists/${encodeURIComponent(target.user)}/${encodeURIComponent(target.slug)}/items?apikey=${encodeURIComponent(key)}&limit=${limit}`
      } else if (target.slug) {
        keyUrl = `https://api.mdblist.com/lists/${encodeURIComponent(target.slug)}/items?apikey=${encodeURIComponent(key)}&limit=${limit}`
      }
      if (keyUrl) {
        res = await fetch(keyUrl, {
          headers: { "User-Agent": "Mozilla/5.0 Posterium" },
          signal: AbortSignal.timeout(10000),
        }).catch(() => null)
      }
    }

    // Se la chiamata con chiave è fallita o non c'è chiave, usa l'endpoint pubblico JSON
    if (!res || !res.ok) {
      let publicUrl = ""
      if (target.user && target.slug) {
        publicUrl = `https://mdblist.com/lists/${encodeURIComponent(target.user)}/${encodeURIComponent(target.slug)}/json`
      } else if (target.id) {
        publicUrl = `https://mdblist.com/lists/${encodeURIComponent(target.id)}/json`
      } else if (target.slug) {
        publicUrl = `https://mdblist.com/lists/${encodeURIComponent(target.slug)}/json`
      }
      if (publicUrl) {
        res = await fetch(publicUrl, {
          headers: { "User-Agent": "Mozilla/5.0 Posterium" },
          signal: AbortSignal.timeout(10000),
        }).catch(() => null)
      }
    }

    if (!res || !res.ok) return []
    const data = await res.json()
    const payload = Array.isArray(data) ? data : (data?.data || data)
    let rawItems: Array<{
      imdb_id?: string
      imdb?: string
      title?: string
      name?: string
      year?: number | string
      release_year?: number | string
      tmdb_id?: number | string
      tmdb?: number | string
      ids?: { tmdb?: number | string; imdb?: string }
      id?: number | string
      mediatype?: "movie" | "show" | "anime" | "tv"
      media_type?: "movie" | "show" | "anime" | "tv"
      type?: "movie" | "show" | "anime" | "tv"
      show?: boolean
    }> = []

    if (Array.isArray(payload)) {
      rawItems = payload
    } else if (Array.isArray(payload?.items)) {
      rawItems = payload.items
    } else if (Array.isArray(payload?.movies) || Array.isArray(payload?.shows)) {
      rawItems = [...(payload.movies || []), ...(payload.shows || [])]
    }

    const items = rawItems.slice(0, limit).map((item) => ({
      imdb: item.imdb_id || item.imdb || item.ids?.imdb || "",
      title: item.title || item.name || "",
      year: Number(item.year || item.release_year) || 0,
      tmdb: item.tmdb_id ? Number(item.tmdb_id) : item.tmdb ? Number(item.tmdb) : item.ids?.tmdb ? Number(item.ids.tmdb) : (item.id && Number.isFinite(Number(item.id)) ? Number(item.id) : undefined),
      mediatype: item.mediatype || item.media_type || item.type || (item.show ? "show" : undefined),
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
