/**
 * Client TheTVDB (API v4)
 *
 * Utilizzato per il recupero di copertine (still/screencap) e descrizioni
 * degli episodi delle serie TV con trame localizzate in italiano.
 */

import { createLogger } from "@/lib/logger"

const log = createLogger("tvdb")

const TVDB_BASE = "https://api4.thetvdb.com/v4"
const ARTWORKS_BASE = "https://artworks.thetvdb.com"

// Token cache: JWT valido fino a 25 giorni (TVDB fornisce token da 30 giorni)
const tokenCache = new Map<string, { token: string; expiry: number }>()
const inflightTokens = new Map<string, Promise<string | null>>()

// Remote ID cache: (es. tt6468322 -> tvdbId)
const remoteIdCache = new Map<string, { tvdbId: number; expiry: number }>()

// Episodes cache: (tvdbId:lang -> TvdbEpisode[])
const episodesCache = new Map<string, { episodes: TvdbEpisode[]; expiry: number }>()

const CACHE_TTL_REMOTE = 24 * 60 * 60 * 1000 // 24 ore
const CACHE_TTL_EPISODES = 6 * 60 * 60 * 1000 // 6 ore

/** Pulisce le cache in-memory TVDB (utile per test o reload manuale) */
export function clearTvdbCache(): void {
  tokenCache.clear()
  inflightTokens.clear()
  remoteIdCache.clear()
  episodesCache.clear()
}

export interface TvdbEpisode {
  id: number
  name?: string
  overview?: string
  image?: string
  seasonNumber: number
  number: number
  aired?: string
  runtime?: number
}

interface TvdbEpisodeResponse {
  status: string
  data?: {
    series?: { id: number; name: string }
    episodes?: TvdbEpisode[]
  } | TvdbEpisode[]
  links?: {
    next?: string
    page?: number
    total_pages?: number
  }
}

interface TvdbSearchResponse {
  status: string
  data?: Array<{
    id?: number | string
    tvdb_id?: number | string
    objectID?: string
    name?: string
    type?: string
  }>
}

/**
 * Autentica una chiave API su TheTVDB v4 e restituisce il Bearer token.
 */
export async function getTvdbToken(apiKey: string): Promise<string | null> {
  const cleanKey = apiKey.trim()
  if (!cleanKey) return null

  const cached = tokenCache.get(cleanKey)
  if (cached && Date.now() < cached.expiry) {
    return cached.token
  }

  const existingInflight = inflightTokens.get(cleanKey)
  if (existingInflight) return existingInflight

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${TVDB_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: cleanKey }),
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        log.warn("TVDB login failed", { status: res.status })
        return null
      }

      const json = await res.json()
      const token = json?.data?.token
      if (typeof token === "string" && token.length > 0) {
        // Cache per 25 giorni
        tokenCache.set(cleanKey, { token, expiry: Date.now() + 25 * 24 * 60 * 60 * 1000 })
        return token
      }
      return null
    } catch (e) {
      log.error("TVDB login exception", { error: e instanceof Error ? e.message : String(e) })
      return null
    } finally {
      inflightTokens.delete(cleanKey)
    }
  })()

  inflightTokens.set(cleanKey, fetchPromise)
  return fetchPromise
}

/**
 * Trova l'ID numerico TheTVDB di una serie partendo da un IMDb ID (es. "tt6468322") o TMDB ID.
 */
export async function getTvdbSeriesId(remoteId: string, apiKey: string): Promise<number | null> {
  const cleanRemoteId = remoteId.trim()
  if (!cleanRemoteId) return null

  const cached = remoteIdCache.get(cleanRemoteId)
  if (cached && Date.now() < cached.expiry) {
    return cached.tvdbId
  }

  const token = await getTvdbToken(apiKey)
  if (!token) return null

  try {
    const res = await fetch(`${TVDB_BASE}/search/remoteid/${encodeURIComponent(cleanRemoteId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      log.warn("TVDB search by remoteid failed", { status: res.status, remoteId: cleanRemoteId })
      return null
    }

    const json = (await res.json()) as TvdbSearchResponse
    const results = json?.data
    if (!Array.isArray(results) || results.length === 0) return null

    // Estrae il primo ID serie valido
    for (const item of results) {
      const rawId = (item as any)?.series?.id ?? item.tvdb_id ?? item.id
      if (rawId) {
        const numId = typeof rawId === "number" ? rawId : parseInt(String(rawId), 10)
        if (Number.isFinite(numId) && numId > 0) {
          remoteIdCache.set(cleanRemoteId, { tvdbId: numId, expiry: Date.now() + CACHE_TTL_REMOTE })
          return numId
        }
      }
    }
    return null
  } catch (e) {
    log.error("TVDB search remoteid exception", { error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

/**
 * Recupera la lista degli episodi con trame e copertine still da TheTVDB.
 */
export async function getTvdbEpisodes(tvdbSeriesId: number, language = "ita", apiKey: string): Promise<TvdbEpisode[]> {
  const cacheKey = `${tvdbSeriesId}:${language}`
  const cached = episodesCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) {
    return cached.episodes
  }

  const token = await getTvdbToken(apiKey)
  if (!token) return []

  try {
    const allEpisodes: TvdbEpisode[] = []
    let page = 0
    let hasMore = true

    while (hasMore && page < 10) {
      const url = `${TVDB_BASE}/series/${tvdbSeriesId}/episodes/default/${encodeURIComponent(language)}?page=${page}`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        // Se la lingua specifica (es. ita) fallisce, prova il default generico
        if (page === 0 && language !== "eng" && language !== "default") {
          return getTvdbEpisodes(tvdbSeriesId, "default", apiKey)
        }
        break
      }

      const json = (await res.json()) as TvdbEpisodeResponse
      let epList: TvdbEpisode[] = []

      if (Array.isArray(json?.data)) {
        epList = json.data
      } else if (Array.isArray(json?.data?.episodes)) {
        epList = json.data.episodes
      }

      if (epList.length === 0) break

      for (const ep of epList) {
        if (ep.image) {
          ep.image = formatTvdbImageUrl(ep.image)
        }
        allEpisodes.push(ep)
      }

      // Controllo paginazione
      const totalPages = json.links?.total_pages
      if (typeof totalPages === "number") {
        page++
        hasMore = page < totalPages
      } else {
        hasMore = false
      }
    }

    if (allEpisodes.length > 0) {
      episodesCache.set(cacheKey, { episodes: allEpisodes, expiry: Date.now() + CACHE_TTL_EPISODES })
    }

    return allEpisodes
  } catch (e) {
    log.error("TVDB getEpisodes exception", { error: e instanceof Error ? e.message : String(e) })
    return []
  }
}

/** Formatta l'URL immagine TVDB aggiungendo il base URL se necessario. */
export function formatTvdbImageUrl(imagePath?: string | null): string | undefined {
  if (!imagePath || typeof imagePath !== "string") return undefined
  const clean = imagePath.trim()
  if (!clean) return undefined
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean
  return `${ARTWORKS_BASE}${clean.startsWith("/") ? "" : "/"}${clean}`
}

/**
 * Arricchisce i video di Stremio con copertine (screencap) e trame provenienti da TheTVDB.
 */
export async function enrichVideosWithTvdb(
  videos: Array<{
    id: string
    name?: string
    season: number
    episode: number
    overview?: string
    thumbnail?: string
    released?: string
    rating?: string
  }>,
  imdbId: string | null | undefined,
  tmdbId: number | null | undefined,
  apiKey: string,
  language = "ita"
): Promise<void> {
  if (!videos || videos.length === 0 || !apiKey) return

  // Risoluzione ID TheTVDB: prima tenta con IMDb ID, poi fallback con TMDB ID
  let tvdbSeriesId: number | null = null
  if (imdbId) {
    tvdbSeriesId = await getTvdbSeriesId(imdbId, apiKey)
  }
  if (!tvdbSeriesId && tmdbId) {
    tvdbSeriesId = await getTvdbSeriesId(String(tmdbId), apiKey)
  }

  if (!tvdbSeriesId) return

  const tvdbEps = await getTvdbEpisodes(tvdbSeriesId, language, apiKey)
  if (!tvdbEps || tvdbEps.length === 0) return

  // Costruisce mappa season:number -> TvdbEpisode
  const map = new Map<string, TvdbEpisode>()
  for (const ep of tvdbEps) {
    const s = ep.seasonNumber
    const e = ep.number
    if (typeof s === "number" && typeof e === "number") {
      map.set(`${s}:${e}`, ep)
    }
  }

  for (const v of videos) {
    const match = map.get(`${v.season}:${v.episode}`)
    if (match) {
      if (match.image) {
        const fullImg = formatTvdbImageUrl(match.image)
        if (fullImg) v.thumbnail = fullImg
      }
      if (match.overview && match.overview.trim().length > 0) {
        v.overview = match.overview.trim()
      }
      if (match.name && match.name.trim().length > 0) {
        v.name = match.name.trim()
      }
    }
  }
}
