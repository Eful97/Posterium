const JW_API = "https://apis.justwatch.com/graphql"

const QUERY = `query GetStreamingChartInfo($country: Country!, $language: Language!, $filter: StreamingChartsFilter, $first: Int!) {
  streamingCharts(country: $country, filter: $filter, first: $first) {
    edges {
      streamingChartInfo { rank }
      node {
        ... on MovieOrShowOrSeason {
          content(country: $country, language: $language) {
            externalIds { tmdbId imdbId }
          }
        }
      }
    }
  }
}`

interface JWRankEntry {
  tmdbId: number
  rank: number
}

const rankingsCache = new Map<string, { data: JWRankEntry[]; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000
const CACHE_MAX = 100

export async function getJWRankings(objectType: "MOVIE" | "SHOW", country = "IT", first = 20): Promise<JWRankEntry[]> {
  const cacheKey = `${objectType}:${country}:${first}`
  const cached = rankingsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
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
        filter: { objectType, category: "DAILY_POPULARITY_SAME_CONTENT_TYPE" },
        first,
      },
    }),
  })
  if (!res.ok) throw new Error(`JustWatch ${objectType} failed: ${res.status}`)
  const json = await res.json()
  const edges = json?.data?.streamingCharts?.edges || []
  const result = edges
    .map((e: { node?: { content?: { externalIds?: { tmdbId?: number | string } } }; streamingChartInfo?: { rank?: number } }) => {
      const tmdbId = Number(e?.node?.content?.externalIds?.tmdbId)
      const rank = e?.streamingChartInfo?.rank
      if (!tmdbId || !rank) return null
      return { tmdbId, rank }
    })
    .filter(Boolean) as JWRankEntry[]

  if (rankingsCache.size >= CACHE_MAX) rankingsCache.delete(rankingsCache.keys().next().value!)
  rankingsCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}
