"use client"

import { useState, useRef, useEffect } from "react"
import { useP } from "@/lib/context"
import { posterUrl, titleOf, yearOf } from "@/lib/utils"
import { SearchBar } from "@/components/SearchBar"
import { PosterCardSkeleton } from "@/components/Skeleton"
import { Clock, X, Check, ChevronDown } from "lucide-react"

export function SearchView() {
  const { t, tmdbKey, query, results, searching, error, setError, totalPages, searchPage, recentSearches, mappingsMap, setQuery, doSearch, loadMore, navigateToPoster, removeRecentSearch } = useP()
  const [searchFocused, setSearchFocused] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  const showRecent = searchFocused && recentSearches.length > 0

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await loadMore()
    setLoadingMore(false)
  }

  return (
    <div>
      <div className="max-w-lg mx-auto relative z-[100] isolate mb-8">
        <SearchBar tmdbKey={tmdbKey} value={query} onChange={setQuery} onSearch={(q) => { setQuery(q); doSearch(q) }} large onFocus={() => setSearchFocused(true)} onBlur={() => { blurTimerRef.current = setTimeout(() => setSearchFocused(false), 200) }} error={error} />
        {showRecent && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-2xl p-2 z-50 animate-fade-scale-in">
            <p className="text-xs text-zinc-400 font-semibold px-2 py-1.5">{t("ui.recentSearches")}</p>
            {recentSearches.map((s) => (
              <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(s); doSearch(s); setSearchFocused(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent-orange/10 text-sm text-zinc-300 hover:text-accent transition-all duration-150 text-left">
                <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="flex-1 truncate">{s}</span>
                <span onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); removeRecentSearch(s) }} aria-label={t("ui.remove")} className="text-red-400 hover:text-red-300 transition-all duration-150 text-sm px-2 shrink-0"><X className="w-3.5 h-3.5" /></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {searching && results.length === 0 && (
        <div className="mx-auto grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-5 gap-3 sm:gap-4 max-w-7xl justify-items-center">
          {Array.from({ length: 10 }).map((_, i) => (
            <PosterCardSkeleton key={i} />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="relative animate-fade-scale-in">
          {searching && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-20 rounded-2xl flex items-center justify-center"><p className="text-sm text-zinc-400 animate-pulse">{t("ui.searching")}</p></div>}
          <div className="mx-auto grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-5 gap-3 sm:gap-4 max-w-7xl justify-items-center">
          {results.map((r, idx) => {
            const mapping = mappingsMap.get(`${r.media_type}:${r.id}`)
            return (
              <button key={`${r.media_type}:${r.id}`} onClick={() => navigateToPoster(r)} aria-label={titleOf(r)} className="surface-card group relative rounded-2xl overflow-hidden transition-all duration-200 ease-out w-full max-w-[250px] lg:max-w-none animate-stagger-in hover:-translate-y-0.5" style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}>
                <div className="aspect-[2/3] bg-zinc-900/80 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- TMDB dynamic URL */}
                  {r.poster_path ? <img src={posterUrl(r.poster_path, "w342")} alt={titleOf(r)} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-300" /> : <span className="text-3xl font-bold text-zinc-500">{titleOf(r).charAt(0)}</span>}
                </div>
                <div className="px-2 py-2.5 text-center">
                  <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-accent transition-colors duration-200">{titleOf(r)}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{yearOf(r)} {r.media_type === "tv" ? t("ui.mediaTv") : ""}</p>
                </div>
                {mapping && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent-orange flex items-center justify-center shadow-lg shadow-accent-orange/30" title={t("ui.customPosterSet")}><Check className="w-3 h-3 text-black" /></div>}
                {mapping && <div className="absolute inset-0 bg-accent-orange/10 border border-accent-orange/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />}
              </button>
            )
          })}
          </div>
          {searchPage < totalPages && (
            <div className="flex justify-center mt-6">
              <button aria-label={t("ui.showMore")} disabled={loadingMore || searching} onClick={handleLoadMore} className="px-6 py-3 rounded-xl text-sm font-medium bg-zinc-800 border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                {loadingMore ? t("ui.loading") : <><ChevronDown className="w-4 h-4" /> {t("ui.showMore")}</>}
              </button>
            </div>
          )}
        </div>
      )}
      {!tmdbKey && (
        <div className="text-center py-16 animate-fade-scale-in">
          <div className="empty-state-illustration mb-4">
            <svg className="w-10 h-10 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" opacity="0.3"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" opacity="0.5"/>
            </svg>
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1.5">{t("ui.noKey")}</p>
          <p className="text-zinc-500 text-xs max-w-xs mx-auto leading-relaxed">Inserisci una chiave TMDB nelle impostazioni per cercare film e serie TV.</p>
        </div>
      )}
      {error && (
        <div className="text-center py-12 animate-fade-scale-in">
          <div className="empty-state-illustration mb-4 border-red-900/40 bg-red-900/15">
            <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" opacity="0.4"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-red-400 text-sm font-medium mb-1">{t("ui.searchError")}</p>
          <p className="text-zinc-500 text-xs mb-4 max-w-xs mx-auto leading-relaxed">{error}</p>
          <button onClick={() => { setError(null); doSearch(query) }} className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-900/30 border border-red-800/40 text-red-300 hover:bg-red-900/50 hover:text-red-200 active:scale-95 transition-all duration-200 press-scale">{t("ui.retry")}</button>
        </div>
      )}
      {results.length === 0 && !searching && !showRecent && !error && query.length >= 2 && tmdbKey && (
        <div className="text-center py-16 animate-fade-scale-in">
          <div className="empty-state-illustration mb-4">
            <svg className="w-10 h-10 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" opacity="0.4"/>
              <path d="m21 21-4.3-4.3" opacity="0.4"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
            </svg>
          </div>
          <p className="text-zinc-400 text-sm mb-2">{t("ui.noResults")}</p>
          <p className="text-zinc-500 text-xs max-w-xs mx-auto leading-relaxed">{t("ui.noResultsForQuery") || `Nessun risultato per "${query}". Prova con un titolo diverso o verifica l'ortografia.`}</p>
        </div>
      )}
    </div>
  )
}
