"use client"

import { useState, useRef, useEffect } from "react"
import { useP } from "@/lib/context"
import { posterUrl, titleOf, yearOf } from "@/lib/utils"
import { SearchBar } from "@/components/SearchBar"

export function SearchView() {
  const { tmdbKey, query, results, searching, totalResults, totalPages, searchPage, recentSearches, mappingsMap, setQuery, doSearch, loadMore, navigateToPoster, removeRecentSearch } = useP()
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
        <SearchBar tmdbKey={tmdbKey} value={query} onChange={setQuery} onSearch={(q) => { setQuery(q); doSearch(q) }} large onFocus={() => setSearchFocused(true)} onBlur={() => { blurTimerRef.current = setTimeout(() => setSearchFocused(false), 200) }} />
        {showRecent && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 animate-fade-scale-in">
            <p className="text-[10px] text-zinc-500 font-medium px-2 py-1">Ricerche recenti</p>
            {recentSearches.map((s) => (
              <div key={s} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-zinc-800 group transition-all duration-150">
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(s); doSearch(s); setSearchFocused(false) }} className="flex-1 flex items-center gap-2 text-xs text-zinc-300 hover:text-accent transition-all duration-150 text-left">
                  <span className="text-zinc-500">🕐</span> {s}
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => removeRecentSearch(s)} className="text-red-400 hover:text-red-300 transition-all duration-150 text-xs px-1">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="relative animate-fade-scale-in">
          {searching && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-20 rounded-2xl flex items-center justify-center"><p className="text-sm text-zinc-400 animate-pulse">Ricerca in corso...</p></div>}
          <div className="mx-auto grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-5 gap-3 sm:gap-4 max-w-7xl justify-items-center">
          {results.map((r) => {
            const mapping = mappingsMap.get(`${r.media_type}:${r.id}`)
            return (
              <button key={`${r.media_type}:${r.id}`} onClick={() => navigateToPoster(r)} aria-label={titleOf(r)} className="group relative bg-surface rounded-xl overflow-hidden border border-zinc-800 hover:border-accent/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/10 transition-all duration-200 ease-out w-full max-w-[250px] lg:max-w-none">
                <div className="aspect-[2/3] bg-zinc-800 overflow-hidden flex items-center justify-center">
                  {r.poster_path ? <img src={posterUrl(r.poster_path, "w342")} alt={titleOf(r)} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-300" /> : <span className="text-3xl font-bold text-zinc-600">{titleOf(r).charAt(0)}</span>}
                </div>
                <div className="px-2 py-2.5 text-center">
                  <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-accent transition-colors duration-200">{titleOf(r)}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{yearOf(r)} {r.media_type === "tv" ? "• TV" : ""}</p>
                </div>
                {mapping && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent-orange flex items-center justify-center text-[10px] font-bold text-black shadow-lg shadow-accent-orange/30" title="Custom poster set">✓</div>}
                {mapping && <div className="absolute inset-0 bg-accent-orange/10 border border-accent-orange/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />}
              </button>
            )
          })}
          </div>
          {searchPage < totalPages && (
            <div className="flex justify-center mt-6">
              <button disabled={loadingMore || searching} onClick={handleLoadMore} className="px-6 py-3 rounded-xl text-sm font-medium bg-zinc-800 border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                {loadingMore ? "Caricamento..." : "Mostra più risultati"}
              </button>
            </div>
          )}
        </div>
      )}
      {!tmdbKey && <p className="text-zinc-400 text-sm text-center py-12">Inserisci la chiave TMDB in ⚙️ per cercare</p>}
      {results.length === 0 && !searching && !showRecent && query.length >= 2 && tmdbKey && <p className="text-zinc-400 text-sm text-center py-12">Nessun risultato trovato</p>}
    </div>
  )
}
