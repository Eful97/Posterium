"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { api, STREAMING_PLATFORMS } from "@/lib/utils"
import type { SearchResult } from "@/lib/types"

interface FlixPatrolChart {
  movies: any[]
  tv: any[]
}

export function useStreamingLists(tmdbKey: string, mdblistApiKey: string) {
  const [trending, setTrending] = useState<SearchResult[]>([])
  const [streamingCharts, setStreamingCharts] = useState<Record<string, FlixPatrolChart | null>>({})
  const [mdblistAnimeList, setMdblistAnimeList] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const lastRefreshRef = useRef(0)

  const refreshLists = useCallback(async () => {
    if (!tmdbKey) return
    const now = Date.now()
    if (now - lastRefreshRef.current < 10 * 60 * 1000) return
    lastRefreshRef.current = now
    try {
      const [trendingData, animeData] = await Promise.all([
        api(`/api/tmdb/trending?api_key=${tmdbKey}`).catch(() => ({ movies: [], tv: [] })),
        mdblistApiKey
          ? api(`/api/mdblist/anime?api_key=${encodeURIComponent(mdblistApiKey)}`).catch(() => null)
          : Promise.resolve(null),
      ])
      setTrending([...(trendingData.movies || []), ...(trendingData.tv || [])])
      if (animeData) setMdblistAnimeList(animeData)
    } catch (e) { console.error("[posterium] Failed to load trending:", e) }
    for (const p of STREAMING_PLATFORMS) {
      api(`/api/flixpatrol/top10?platform=${p.slug}&country=italy&api_key=${encodeURIComponent(tmdbKey)}`).then((data: any) => {
        setStreamingCharts((prev) => ({ ...prev, [p.slug]: data }))
      }).catch(() => {})
    }
  }, [tmdbKey, mdblistApiKey])

  useEffect(() => {
    refreshLists().then(() => setLoaded(true))
  }, [refreshLists])

  return {
    trending, streamingCharts, mdblistAnimeList,
    loaded, refreshLists,
  }
}
