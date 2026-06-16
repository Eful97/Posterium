"use client"

import { useState, useRef, useEffect } from "react"
import { useP } from "@/lib/context"
import { PosterOptions } from "@/components/PosterOptions"
import { LogoOptions } from "@/components/LogoOptions"
import { Toggle } from "@/components/Toggle"
import { SliderRow } from "@/components/SliderRow"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "@/lib/awards"
import { SearchBar } from "@/components/SearchBar"
import { RankRow } from "@/components/RankRow"
import { RankingBadge, GenreRatingBadges, ExtraBadge } from "@/components/PreviewBadges"

export default function EditView() {
  const p = useP()
  const [searchFocused, setSearchFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previewDims, setPreviewDims] = useState({ w: 380, h: 570 })
  const previewRef = useRef<HTMLDivElement>(null)

  const defaultLogoScale = () => {
    const l = p.selectedLogo
    if (!l || !l.width || !l.height) { p.setLogoScale(75); return }
    const lw = l.width
    const lh = l.height
    const maxH = Math.round(1500 * 0.25)
    const effW = Math.round(maxH * lw / lh)
    p.setLogoScale(Math.min(Math.round(effW / 1000 * 100), 75))
  }

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setPreviewDims({ w, h: w * 1.5 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const posterCol = (
    <div className="w-full md:w-64 shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-1 space-y-4" style={{ animationDelay: "0ms", animationFillMode: "backwards" }}>
      <h3 className="text-base font-semibold text-zinc-200 mb-3 text-center">🖼️ Poster</h3>
      {p.loadingImages ? <div className="text-center py-12 text-zinc-400">Caricamento poster...</div> : <PosterOptions posters={p.posters} posterActivePath={p.posterActivePath} selected={p.selected} lang={p.lang} openSections={p.openSections} posterScrollRef={p.posterScrollRef} toggleSection={p.toggleSection} selectPoster={p.selectPoster} />}
    </div>
  )

  const badgesVisible = p.globalBadges && p.metaInfo.genres.length > 0 && p.metaInfo.voteAverage > 0

  const previewCol = (
    <div className="w-full max-w-[380px] md:w-[380px] shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-2" style={{ animationDelay: "60ms", animationFillMode: "backwards" }}>
      <h3 className="text-base font-semibold text-zinc-200 mb-3 text-center">👁️ Anteprima</h3>
      <div className="bg-zinc-800/80 rounded-2xl overflow-hidden relative shadow-2xl shadow-black/50 backdrop-blur-sm border border-white/[0.07]">
        <div ref={previewRef} className="relative aspect-[2/3] select-none pointer-events-none bg-zinc-900/50 overflow-hidden rounded-2xl">
          {p.previewPoster && <img src={p.posterUrl(p.previewPoster.file_path, "w500")} alt="" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover" />}
          {p.previewPoster?.iso_639_1 === null && p.selectedLogo && (() => {
            const scale = 0.38
            const baseGap = 57
            const badgeAdj = badgesVisible ? 0 : 15.2
            const bottomPx = baseGap - p.logoOffsetY * scale - badgeAdj
            return <div style={{ position: "absolute", left: 0, right: 0, bottom: `${bottomPx}px`, display: "flex", justifyContent: "center", zIndex: 10 }}><div style={{ transform: `translateX(${p.logoOffsetX * scale}px)`, width: `${p.logoScale}%`, maxWidth: "100%" }}><img src={p.posterUrl(p.selectedLogo.file_path, "original")} alt="" loading="eager" decoding="async" className="w-full" style={{ objectFit: "contain" }} /></div></div>
          })()}
          {p.rankingBadges && (() => {
            const now = Date.now()
            const twoWeeks = 14 * 24 * 60 * 60 * 1000
            const isNewMovie = p.selected?.media_type === "movie" && p.metaInfo.release_date ? (now - new Date(p.metaInfo.release_date).getTime()) < twoWeeks : false
            const isNewSeries = p.selected?.media_type === "tv" && p.metaInfo.first_air_date ? (now - new Date(p.metaInfo.first_air_date).getTime()) < twoWeeks : false
            const award = p.metaInfo.awards?.length ? getAwardBadgeLabel(p.metaInfo.awards) : null
            const nomination = !award && p.metaInfo.nominations?.length ? getNominationBadgeLabel(p.metaInfo.nominations) : null

            const edgeLum = (() => {
              const h = p.topEdgeColor
              if (h.length < 7 || h === "#ffffff") return null
              const r = parseInt(h.slice(1, 3), 16) / 255
              const g = parseInt(h.slice(3, 5), 16) / 255
              const b = parseInt(h.slice(5, 7), 16) / 255
              return 0.2126 * r + 0.7152 * g + 0.0722 * b
            })()
            const topLight = edgeLum !== null ? edgeLum > 0.55 && edgeLum < 0.99 : undefined

            if (isNewMovie) return <div className="absolute inset-0"><ExtraBadge label="Nuovo film" topLight={topLight} containerW={previewDims.w} /></div>
            if (isNewSeries) return <div className="absolute inset-0"><ExtraBadge label="Nuova serie" topLight={topLight} containerW={previewDims.w} /></div>
            if (award) return <div className="absolute inset-0"><ExtraBadge label={award} topLight={topLight} containerW={previewDims.w} /></div>
            if (nomination) return <div className="absolute inset-0"><ExtraBadge label={nomination} topLight={topLight} containerW={previewDims.w} /></div>
            if (p.metaInfo.franchise) return <div className="absolute inset-0"><ExtraBadge label={p.metaInfo.franchise} topLight={topLight} containerW={previewDims.w} /></div>

            const animeRank = p.mdblistAnimeList?.find((a: any) => a.id === p.selected?.id)
            if (animeRank) return <div className="absolute inset-0"><RankingBadge rank={animeRank.rank} label="Anime" topLight={topLight} containerW={previewDims.w} /></div>

            if (p.trendRank) return <div className="absolute inset-0"><RankingBadge rank={p.trendRank} topLight={topLight} containerW={previewDims.w} /></div>

            const studio = p.metaInfo.studios?.length ? p.metaInfo.studios[0] : null
            if (studio) return <div className="absolute inset-0"><ExtraBadge label={studio} topLight={topLight} containerW={previewDims.w} /></div>

            const tvType = p.selected?.media_type === "tv" ? p.metaInfo.type : null
            const status = p.selected?.media_type === "tv" ? p.metaInfo.status : null
            const extra = p.selected?.media_type === "movie" ? (p.metaInfo.voteAverage >= 8.5 ? "Il più votato" : null) : (tvType === "Miniseries" ? "Miniserie" : status === "Returning Series" ? "Ritorna" : p.metaInfo.voteAverage >= 8.5 ? "Da divorare" : null)
            if (extra) return <div className="absolute inset-0"><ExtraBadge label={extra} topLight={topLight} containerW={previewDims.w} /></div>
            return null
          })()}
          {badgesVisible && <div className="absolute inset-0"><GenreRatingBadges genreName={p.metaInfo.genres[0].name} voteAverage={p.metaInfo.voteAverage} containerW={previewDims.w} containerH={previewDims.h} /></div>}
        </div>
        </div>
      {p.selected && (
        <div className="text-center select-text mt-3">
          <h2 className="text-xl font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_2px_8px_rgba(0,0,0,0.7)]">{p.titleOf(p.selected)}</h2>
          <p className="text-sm text-zinc-300 mt-0.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">{p.yearOf(p.selected)} {p.selected.media_type === "movie" ? "Film" : "Serie TV"}</p>
          <p className="text-sm text-zinc-400 mt-1">TMDB: <a href={`https://www.themoviedb.org/${p.selected.media_type}/${p.selected.id}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 underline underline-offset-2">{p.selected.id}</a>{p.selected.imdb_id ? <> • IMDB: <a href={`https://www.imdb.com/title/${p.selected.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 underline underline-offset-2">{p.selected.imdb_id}</a></> : ""}</p>
        </div>
      )}
      {p.previewPoster && p.selected && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={p.saveConfig} className="flex-1 min-w-0 py-3 px-4 btn-primary font-bold active:scale-[0.97]">💾 Salva Poster</button>
          <button onClick={() => {
            if (!p.selected || !p.previewPoster) return
            const params: string[] = []
            if (p.tmdbKey) params.push(`api_key=${encodeURIComponent(p.tmdbKey)}`)
            if (!p.globalBadges) params.push("badges=0")
            if (!p.rankingBadges) params.push("ranking=0")
            params.push(`poster=${encodeURIComponent(p.previewPoster.file_path)}`)
            const g = p.metaInfo.genres[0]?.name
            if (g) params.push(`genreName=${encodeURIComponent(g)}`)
            if (p.metaInfo.voteAverage > 0) params.push(`voteAverage=${p.metaInfo.voteAverage}`)
            if (p.selectedLogo && p.previewPoster?.iso_639_1 === null) {
              params.push(`logo=${encodeURIComponent(p.selectedLogo.file_path)}`)
              params.push(`scale=${p.logoScale}`)
              params.push(`ox=${p.logoOffsetX}`)
              params.push(`oy=${p.logoOffsetY}`)
            }
            if (p.lang) params.push(`lang=${p.lang}`)
            if (p.rankingBadges) {
              const now = Date.now()
              const twoWeeks = 14 * 24 * 60 * 60 * 1000
              const isNewMovie = p.selected.media_type === "movie" && p.metaInfo.release_date ? (now - new Date(p.metaInfo.release_date).getTime()) < twoWeeks : false
              const isNewSeries = p.selected.media_type === "tv" && p.metaInfo.first_air_date ? (now - new Date(p.metaInfo.first_air_date).getTime()) < twoWeeks : false
            const award = p.metaInfo.awards?.length ? getAwardBadgeLabel(p.metaInfo.awards) : null
            const nomination = !award && p.metaInfo.nominations?.length ? getNominationBadgeLabel(p.metaInfo.nominations) : null
              if (isNewMovie) params.push(`extra=${encodeURIComponent("Nuovo film")}`)
              else if (isNewSeries) params.push(`extra=${encodeURIComponent("Nuova serie")}`)
              else if (award) params.push(`extra=${encodeURIComponent(award)}`)
              else if (nomination) params.push(`extra=${encodeURIComponent(nomination)}`)
              else if (p.metaInfo.franchise) params.push(`extra=${encodeURIComponent(p.metaInfo.franchise)}`)
              else {
                const animeRank = p.mdblistAnimeList?.find((a: any) => a.id === p.selected!.id)
                if (animeRank) params.push(`rank=${animeRank.rank}&label=Anime`)
                else if (p.trendRank) params.push(`rank=${p.trendRank}`)
                else {
                  const studio = p.metaInfo.studios?.length ? p.metaInfo.studios[0] : null
                  if (studio) params.push(`extra=${encodeURIComponent(studio)}`)
                  else {
                    const tvType = p.selected.media_type === "tv" ? p.metaInfo.type : null
                    const tvStatus = p.selected.media_type === "tv" ? p.metaInfo.status : null
                    const extra = p.selected.media_type === "movie" ? (p.metaInfo.voteAverage >= 8.5 ? "Il più votato" : null) : (tvType === "Miniseries" ? "Miniserie" : tvStatus === "Returning Series" ? "Ritorna" : p.metaInfo.voteAverage >= 8.5 ? "Da divorare" : null)
                    if (extra) params.push(`extra=${encodeURIComponent(extra)}`)
                  }
                }
              }
            }
            params.push(`v=${Date.now()}`)
            window.open(`/api/poster/${p.selected.media_type}/${p.selected.id}?${params.join("&")}`, "_blank")
          }} className="py-3 px-4 rounded-xl text-sm font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-accent/40 active:scale-[0.97] transition-all duration-200">🔍 Testa URL</button>
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
        <div className="mt-3 bg-background border border-zinc-700/40 rounded-xl p-4 shadow-lg shadow-black/30 pb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-zinc-300">🔄 Trasforma</h4>
            <button onClick={() => { defaultLogoScale(); p.setLogoOffsetX(0); p.setLogoOffsetY(0) }} className="text-xs text-zinc-400 hover:text-accent transition-colors px-2 py-0.5 rounded-md border border-zinc-700/50 hover:border-accent/30">Reset</button>
          </div>
          <div className="space-y-2">
            <SliderRow icon="🔍" label="Scala" value={p.logoScale} min={10} max={100} boundsMin={10} boundsMax={100} onChange={p.setLogoScale} onDoubleClick={defaultLogoScale} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="scale" />
            <SliderRow icon="↔️" label="X" value={p.logoOffsetX} min={p.logoBounds.minX} max={p.logoBounds.maxX} boundsMin={p.logoBounds.minX} boundsMax={p.logoBounds.maxX} onChange={p.setLogoOffsetX} onDoubleClick={() => p.setLogoOffsetX(0)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="ox" />
            <SliderRow icon="↕️" label="Y" value={p.logoOffsetY} min={p.logoBounds.minY} max={p.logoBounds.maxY} boundsMin={p.logoBounds.minY} boundsMax={p.logoBounds.maxY} onChange={p.setLogoOffsetY} onDoubleClick={() => p.setLogoOffsetY(0)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="oy" />
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-400 text-center mt-3">{p.selectedLogo ? "✓ Logo selezionato" : p.previewPoster?.iso_639_1 === null ? "Poster clean selezionato" : p.previewPoster ? "Poster con testo selezionato — seleziona un poster clean per i loghi" : "Nessun poster selezionato"}</p>
    </div>
  )

  const cleanPoster = p.previewPoster?.iso_639_1 === null

  const logoCol = (
    <div className="w-full md:w-64 shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-3" style={{ animationDelay: "120ms", animationFillMode: "backwards" }}>
      <h3 className="text-base font-semibold text-zinc-200 mb-3 text-center">🎯 Loghi</h3>
      <LogoOptions logos={p.logos} selectedLogo={p.selectedLogo} lang={p.lang} selectLogo={p.selectLogo} removeLogo={p.removeLogo} disabled={!cleanPoster} />
      {!cleanPoster && <p className="text-xs text-zinc-400 text-center mt-1 mb-1 px-1 font-medium">Seleziona un poster clean per abilitare i loghi</p>}
      <hr className="border-zinc-700 my-3" />
      <h4 className="text-sm font-semibold text-zinc-300 mb-2 px-1">🏷️ Badge</h4>
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
                <p className="text-xs text-zinc-400 font-semibold px-2 py-1.5">Ricerche recenti</p>
                {p.recentSearches.map((s) => (
                  <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => { p.setQuery(s); p.setView("search"); p.doSearch(s); window.history.pushState({ view: "search" }, ""); setSearchFocused(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent-orange/10 text-sm text-zinc-300 hover:text-accent transition-all duration-150 text-left">
                    <span className="text-zinc-500 shrink-0">🕐</span>
                    <span className="flex-1 truncate">{s}</span>
                    <span onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); p.removeRecentSearch(s) }} className="text-red-400 hover:text-red-300 transition-all duration-150 text-sm px-2 shrink-0">✕</span>
                  </button>
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
                <p className="text-xs text-zinc-400 font-semibold px-2 py-1.5">Ricerche recenti</p>
                {p.recentSearches.map((s) => (
                  <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => { p.setQuery(s); p.setView("search"); p.doSearch(s); window.history.pushState({ view: "search" }, ""); setSearchFocused(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent-orange/10 text-sm text-zinc-300 hover:text-accent transition-all duration-150 text-left">
                    <span className="text-zinc-500 shrink-0">🕐</span>
                    <span className="flex-1 truncate">{s}</span>
                    <span onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); p.removeRecentSearch(s) }} className="text-red-400 hover:text-red-300 transition-all duration-150 text-sm px-2 shrink-0">✕</span>
                  </button>
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
            <h2 className="text-xl font-bold">🔥 Top 20 Italia JustWatch</h2>
          </div>
          {p.trending.length > 0 && (
            <div className="space-y-6">
              {(["movie", "tv"] as const).map((mediaType) => {
                const items = p.trending.filter((r) => r.media_type === mediaType).slice(0, 20)
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

          {p.mdblistAnimeList.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4 text-center">🎌 Top 20 Anime di tendenza</h2>
              <RankRow label="ANIME" items={p.mdblistAnimeList} onItemClick={(item: any) => p.navigateToPoster({ id: item.id ?? 0, media_type: item.media_type || 'tv', title: item.title ?? '', name: item.title ?? '', poster_path: item.poster_path ?? '' })} />
            </div>
          )}

          {p.trending.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <p className="text-sm">Caricamento...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
