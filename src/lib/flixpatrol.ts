import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { DATA_DIR } from "@/lib/data-dir"
import { createLogger } from "@/lib/logger"

const log = createLogger("flixpatrol")

const CATALOG_URL = "https://raw.githubusercontent.com/0xConstant1/fp-crawler/main/catalogs/italy.json"
const TMDB_BASE = "https://api.themoviedb.org/3"

// Cache su filesystem: se DATA_DIR non è scrivibile (es. runtime serverless
// read-only di Vercel) usa /tmp — è solo una cache, la perdita a ogni cold
// start è accettabile. La persistenza vera (mapping/profili) resta a KV.
const CACHE_FILE = (() => {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.accessSync(DATA_DIR, fs.constants.W_OK)
    return path.join(DATA_DIR, "flixpatrol_cache.json")
  } catch {
    const fallback = path.join(os.tmpdir(), "posterium-flixpatrol_cache.json")
    log.warn(`DATA_DIR non scrivibile — cache flixpatrol su ${fallback}`)
    return fallback
  }
})()

const tmdbCache = new Map<string, { data: unknown; timestamp: number }>()
const TMDB_CACHE_TTL = 5 * 60 * 1000

// Cache in memoria del catalogo: evita readFileSync (I/O disco) ad ogni richiesta.
// Il file su disco resta come fallback persistente tra i processi.
let memCache: CacheData = { timestamp: 0, catalog: null }

const SLUG_TO_PLATFORM: Record<string, string> = {
  netflix: "Netflix",
  disney: "Disney+",
  "amazon-prime": "Amazon Prime",
  "hbo-max": "HBO Max",
  "apple-tv": "Apple TV",
  "paramount-plus": "Paramount+",
}

interface CatalogEntry {
  rank: number
  title: string
  tmdb: { id: number; media_type: string; release_date: string } | null
}

interface CatalogChart {
  catalog_id: string
  platform: string
  category: string
  entries: CatalogEntry[]
}

interface CatalogData {
  charts: CatalogChart[]
}

interface CacheData {
  timestamp: number
  catalog: CatalogData | null
}

export interface FlixPatrolEnrichedItem {
  rank: number
  title: string
  tmdbId: number | null
  mediaType: "movie" | "tv"
  posterPath: string | null
  releaseDate: string | null
}

export interface FlixPatrolTop10 {
  platform: string
  platformName: string
  country: string
  movies: FlixPatrolEnrichedItem[]
  tv: FlixPatrolEnrichedItem[]
}

function loadCache(): CacheData {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"))
      if (raw && typeof raw === "object" && "catalog" in raw) {
        return raw as CacheData
      }
    }
  } catch (e) { log.error("Failed to load cache", { error: e instanceof Error ? e.message : String(e) }) }
  return { timestamp: 0, catalog: null }
}

function saveCache(data: CacheData) {
  const dir = path.dirname(CACHE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  // Write atomica: tmp + rename. Se il processo muore a metà scrittura, il file
  // principale resta intatto e loadCache() continua a funzionare sullo stato valido.
  const tmp = `${CACHE_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data))
  fs.renameSync(tmp, CACHE_FILE)
}

async function fetchCatalog(): Promise<CatalogData> {
  const res = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`)
  return res.json()
}

async function tmdbCachedFetch(url: string): Promise<unknown | null> {
  const cached = tmdbCache.get(url)
  if (cached && Date.now() - cached.timestamp < TMDB_CACHE_TTL) return cached.data
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const data = await res.json()
    tmdbCache.set(url, { data, timestamp: Date.now() })
    return data
  } catch {
    return null
  }
}

async function fetchPosterPath(tmdbId: number, mediaType: string, apiKey: string): Promise<string | null> {
  const url = `${TMDB_BASE}/${mediaType}/${tmdbId}/images?api_key=${apiKey}&include_image_language=it,en,null`
  try {
    const json = await tmdbCachedFetch(url) as { posters?: { iso_639_1: string | null; file_path: string }[] } | null
    if (!json) return null
    const posters = json.posters ?? []
    const itPoster = posters.find((p) => p.iso_639_1 === "it")
    const enPoster = posters.find((p) => p.iso_639_1 === "en")
    return itPoster?.file_path || enPoster?.file_path || null
  } catch {
    return null
  }
}

export async function getTop10(platformSlug: string, country = "italy", apiKey?: string): Promise<FlixPatrolTop10> {
  const platformName = SLUG_TO_PLATFORM[platformSlug]
  if (!platformName) throw new Error(`Unknown platform: ${platformSlug}`)

  const now = Date.now()
  const FOUR_HOURS = 4 * 60 * 60 * 1000
  let cache = memCache
  // Memoria stantia → prova il file su disco (fallback persistente) prima di rifare fetch.
  if (!cache.catalog || now - cache.timestamp > FOUR_HOURS) {
    const disk = loadCache()
    if (disk.catalog && now - disk.timestamp <= FOUR_HOURS) {
      cache = disk
      memCache = cache
    }
  }
  let catalog = cache.catalog

  if (!catalog || now - cache.timestamp > FOUR_HOURS) {
    try {
      catalog = await fetchCatalog()
      cache = { catalog, timestamp: now }
      memCache = cache
      saveCache(cache)
    } catch (e) {
      log.error("Failed to fetch fresh catalog", { error: e instanceof Error ? e.message : String(e) })
      if (!catalog) throw e
    }
  }

  const movieChart = catalog.charts.find((c) => c.platform === platformName && c.category === "movies")
  const tvChart = catalog.charts.find((c) => c.platform === platformName && c.category === "tv shows")

  const toItem = async (entry: CatalogEntry, type: "movie" | "tv"): Promise<FlixPatrolEnrichedItem> => {
    const tmdbId = entry.tmdb?.id ?? null
    let title: string = entry.title
    let posterPath: string | null = null
    let releaseDate: string | null = entry.tmdb?.release_date ?? null

    if (tmdbId && apiKey) {
      const detailsUrl = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${apiKey}&language=it-IT`
      const [fetchedPoster, details] = await Promise.all([
        fetchPosterPath(tmdbId, type, apiKey),
        tmdbCachedFetch(detailsUrl) as Promise<{ title?: string; name?: string; release_date?: string; first_air_date?: string } | null>,
      ])
      posterPath = fetchedPoster
      if (details) {
        title = details.title || details.name || title
        releaseDate = details.release_date || details.first_air_date || releaseDate
      }
    }

    return {
      rank: entry.rank,
      title,
      tmdbId,
      mediaType: type,
      posterPath,
      releaseDate,
    }
  }

  const [movies, tv] = await Promise.all([
    Promise.all((movieChart?.entries ?? []).map((e) => toItem(e, "movie"))),
    Promise.all((tvChart?.entries ?? []).map((e) => toItem(e, "tv"))),
  ])

  return { platform: platformSlug, platformName, country, movies, tv }
}

export function getRawCatalog(): CatalogData | null {
  return loadCache().catalog
}

export function getSupportedPlatforms(): { slug: string; name: string }[] {
  return Object.entries(SLUG_TO_PLATFORM).map(([slug, name]) => ({ slug, name }))
}
