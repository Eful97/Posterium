"use client"

import { useP } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { toSearchResult } from "@/lib/types"
import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { ScrollReveal } from "@/components/ScrollReveal"
import { SimklCard, type SimklCardItem } from "@/components/SimklCard"
import { posterUrl } from "@/lib/utils"
import { X, Check } from "lucide-react"

interface GridViewItem {
  tmdbId: number | null
  mediaType: "movie" | "tv"
  title: string
  posterPath: string | null
}

const PLATFORM_FILTERS = [
  { id: "all", label: "Tutti" },
  { id: "justwatch", label: "JustWatch" },
  { id: "netflix", label: "Netflix" },
  { id: "amazon-prime", label: "Prime Video" },
  { id: "disney", label: "Disney+" },
  { id: "apple-tv", label: "Apple TV+" },
  { id: "hbo-max", label: "HBO Max" },
  { id: "paramount-plus", label: "Paramount+" },
  { id: "anime", label: "Anime" },
] as const

export function CataloghiView() {
  const p = useP()
  const { t } = useT()
  const movieTrending = p.trending.filter((r) => r.media_type === "movie").slice(0, 20)
  const tvTrending = p.trending.filter((r) => r.media_type === "tv").slice(0, 20)
  const [gridItems, setGridItems] = useState<GridViewItem[] | null>(null)
  const [gridTitle, setGridTitle] = useState("")
  const [platformFilter, setPlatformFilter] = useState<string>("all")

  const savedKeys = useMemo(
    () => new Set(p.mappings.map((m) => `${m.mediaType}:${m.tmdbId}`)),
    [p.mappings],
  )

  const openGrid = (items: GridViewItem[], title: string) => {
    setGridItems(items)
    setGridTitle(title)
  }

  const navigateToItem = (item: SimklCardItem) => {
    const id = item.tmdbId ?? item.id
    if (!id) return
    const mediaType = (item.media_type || item.mediaType) as "movie" | "tv" || "movie"
    const title = item.title ?? item.name ?? ""
    p.navigateToPoster(toSearchResult({
      id,
      media_type: mediaType,
      title,
      name: title,
      poster_path: item.poster_path ?? item.posterPath,
    }), "cataloghi")
  }

  const SCROLL_KEY = "cataloghi:scroll"

  useEffect(() => {
    // sessionStorage può lanciare (private mode, iframe sandbox): non deve rompere il render
    let saved: string | null = null
    try { saved = sessionStorage.getItem(SCROLL_KEY) } catch { /* storage non disponibile */ }
    if (saved) {
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
    }
    return () => {
      try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)) } catch { /* storage non disponibile */ }
    }
  }, [])

  useEffect(() => {
    if (gridItems) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [gridItems])

  const filteredPlatforms = p.STREAMING_PLATFORMS.filter((sp) => {
    if (platformFilter === "all") return true
    if (platformFilter === "justwatch" || platformFilter === "anime") return false
    return sp.slug === platformFilter
  })

  const showJustWatch = (platformFilter === "all" || platformFilter === "justwatch") && p.trending.length > 0
  const showAnime = (platformFilter === "all" || platformFilter === "anime") && p.mdblistAnimeList.length > 0

  return (
    <div className="max-w-6xl mx-auto animate-fade-scale-in">
      <ScrollReveal animation="fade-up-fast">
        <div className="mb-6">
          <button
            onClick={() => { window.history.pushState({ view: "edit" }, ""); p.setView("edit") }}
            className="text-xs text-zinc-400 hover:text-white transition-colors mb-3 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t("ui.homeBtn")}
          </button>
          <h1 className="text-2xl font-bold text-zinc-50">{t("ui.catalogsTitle")}</h1>
          <p className="text-sm text-zinc-400 mt-1">{t("ui.catalogsSubtitle")}</p>
        </div>
      </ScrollReveal>

      {/* Platform Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-8">
        {PLATFORM_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setPlatformFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 ${
              platformFilter === f.id
                ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/30 shadow-sm font-semibold"
                : "bg-surface/80 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* JustWatch Top 10 — Simkl-style */}
      {showJustWatch && (
        <ScrollReveal animation="fade-up" threshold={0.05}>
          <div className="mb-12">
            <h2 className="section-heading text-xl font-bold mb-6">{t("ui.justwatchTop20")}</h2>
            <div className="flex flex-wrap gap-3">
              {movieTrending.length >= 5 && (
                <SimklCard
                  key="jw-movie-1"
                  items={movieTrending.slice(0, 5)}
                  title="Film — Top 20"
                  totalCount={movieTrending.length}
                  onClick={() => openGrid(
                    movieTrending.map(r => ({ tmdbId: r.id, mediaType: r.media_type, title: r.title || r.name || "", posterPath: r.poster_path })),
                    "JustWatch — Film"
                  )}
                  onItemClick={navigateToItem}
                  savedKeys={savedKeys}
                />
              )}
              {tvTrending.length >= 5 && (
                <SimklCard
                  key="jw-tv-1"
                  items={tvTrending.slice(0, 5)}
                  title="Serie — Top 20"
                  totalCount={tvTrending.length}
                  onClick={() => openGrid(
                    tvTrending.map(r => ({ tmdbId: r.id, mediaType: r.media_type, title: r.title || r.name || "", posterPath: r.poster_path })),
                    "JustWatch — Serie"
                  )}
                  onItemClick={navigateToItem}
                  savedKeys={savedKeys}
                />
              )}
            </div>
          </div>
        </ScrollReveal>
      )}

      {showJustWatch && <div className="section-divider" />}

      {/* Piattaforme streaming — filtrate se attivo un filtro */}
      {filteredPlatforms.length > 0 && (
        <ScrollReveal animation="fade-up" threshold={0.05}>
          <div className="mb-12">
            <h2 className="section-heading text-xl font-bold mb-6">{t("ui.streamingPlatforms")}</h2>
            {filteredPlatforms.map((sp) => {
              const chart = p.streamingCharts[sp.slug]
              if (!chart || (chart.movies.length === 0 && chart.tv.length === 0)) return null
              const movieItems = chart.movies.slice(0, 5)
              const tvItems = chart.tv.slice(0, 5)
              const movieGridItems: GridViewItem[] = chart.movies.map(m => ({ tmdbId: m.tmdbId, mediaType: m.mediaType as "movie" | "tv", title: m.title, posterPath: m.posterPath }))
              const tvGridItems: GridViewItem[] = chart.tv.map(m => ({ tmdbId: m.tmdbId, mediaType: m.mediaType as "movie" | "tv", title: m.title, posterPath: m.posterPath }))
              return (
                <div key={sp.slug} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    {sp.icon && <span className="text-base">{sp.icon}</span>}
                    {sp.name}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {movieItems.length > 0 && (
                      <SimklCard
                        items={movieItems}
                        title="Film — Top 10"
                        totalCount={chart.movies.length}
                        onClick={() => openGrid(movieGridItems, `${sp.name} — Film`)}
                        onItemClick={navigateToItem}
                        savedKeys={savedKeys}
                      />
                    )}
                    {tvItems.length > 0 && (
                      <SimklCard
                        items={tvItems}
                        title="Serie — Top 10"
                        totalCount={chart.tv.length}
                        onClick={() => openGrid(tvGridItems, `${sp.name} — Serie`)}
                        onItemClick={navigateToItem}
                        savedKeys={savedKeys}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollReveal>
      )}

      {showAnime && <div className="section-divider" />}

      {/* Anime trending */}
      {showAnime && p.mdblistAnimeList.length >= 5 && (
        <ScrollReveal animation="fade-up" threshold={0.05}>
          <div className="mb-12">
            <h2 className="section-heading text-xl font-bold mb-6">{t("ui.trendingAnime")}</h2>
            <div className="flex flex-wrap gap-3">
              <SimklCard
                key="anime-1"
                items={p.mdblistAnimeList.slice(0, 5).map(r => ({ tmdbId: r.id, mediaType: (r.media_type as "movie" | "tv") || "tv", title: r.title || "", posterPath: r.poster_path }))}
                title="Anime — Top 20"
                totalCount={p.mdblistAnimeList.length}
                onClick={() => openGrid(
                  p.mdblistAnimeList.map(r => ({ tmdbId: r.id, mediaType: (r.media_type as "movie" | "tv") || "tv", title: r.title || "", posterPath: r.poster_path })),
                  "Anime — Top 20"
                )}
                onItemClick={navigateToItem}
                savedKeys={savedKeys}
              />
            </div>
          </div>
        </ScrollReveal>
      )}

      {p.trending.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 animate-fade-scale-in">
          <div className="empty-state-illustration mb-5">
            <svg className="w-10 h-10 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" opacity="0.5"/>
            </svg>
          </div>
          <p className="text-sm text-zinc-400 mb-2">{t("ui.loadingCatalogs") || "Caricamento cataloghi..."}</p>
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-accent-orange animate-spin" />
        </div>
      )}

      {gridItems && createPortal(
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fade-scale-in" onClick={() => setGridItems(null)}>
          <div className="max-w-7xl mx-auto px-4 py-6 min-h-screen" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-50">{gridTitle}</h2>
              <button
                onClick={() => setGridItems(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
                aria-label="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {gridItems.map((item, idx) => {
                const src = item.posterPath ? posterUrl(item.posterPath, "w342") : ""
                const itemKey = `${item.mediaType}:${item.tmdbId}`
                const isSaved = item.tmdbId ? savedKeys.has(itemKey) : false

                return (
                  <button
                    key={`${item.mediaType}:${item.tmdbId ?? idx}`}
                    onClick={() => {
                      if (item.tmdbId) {
                        p.navigateToPoster(toSearchResult({
                          id: item.tmdbId,
                          media_type: item.mediaType,
                          title: item.title,
                          name: item.title,
                          poster_path: item.posterPath,
                        }), "cataloghi")
                      }
                    }}
                    className={`group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-accent ${
                      isSaved
                        ? "ring-2 ring-emerald-500/80 border-emerald-500/80"
                        : "hover:ring-2 hover:ring-accent/50"
                    }`}
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote TMDB poster tiles (lazy, optimized by CDN)
                      <img
                        src={src}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs p-2 text-center leading-relaxed">
                        {item.title}
                      </div>
                    )}
                    {isSaved && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow-lg backdrop-blur-sm z-10">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Salvato</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
