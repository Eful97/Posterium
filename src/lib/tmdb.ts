const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"
const IMG_BASE = "https://image.tmdb.org/t/p"

const fetchCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000
const CACHE_MAX = 500

async function tmdbFetch(path: string, apiKey?: string): Promise<unknown> {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set("api_key", apiKey || TMDB_API_KEY!)

  const cacheKey = url.toString()
  const cached = fetchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const res = await fetch(cacheKey, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`)
  const data = await res.json()

  if (fetchCache.size >= CACHE_MAX) fetchCache.delete(fetchCache.keys().next().value!)
  fetchCache.set(cacheKey, { data, timestamp: Date.now() })
  return data
}

export interface TMDBImage {
  aspect_ratio: number
  file_path: string
  height: number
  iso_639_1: string | null
  vote_average: number
  vote_count: number
  width: number
}

export interface TMDBImagesResponse {
  id: number
  backdrops: TMDBImage[]
  posters: TMDBImage[]
  logos: TMDBImage[]
}

export interface TMDBMediaResult {
  id: number
  media_type: "movie" | "tv"
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
}

export interface TMDBSearchResponse {
  page: number
  results: TMDBMediaResult[]
  total_pages: number
  total_results: number
}

function getUrl(path: string, params: Record<string, string> = {}, apiKey?: string) {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set("api_key", apiKey || TMDB_API_KEY!)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

export async function searchMulti(query: string, language = "it-IT", apiKey?: string, page = 1): Promise<TMDBSearchResponse> {
  const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}&language=${language}&page=${page}`, apiKey)
  return data as TMDBSearchResponse
}

export async function getPopularMovies(page = 1, language = "it-IT", apiKey?: string): Promise<TMDBSearchResponse> {
  const data = await tmdbFetch(`/movie/popular?language=${language}&page=${page}&region=IT`, apiKey)
  return data as TMDBSearchResponse
}

export async function getPopularTV(page = 1, language = "it-IT", apiKey?: string): Promise<TMDBSearchResponse> {
  const data = await tmdbFetch(`/tv/popular?language=${language}&page=${page}&region=IT`, apiKey)
  return data as TMDBSearchResponse
}

export async function getImages(mediaType: "movie" | "tv", id: number, languages = "en,null", apiKey?: string): Promise<TMDBImagesResponse> {
  const data = await tmdbFetch(`/${mediaType}/${id}/images?include_image_language=${encodeURIComponent(languages)}`, apiKey)
  return data as TMDBImagesResponse
}

export function posterUrl(path: string, size = "w500"): string {
  return `${IMG_BASE}/${size}${path}`
}

export function posterUrlOriginal(path: string): string {
  return `${IMG_BASE}/original${path}`
}

export interface TMDBExternalIds {
  imdb_id: string | null
}

export async function getExternalIds(mediaType: "movie" | "tv", id: number, apiKey?: string): Promise<TMDBExternalIds> {
  const data = await tmdbFetch(`/${mediaType}/${id}/external_ids`, apiKey)
  return data as TMDBExternalIds
}

export interface TMDBDetails {
  id: number
  title?: string
  name?: string
  genres: { id: number; name: string }[]
  vote_average: number
  vote_count: number
  type?: string
  status?: string
  release_date?: string
  first_air_date?: string
  last_air_date?: string
  next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null
  number_of_seasons?: number
  number_of_episodes?: number
}

export async function getDetails(mediaType: "movie" | "tv", id: number, language = "it-IT", apiKey?: string): Promise<TMDBDetails> {
  const data = await tmdbFetch(`/${mediaType}/${id}?language=${language}`, apiKey)
  return data as TMDBDetails
}

export interface TMDBTrendingItem {
  id: number
  media_type: string
  popularity: number
}

export interface TMDBTrendingResponse {
  page: number
  results: TMDBTrendingItem[]
  total_pages: number
  total_results: number
}

export async function getTrending(mediaType: "movie" | "tv", timeWindow: "day" | "week" = "day", apiKey?: string, page = 1): Promise<TMDBTrendingResponse> {
  const data = await tmdbFetch(`/trending/${mediaType}/${timeWindow}?language=it-IT&page=${page}`, apiKey)
  return data as TMDBTrendingResponse
}
