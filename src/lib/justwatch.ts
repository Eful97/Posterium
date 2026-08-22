// Sovrascrivibile via env: nei test E2E punta al mock server locale.
const JW_API = process.env.JUSTWATCH_API_URL || "https://apis.justwatch.com/graphql"

const QUERY = `query GetStreamingChartInfo($country: Country!, $language: Language!, $filter: StreamingChartsFilter, $first: Int!) {
  streamingCharts(country: $country, filter: $filter, first: $first) {
    edges {
      streamingChartInfo { rank }
      node {
        ... on MovieOrShowOrSeason {
          content(country: $country, language: $language) {
            title
            externalIds { tmdbId imdbId }
          }
        }
      }
    }
  }
}`

export interface JWRankEntry {
  tmdbId: number
  /** IMDb id restituito da JustWatch stesso — evita la chiamata extra a TMDB. */
  imdbId: string | null
  rank: number
  title?: string | null
}

export const PLATFORM_JW_PACKAGES: Record<string, string[]> = {
  netflix: ["nfx"],
  "amazon-prime": ["prv"],
  prime: ["prv"],
  disney: ["dnp"],
  "disney-plus": ["dnp"],
  now: ["ntv", "skg"],
  "now-tv": ["ntv", "skg"],
  "apple-tv": ["atp"],
  apple: ["atp"],
  "hbo-max": ["mxx"],
  hbo: ["mxx"],
  "paramount-plus": ["pmp"],
  paramount: ["pmp"],
}

const rankingsCache = new Map<string, { data: JWRankEntry[]; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000
const CACHE_MAX = 100

export async function getJWRankings(
  objectType: "MOVIE" | "SHOW",
  country = "IT",
  first = 20,
  packages?: readonly string[] | string[],
): Promise<JWRankEntry[]> {
  const pkgKey = packages && packages.length > 0 ? packages.join(",") : "all"
  const cacheKey = `${objectType}:${country}:${first}:${pkgKey}`
  const cached = rankingsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const filter: Record<string, unknown> = {
    objectType,
    category: "DAILY_POPULARITY_SAME_CONTENT_TYPE",
  }
  if (packages && packages.length > 0) {
    filter.packages = packages
  }

  const res = await fetch(JW_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Platform": "WEB" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      operationName: "GetStreamingChartInfo",
      query: QUERY,
      variables: {
        country,
        language: "it-IT",
        filter,
        first: Math.max(first * 2, 20),
      },
    }),
  })
  if (!res.ok) throw new Error(`JustWatch ${objectType} failed: ${res.status}`)
  const json = await res.json()
  const edges = json?.data?.streamingCharts?.edges || []
  const seenTmdb = new Set<number>()
  const result: JWRankEntry[] = []

  for (const e of edges) {
    const tmdbId = Number(e?.node?.content?.externalIds?.tmdbId)
    const imdbId = e?.node?.content?.externalIds?.imdbId || null
    const title = e?.node?.content?.title || null
    const rank = e?.streamingChartInfo?.rank
    if (!tmdbId || !rank || seenTmdb.has(tmdbId)) continue
    seenTmdb.add(tmdbId)
    result.push({ tmdbId, imdbId, rank, title })
    if (result.length >= first) break
  }

  if (rankingsCache.size >= CACHE_MAX) rankingsCache.delete(rankingsCache.keys().next().value!)
  rankingsCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}

/** Solo per i test: svuota la cache condivisa delle classifiche JustWatch. */
export function __resetJWRankingsCache(): void {
  rankingsCache.clear()
}
