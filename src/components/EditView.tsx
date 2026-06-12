"use client"

import { useState, useRef, useEffect } from "react"
import { useP } from "@/lib/context"
import { PosterOptions } from "@/components/PosterOptions"
import { LogoOptions } from "@/components/LogoOptions"
import { Toggle } from "@/components/Toggle"
import { SliderRow } from "@/components/SliderRow"
import { getAwardBadgeLabel } from "@/lib/awards"
import { SearchBar } from "@/components/SearchBar"
import { RankRow } from "@/components/RankRow"
import { RankingBadge, GenreRatingBadges, ExtraBadge } from "@/components/PreviewBadges"

export default function EditView() {
  const p = useP()
  const [searchFocused, setSearchFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  const posterCol = (
    <div className="w-full md:w-64 shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-1" style={{ animationDelay: "0ms", animationFillMode: "backwards" }}>
      <h3 className="text-base font-semibold text-zinc-200 mb-3 text-center">🖼️ Poster</h3>
      {p.loadingImages ? <div className="text-center py-12 text-zinc-400">Caricamento poster...</div> : <PosterOptions posters={p.posters} posterActivePath={p.posterActivePath} selected={p.selected} lang={p.lang} openSections={p.openSections} posterScrollRef={p.posterScrollRef} toggleSection={p.toggleSection} selectPoster={p.selectPoster} />}
    </div>
  )

  const badgesVisible = p.globalBadges && p.metaInfo.genres.length > 0 && p.metaInfo.voteAverage > 0

  const previewCol = (
    <div className="w-full max-w-[380px] md:w-[380px] shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-2" style={{ animationDelay: "60ms", animationFillMode: "backwards" }}>
      <h3 className="text-base font-semibold text-zinc-200 mb-3 text-center">👁️ Anteprima</h3>
      <div className="bg-zinc-800/80 rounded-2xl overflow-hidden relative shadow-2xl shadow-black/50 backdrop-blur-sm border border-white/[0.07]">
        <div className="relative aspect-[2/3] select-none pointer-events-none bg-zinc-900/50 overflow-hidden rounded-2xl">
          {p.previewPoster && <img src={p.posterUrl(p.previewPoster.file_path, "w500")} alt="" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover" />}
          {p.previewPoster?.iso_639_1 === null && p.selectedLogo && (() => {
            const scale = 0.38
            const baseGap = 57
            const badgeAdj = badgesVisible ? 0 : 15.2
            const bottomPx = baseGap - p.logoOffsetY * scale - badgeAdj
            const maxLogoH = Math.round(380 * 1.5 * 0.30)
            return <div style={{ position: "absolute", left: 0, right: 0, bottom: `${bottomPx}px`, display: "flex", justifyContent: "center" }}><div style={{ transform: `translateX(${p.logoOffsetX * scale}px)`, width: `${p.logoScale}%`, maxWidth: "100%" }}><img src={p.posterUrl(p.selectedLogo.file_path, "original")} alt="" loading="eager" decoding="async" className="w-full" style={{ objectFit: "contain", maxHeight: `${maxLogoH}px` }} /></div></div>
          })()}
          {p.rankingBadges && (() => {
            const currYear = new Date().getFullYear().toString()
            const isNewMovie = p.selected?.media_type === "movie" && p.selected?.release_date?.startsWith(currYear)
            const isNewSeries = p.selected?.media_type === "tv" && p.selected?.first_air_date?.startsWith(currYear)
            const now = Date.now()
            const twoMonths = 60 * 24 * 60 * 60 * 1000
            const twoWeeks = 14 * 24 * 60 * 60 * 1000
            const award = p.metaInfo.awards?.length ? getAwardBadgeLabel(p.metaInfo.awards) : null

            if (isNewMovie) return <div className="absolute inset-0"><ExtraBadge label="Nuovo film" containerW={380} containerH={570} color={p.badgeBgColor} /></div>
            if (isNewSeries) return <div className="absolute inset-0"><ExtraBadge label="Nuova serie" containerW={380} containerH={570} color={p.badgeBgColor} /></div>
            if (award) return <div className="absolute inset-0"><ExtraBadge label={award} containerW={380} containerH={570} color={p.badgeBgColor} /></div>

            if (p.selected?.media_type === "movie" && p.selected?.release_date) {
              const releaseTime = new Date(p.selected.release_date).getTime()
              if (releaseTime < now && now - releaseTime < twoMonths) return <div className="absolute inset-0"><ExtraBadge label="Al cinema" containerW={380} containerH={570} color={p.badgeBgColor} /></div>
            }

            if (p.selected?.media_type === "tv" && p.metaInfo.next_episode_to_air?.air_date) {
              const nextAir = new Date(p.metaInfo.next_episode_to_air.air_date).getTime()
              if (nextAir > now && nextAir - now < twoWeeks) return <div className="absolute inset-0"><ExtraBadge label="Nuova stagione" containerW={380} containerH={570} color={p.badgeBgColor} /></div>
            }

            if (p.isTendenza) return <div className="absolute inset-0"><ExtraBadge label="Di Tendenza" containerW={380} containerH={570} color={p.badgeBgColor} /></div>

            if (p.trendRank) return <div className="absolute inset-0"><RankingBadge rank={p.trendRank} containerW={380} containerH={570} color={p.badgeBgColor} /></div>

            const tvType = p.selected?.media_type === "tv" ? p.metaInfo.type : null
            const status = p.selected?.media_type === "tv" ? p.metaInfo.status : null
            const extra = tvType === "Miniseries" ? "Miniserie" : status === "Returning Series" ? "Ritorna" : p.metaInfo.voteAverage >= 8 ? "Da divorare" : null
            if (extra) return <div className="absolute inset-0"><ExtraBadge label={extra} containerW={380} containerH={570} color={p.badgeBgColor} /></div>
            return null
          })()}
          {badgesVisible && <div className="absolute inset-0"><GenreRatingBadges genreName={p.metaInfo.genres[0].name} voteAverage={p.metaInfo.voteAverage} containerW={380} containerH={570} /></div>}
        </div>
        </div>
      {p.selected && (
        <div className="text-center select-text mt-3">
          <h2 className="text-xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{p.titleOf(p.selected)}</h2>
          <p className="text-sm text-zinc-300 mt-0.5">{p.yearOf(p.selected)} {p.selected.media_type === "movie" ? "Film" : "Serie TV"}</p>
          <p className="text-[13px] text-zinc-400 mt-1">TMDB: <a href={`https://www.themoviedb.org/${p.selected.media_type}/${p.selected.id}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 underline underline-offset-2">{p.selected.id}</a>{p.selected.imdb_id ? <> • IMDB: <a href={`https://www.imdb.com/title/${p.selected.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 underline underline-offset-2">{p.selected.imdb_id}</a></> : ""}</p>
        </div>
      )}
      {p.previewPoster && p.selected && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={p.saveConfig} className="flex-1 min-w-0 py-3 px-4 rounded-xl text-sm font-bold bg-accent-orange text-white hover:bg-accent-orange/90 hover:shadow-lg hover:shadow-accent-orange/25 active:scale-[0.97] transition-all duration-200">💾 Salva Poster</button>
          <button onClick={() => window.open(p.previewUrl || p.urlPattern.replace("{type}", p.selected!.media_type).replace("{tmdb_id}", String(p.selected!.id)), "_blank")} className="py-3 px-4 rounded-xl text-sm font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-accent/40 active:scale-[0.97] transition-all duration-200">🔍 Testa URL</button>
          {(() => {
            const key = `${p.selected!.media_type}:${p.selected!.id}`
            const hasMapping = p.mappingsMap.get(key)
            if (!hasMapping) return null
            return (
              <button onClick={() => { p.removeMapping(hasMapping); p.setSelected(null); p.setPreviewPoster(null); p.setSelectedLogo(null); p.setPreviewId(null) }} className="py-3 px-4 rounded-xl text-sm font-semibold bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/50 hover:border-red-500 active:scale-[0.97] transition-all duration-200">🗑️ Rimuovi</button>
            )
          })()}
        </div>
      )}
      {p.previewPoster?.iso_639_1 === null && p.selectedLogo && (
        <div className="mt-3 bg-[#141414] border border-zinc-700/40 rounded-xl p-4 shadow-lg shadow-black/30 pb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-zinc-300">🔄 Trasforma</h4>
            <button onClick={() => { p.setLogoScale(75); p.setLogoOffsetX(0); p.setLogoOffsetY(0) }} className="text-[10px] text-zinc-500 hover:text-accent transition-colors px-2 py-0.5 rounded-md border border-zinc-700/50 hover:border-accent/30">Reset</button>
          </div>
          <div className="space-y-2.5">
            <SliderRow icon="🔍" label="Scala" value={p.logoScale} min={10} max={100} boundsMin={10} boundsMax={100} onChange={p.setLogoScale} onDoubleClick={() => p.setLogoScale(75)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="scale" />
            <SliderRow icon="↔️" label="X" value={p.logoOffsetX} min={p.logoBounds.minX} max={p.logoBounds.maxX} boundsMin={p.logoBounds.minX} boundsMax={p.logoBounds.maxX} onChange={p.setLogoOffsetX} onDoubleClick={() => p.setLogoOffsetX(0)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="ox" />
            <SliderRow icon="↕️" label="Y" value={p.logoOffsetY} min={p.logoBounds.minY} max={p.logoBounds.maxY} boundsMin={p.logoBounds.minY} boundsMax={p.logoBounds.maxY} onChange={p.setLogoOffsetY} onDoubleClick={() => p.setLogoOffsetY(0)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="oy" />
          </div>
        </div>
      )}
      <p className="text-[11px] text-zinc-400 text-center mt-3">{p.selectedLogo ? "✓ Logo selezionato" : p.previewPoster?.iso_639_1 === null ? "Poster clean selezionato" : p.previewPoster ? "Poster con testo selezionato — seleziona un poster clean per i loghi" : "Nessun poster selezionato"}</p>
    </div>
  )

  const cleanPoster = p.previewPoster?.iso_639_1 === null

  const logoCol = (
    <div className="w-full md:w-64 shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-3" style={{ animationDelay: "120ms", animationFillMode: "backwards" }}>
      <h3 className="text-base font-semibold text-zinc-200 mb-3 text-center">🎯 Loghi</h3>
      <LogoOptions logos={p.logos} selectedLogo={p.selectedLogo} lang={p.lang} selectLogo={p.selectLogo} removeLogo={p.removeLogo} disabled={!cleanPoster} />
      {!cleanPoster && <p className="text-xs text-zinc-400 text-center mt-1 mb-1 px-1 font-medium">Seleziona un poster clean per abilitare i loghi</p>}
      <hr className="border-zinc-700 my-3" />
      <h4 className="text-sm font-semibold text-zinc-400 mb-2 px-1">🏷️ Badge</h4>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-zinc-400">🔥 Trend</span>
        <Toggle value={p.rankingBadges} onChange={(v) => { p.setRankingBadges(v); localStorage.setItem("ranking_badges", v ? "1" : "0") }} />
      </div>
      <div className="flex items-center justify-between px-1 mt-2">
        <span className="text-xs text-zinc-400">🏷️ Genere / Rating</span>
        <Toggle value={p.globalBadges} onChange={(v) => { p.setGlobalBadges(v); localStorage.setItem("global_badges", v ? "1" : "0") }} />
      </div>
    </div>
  )

  return (
    <div>
      {p.selected && (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-lg mb-8 relative z-[100] isolate">
            <SearchBar tmdbKey={p.tmdbKey} value={p.query} onChange={p.setQuery} onSearch={(q) => { p.setQuery(q); window.history.pushState({ view: "search" }, ""); p.setView("search"); p.doSearch(q) }} large onFocus={() => setSearchFocused(true)} onBlur={() => { blurTimerRef.current = setTimeout(() => setSearchFocused(false), 200) }} />
            {searchFocused && p.recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 animate-fade-scale-in">
                <p className="text-[10px] text-zinc-500 font-medium px-2 py-1">Ricerche recenti</p>
                {p.recentSearches.map((s) => (
                  <div key={s} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-zinc-800 group transition-all duration-150">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { p.setQuery(s); p.setView("search"); p.doSearch(s); window.history.pushState({ view: "search" }, ""); setSearchFocused(false) }} className="flex-1 flex items-center gap-2 text-xs text-zinc-300 hover:text-accent transition-all duration-150 text-left">
                      <span className="text-zinc-500">🕐</span> {s}
                    </button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => p.removeRecentSearch(s)} className="text-red-400 hover:text-red-300 transition-all duration-150 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 justify-center items-start">
            {previewCol}
            {posterCol}
            {logoCol}
          </div>
        </div>
      )}
      {!p.selected && (
        <div className="max-w-lg mx-auto relative z-[100] isolate mb-8">
          <SearchBar tmdbKey={p.tmdbKey} value={p.query} onChange={p.setQuery} onSearch={(q) => { p.setQuery(q); window.history.pushState({ view: "search" }, ""); p.setView("search"); p.doSearch(q) }} large onFocus={() => setSearchFocused(true)} onBlur={() => { blurTimerRef.current = setTimeout(() => setSearchFocused(false), 200) }} />
            {searchFocused && p.recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 animate-fade-scale-in">
                <p className="text-[10px] text-zinc-500 font-medium px-2 py-1">Ricerche recenti</p>
                {p.recentSearches.map((s) => (
                  <div key={s} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-zinc-800 group transition-all duration-150">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { p.setQuery(s); p.setView("search"); p.doSearch(s); window.history.pushState({ view: "search" }, ""); setSearchFocused(false) }} className="flex-1 flex items-center gap-2 text-xs text-zinc-300 hover:text-accent transition-all duration-150 text-left">
                      <span className="text-zinc-500">🕐</span> {s}
                    </button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => p.removeRecentSearch(s)} className="text-red-400 hover:text-red-300 transition-all duration-150 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
      )}
      {!p.selected && !p.tmdbKey && (
        <div className="flex flex-col items-center justify-center pb-16 text-zinc-400">
          <p className="text-sm">🔑 Inserisci una chiave TMDB in ⚙️ Impostazioni per cercare</p>
        </div>
      )}
      {!p.selected && p.tmdbKey && (
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <h2 className="text-xl font-bold">🔥 Top 10 Italia JustWatch</h2>
          </div>
          {p.trending.length > 0 && (
            <div className="space-y-6">
              {(["movie", "tv"] as const).map((mediaType) => {
                const items = p.trending.filter((r) => r.media_type === mediaType).slice(0, 10)
                return <RankRow key={mediaType} label={mediaType === "movie" ? "FILM" : "SERIE TV"} items={items} onItemClick={(item) => p.navigateToPoster(item as any)} />
              })}
            </div>
          )}

          {p.STREAMING_PLATFORMS.map((sp) => {
            const chart = p.streamingCharts[sp.slug]
            if (!chart || (chart.movies.length === 0 && chart.tv.length === 0)) return null
            return (
              <div key={sp.slug} className="mt-10">
                <h2 className="text-xl font-bold mb-4 text-center">{sp.icon} Top 10 {sp.name} Italia</h2>
                <div className="space-y-6">
                  {([["movie", chart.movies], ["tv", chart.tv]] as const).map(([mediaType, items]) => {
                    if (items.length === 0) return null
                    return <RankRow key={mediaType} label={mediaType === "movie" ? "FILM" : "SERIE TV"} items={items.map((i) => ({ ...i, poster_path: i.posterPath, name: i.title }))} onItemClick={(item) => { if (item.tmdbId) p.navigateToPoster({ id: item.tmdbId, media_type: mediaType, title: item.title ?? "", name: item.title ?? "", poster_path: item.posterPath } as any) }} />
                  })}
                </div>
              </div>
            )
          })}

          {p.trending.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
              <p className="text-sm">Caricamento...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
