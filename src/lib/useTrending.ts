"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { http } from "./http"
import { STREAMING_PLATFORMS } from "./utils"
import { t } from "./i18n"
import type { SearchResult, FlixPatrolChart } from "./types"
import type { EnrichedAnimeItem } from "./validation"

export function useTrending(tmdbKey: string, mdblistApiKey: string) {
  const [trending, setTrending] = useState<Array<SearchResult & { rank: number }>>([])
  const [trendingError, setTrendingError] = useState(false)
  const [mdblistAnimeList, setMdblistAnimeList] = useState<EnrichedAnimeItem[]>([])
  const [streamingCharts, setStreamingCharts] = useState<Record<string, FlixPatrolChart>>({})
  const lastRefreshRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!tmdbKey) return
    const ctrl = new AbortController()
    const signal = ctrl.signal
    http<{ movies: Array<SearchResult & { rank: number }>; tv: Array<SearchResult & { rank: number }> }>(`/api/tmdb/trending?api_key=${tmdbKey}`, { timeout: 30000, signal })
      .then((data) => { if (signal.aborted) return; setTrending([...(data.movies || []), ...(data.tv || [])]); setTrendingError(false) })
      .catch((e) => { if (signal.aborted) return; console.error("[posterium] Failed to load trending:", e); setTrendingError(true) })
    http<EnrichedAnimeItem[]>(`/api/mdblist/anime?mdblist_key=${encodeURIComponent(mdblistApiKey || "")}&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 30000, signal })
      .then((data) => {
        if (signal.aborted) return
        if (Array.isArray(data) && data.length > 0) {
          setMdblistAnimeList(data)
        } else {
          // Fallback TMDB trending anime
          http<{ results: SearchResult[] }>(`/api/tmdb/trending/tv/week?api_key=${tmdbKey}&with_original_language=ja&sort_by=popularity`, { timeout: 30000, signal })
            .then((tmdbData) => {
              if (signal.aborted) return
              const fallback: EnrichedAnimeItem[] = (tmdbData.results || []).map((item: SearchResult, idx: number) => ({
                id: item.id,
                title: item.title || item.name || "",
                poster_path: item.poster_path || "",
                rank: idx + 1,
                media_type: item.media_type || "tv",
              }))
              setMdblistAnimeList(fallback)
            })
            .catch(() => {})
        }
      })
      .catch(() => {
        if (signal.aborted) return
        http<{ results: SearchResult[] }>(`/api/tmdb/trending/tv/week?api_key=${tmdbKey}&with_original_language=ja&sort_by=popularity`, { timeout: 30000, signal })
          .then((tmdbData) => {
            if (signal.aborted) return
            const fallback: EnrichedAnimeItem[] = (tmdbData.results || []).map((item: SearchResult, idx: number) => ({
              id: item.id,
              title: item.title || item.name || "",
              poster_path: item.poster_path || "",
              rank: idx + 1,
              media_type: item.media_type || "tv",
            }))
            setMdblistAnimeList(fallback)
          })
          .catch(() => {})
      })
    return () => { ctrl.abort() }
  }, [tmdbKey, mdblistApiKey])

  useEffect(() => {
    if (!tmdbKey) return
    const controllers: AbortController[] = []
    for (const p of STREAMING_PLATFORMS) {
      const ctrl = new AbortController()
      const signal = ctrl.signal
      http<FlixPatrolChart>(`/api/flixpatrol/top10?platform=${p.slug}&country=italy&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 30000, signal })
        .then((data) => { if (signal.aborted) return; setStreamingCharts((prev) => ({ ...prev, [p.slug]: data })) })
        .catch((e) => { if (signal.aborted) return; console.error("[posterium] FlixPatrol fetch failed for", p.slug, e) })
      controllers.push(ctrl)
    }
    return () => { for (const c of controllers) c.abort() }
  }, [tmdbKey])

  const refreshLists = useCallback(async () => {
    if (!tmdbKey) return
    const now = Date.now()
    if (now - lastRefreshRef.current < 10 * 60 * 1000) {
      import("sonner").then(({ toast }) => toast(t("ui.refreshRateLimit")))
      return
    }
    lastRefreshRef.current = now
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    const signal = ctrl.signal
    abortRef.current = ctrl
    try {
      const animePromise = http<EnrichedAnimeItem[]>(`/api/mdblist/anime?mdblist_key=${encodeURIComponent(mdblistApiKey || "")}&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 30000, signal })
        .then((data) => (Array.isArray(data) && data.length > 0 ? data : null))
        .catch(() => null)
        .then((res) => {
          if (res) return res
          return http<{ results: SearchResult[] }>(`/api/tmdb/trending/tv/week?api_key=${tmdbKey}&with_original_language=ja&sort_by=popularity`, { timeout: 30000, signal })
            .then((data): EnrichedAnimeItem[] => (data.results || []).map((item: SearchResult, idx: number) => ({
              id: item.id,
              title: item.title || item.name || "",
              poster_path: item.poster_path || "",
              rank: idx + 1,
              media_type: item.media_type || "tv",
            })))
            .catch(() => null)
        })
      const [trendingData, animeData] = await Promise.all([
        http<{ movies: Array<SearchResult & { rank: number }>; tv: Array<SearchResult & { rank: number }> }>(`/api/tmdb/trending?api_key=${tmdbKey}`, { timeout: 30000, signal }),
        animePromise,
      ])
      if (signal.aborted) return
      setTrending([...(trendingData.movies || []), ...(trendingData.tv || [])])
      setTrendingError(false)
      if (animeData) setMdblistAnimeList(animeData as EnrichedAnimeItem[])
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      console.error("[posterium] Failed to refresh lists:", e)
      setTrendingError(true)
    }
    for (const p of STREAMING_PLATFORMS) {
      // Fix M17: il signal del refresh viene passato anche ai fetch FlixPatrol
      // del loop — prima partivano senza signal dopo il check di abort: un
      // secondo refresh non interrompeva il primo, che poteva sovrascrivere
      // le classifiche più nuove al suo completamento.
      http<FlixPatrolChart>(`/api/flixpatrol/top10?platform=${p.slug}&country=italy&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 30000, signal })
        .then((data) => { if (signal.aborted) return; setStreamingCharts((prev) => ({ ...prev, [p.slug]: data })) })
        .catch((e) => { if (signal.aborted) return; console.error("[posterium] FlixPatrol refresh failed for", p.slug, e) })
    }
    import("sonner").then(({ toast }) => toast(t("ui.listsRefreshed")))
  }, [tmdbKey, mdblistApiKey])

  return { trending, trendingError, mdblistAnimeList, streamingCharts, refreshLists }
}
