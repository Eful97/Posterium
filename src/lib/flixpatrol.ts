import fs from "node:fs"
import path from "node:path"

const CATALOG_URL = "https://raw.githubusercontent.com/0xConstant1/fp-crawler/main/catalogs/italy.json"
const TMDB_BASE = "https://api.themoviedb.org/3"

const CACHE_FILE = path.join(process.cwd(), "data", "flixpatrol_cache.json")

const tmdbCache = new Map<string, { data: unknown; timestamp: number }>()
const TMDB_CACHE_TTL = 5 * 60 * 1000

const SLUG_TO_PLATFORM: Record<string, string> = {
  netflix: "Netflix",
  disney: "Disney+",
  "amazon-prime": "Amazon Prime",
  "hbo-max": "HBO Max",
  "apple-tv": "Apple TV",
  "paramount-plus": "Paramount+",
}

const PLATFORM_TO_SLUG: Record<string, string> = {
  Netflix: "netflix",
  "Disney+": "disney",
  "Amazon Prime": "amazon-prime",
  "HBO Max": "hbo-max",
  "Apple TV": "apple-tv",
  "Paramount+": "paramount-plus",
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
  } catch {}
  return { timestamp: 0, catalog: null }
}

function saveCache(data: CacheData) {
  const dir = path.dirname(CACHE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data))
}

async function fetchCatalog(): Promise<CatalogData> {
  const res = await fetch(CATALOG_URL)
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`)
  return res.json()
}

async function tmdbCachedFetch(url: string): Promise<unknown | null> {
  const cached = tmdbCache.get(url)
  if (cached && Date.now() - cached.timestamp < TMDB_CACHE_TTL) return cached.data
  try {
    const res = await fetch(url)
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

  const cache = loadCache()
  const FOUR_HOURS = 4 * 60 * 60 * 1000
  let catalog = cache.catalog

  if (!catalog || Date.now() - cache.timestamp > FOUR_HOURS) {
    catalog = await fetchCatalog()
    cache.catalog = catalog
    cache.timestamp = Date.now()
    saveCache(cache)
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

export function getSupportedPlatforms(): { slug: string; name: string }[] {
  return Object.entries(SLUG_TO_PLATFORM).map(([slug, name]) => ({ slug, name }))
}
