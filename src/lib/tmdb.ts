// Base URL sovrascrivibili via env: usate dai test E2E per puntare al mock
// server locale (e2e/mock-server.mjs) senza chiave TMDB reale.
const TMDB_BASE = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3"
const IMG_BASE = process.env.TMDB_IMG_URL || "https://image.tmdb.org/t/p"

const fetchCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000
const CACHE_MAX = 500

/**
 * Risolve la chiave API TMDB dalla richiesta.
 * Priorità: header x-api-key > query param api_key.
 * L'header evita che la chiave appaia nei log del proxy/CDN.
 * Non esiste più chiave d'istanza: ogni chiamata TMDB porta la propria chiave.
 */
export function resolveRequestApiKey(req: { headers: Headers | { get: (name: string) => string | null }; nextUrl?: { searchParams: URLSearchParams } }): string | undefined {
  const headerKey = req.headers.get("x-api-key")
  if (headerKey) return headerKey
  const queryKey = req.nextUrl?.searchParams.get("api_key")
  if (queryKey) return queryKey
  return undefined
}

const inflight = new Map<string, Promise<unknown>>()

async function tmdbFetch(path: string, apiKey?: string, signal?: AbortSignal): Promise<unknown> {
  // In modalità mock (TMDB_BASE_URL impostato) non serve una chiave reale:
  // il mock server ignora il parametro api_key. In produzione il comportamento
  // è invariato (chiave obbligatoria).
  //
  // S9: la chiave va in query nell'URL outbound perché la v3 di TMDB la
  // richiede così (api_key è un parametro query, non un header). Non è
  // spostabile in un header senza rompere l'auth. Mitigazioni già attive:
  //   - la cacheKey è l'URL SENZA chiave → mai in Map key (memoria sicura);
  //   - gli errori non includono l'URL → mai in log/app insights;
  //   - la risoluzione della chiave vive solo qui (e in checkTmdbEndpoint),
  //     mai interpellata/sparsa nei chiamanti.
  const key = apiKey || (process.env.TMDB_BASE_URL ? "mock-key" : undefined)
  if (!key) throw new Error("TMDB API key is missing")

  // Cache key is the URL WITHOUT the api_key so that:
  //   1. The per-endpoint cache is shared across users (not fragmented by key).
  //   2. API keys never appear in Map keys (memory safety).
  const neutralUrl = new URL(`${TMDB_BASE}${path}`)
  const cacheKey = neutralUrl.toString()

  // In-memory cache (5 min) — promote on hit for LRU eviction
  const cached = fetchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Move to end of Map (= most-recently-used position)
    fetchCache.delete(cacheKey)
    fetchCache.set(cacheKey, cached)
    return cached.data
  }

  // Deduplicate concurrent requests for the same URL
  const existing = inflight.get(cacheKey)
  if (existing) return existing

  // Actual fetch URL includes the api_key (kept separate from cacheKey)
  const fetchUrl = new URL(neutralUrl.toString())
  fetchUrl.searchParams.set("api_key", key)

  // Nota: l'inflight coalescing è condiviso tra richieste concorrenti sulla
  // stessa URL — il signal vale solo per la PRIMA richiesta (quella che esegue
  // il fetch). È corretto: il deadline del render è il bound, non il signal.
  const promise = (async () => {
    const res = await fetch(fetchUrl.toString(), { signal: signal ?? AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`)
    const data = await res.json()
    // Evict LRU (first key = least-recently-used) when at capacity
    if (fetchCache.size >= CACHE_MAX) fetchCache.delete(fetchCache.keys().next().value!)
    fetchCache.set(cacheKey, { data, timestamp: Date.now() })
    return data
  })()
    .finally(() => inflight.delete(cacheKey))

  inflight.set(cacheKey, promise)
  return promise
}

/**
 * Health check verso un path TMDB: restituisce ok/status/time SENZA esporre la
 * chiave nella risposta né nei messaggi d'errore. Usata da /api/health, che non
 * deve conoscere la chiave reale né interpolarla in URL propri (S9). La chiave
 * in query nell'URL outbound è imposta dalla v3 TMDB (vedi commento tmdbFetch).
 */
export async function checkTmdbEndpoint(path: string, apiKey?: string): Promise<{ ok: boolean; status: number; time: number }> {
  const key = apiKey
  if (!key) return { ok: false, status: 401, time: 0 }
  const start = performance.now()
  try {
    const url = new URL(`${TMDB_BASE}${path}`)
    url.searchParams.set("api_key", key)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    return { ok: res.ok, status: res.status, time: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, status: 0, time: Math.round(performance.now() - start) }
  }
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

export interface TMDBCompany {
  id: number
  name: string
  logo_path: string | null
  origin_country: string
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

export async function getImages(mediaType: "movie" | "tv", id: number, languages = "en,null", apiKey?: string, signal?: AbortSignal): Promise<TMDBImagesResponse> {
  const data = await tmdbFetch(`/${mediaType}/${id}/images?include_image_language=${encodeURIComponent(languages)}`, apiKey, signal)
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

export async function getExternalIds(mediaType: "movie" | "tv", id: number, apiKey?: string, signal?: AbortSignal): Promise<TMDBExternalIds> {
  const data = await tmdbFetch(`/${mediaType}/${id}/external_ids`, apiKey, signal)
  return data as TMDBExternalIds
}

export interface TMDBKeywordsResponse {
  id: number
  keywords?: { id: number; name: string }[]
  results?: { id: number; name: string }[]
}

export async function getKeywords(mediaType: "movie" | "tv", id: number, apiKey?: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const data = (await tmdbFetch(`/${mediaType}/${id}/keywords`, apiKey, signal)) as TMDBKeywordsResponse
    const list = data.keywords || data.results || []
    return list.map((k) => k.name)
  } catch {
    return []
  }
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
  networks?: { id: number; name: string; logo_path: string | null; origin_country: string }[]
  production_companies?: { id: number; name: string; logo_path: string | null; origin_country: string }[]
  original_language?: string
  poster_path?: string | null

}

export async function getDetails(mediaType: "movie" | "tv", id: number, language = "it-IT", apiKey?: string, signal?: AbortSignal): Promise<TMDBDetails> {
  const data = await tmdbFetch(`/${mediaType}/${id}?language=${language}`, apiKey, signal)
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
