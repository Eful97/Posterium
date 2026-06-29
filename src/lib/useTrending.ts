"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { http } from "./http"
import { STREAMING_PLATFORMS } from "./utils"
import { t } from "./i18n"
import type { SearchResult, FlixPatrolChart } from "./types"
import type { EnrichedAnimeItem } from "./validation"

export function useTrending(tmdbKey: string, mdblistApiKey: string) {
  const [trending, setTrending] = useState<Array<SearchResult & { rank: number }>>([])
  const [mdblistAnimeList, setMdblistAnimeList] = useState<EnrichedAnimeItem[]>([])
  const [streamingCharts, setStreamingCharts] = useState<Record<string, FlixPatrolChart>>({})
  const lastRefreshRef = useRef(0)

  useEffect(() => {
    if (!tmdbKey) return
    http<{ movies: Array<SearchResult & { rank: number }>; tv: Array<SearchResult & { rank: number }> }>(`/api/tmdb/trending?api_key=${tmdbKey}`, { timeout: 30000 })
      .then((data) => { setTrending([...(data.movies || []), ...(data.tv || [])]) })
      .catch((e) => { console.error("[posterium] Failed to load trending:", e) })
    if (mdblistApiKey) {
      http<EnrichedAnimeItem[]>(`/api/mdblist/anime?mdblist_key=${mdblistApiKey}&api_key=${tmdbKey}`, { timeout: 30000 })
        .then(setMdblistAnimeList)
        .catch((e) => { console.error("[posterium] Failed to load anime list:", e) })
    }
  }, [tmdbKey, mdblistApiKey])

  useEffect(() => {
    if (!tmdbKey) return
    for (const p of STREAMING_PLATFORMS) {
      http<FlixPatrolChart>(`/api/flixpatrol/top10?platform=${p.slug}&country=italy&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 30000 })
        .then((data) => { setStreamingCharts((prev) => ({ ...prev, [p.slug]: data })) })
        .catch((e) => { console.error("[posterium] FlixPatrol fetch failed for", p.slug, e) })
    }
  }, [tmdbKey])

  const refreshLists = useCallback(async () => {
    if (!tmdbKey) return
    const now = Date.now()
    if (now - lastRefreshRef.current < 10 * 60 * 1000) {
      import("sonner").then(({ toast }) => toast(t("ui.refreshRateLimit")))
      return
    }
    lastRefreshRef.current = now
    try {
      const [trendingData, animeData] = await Promise.all([
        http<{ movies: Array<SearchResult & { rank: number }>; tv: Array<SearchResult & { rank: number }> }>(`/api/tmdb/trending?api_key=${tmdbKey}`, { timeout: 30000 }),
        mdblistApiKey
          ? http<EnrichedAnimeItem[]>(`/api/mdblist/anime?mdblist_key=${mdblistApiKey}&api_key=${tmdbKey}`, { timeout: 30000 }).catch(() => null)
          : Promise.resolve(null),
      ])
      setTrending([...(trendingData.movies || []), ...(trendingData.tv || [])])
      if (animeData) setMdblistAnimeList(animeData)
    } catch (e) {
      console.error("[posterium] Failed to refresh lists:", e)
    }
    for (const p of STREAMING_PLATFORMS) {
      http<FlixPatrolChart>(`/api/flixpatrol/top10?platform=${p.slug}&country=italy&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 30000 })
        .then((data) => { setStreamingCharts((prev) => ({ ...prev, [p.slug]: data })) })
        .catch((e) => { console.error("[posterium] FlixPatrol refresh failed for", p.slug, e) })
    }
    import("sonner").then(({ toast }) => toast(t("ui.listsRefreshed")))
  }, [tmdbKey, mdblistApiKey])

  return { trending, mdblistAnimeList, streamingCharts, refreshLists }
}
