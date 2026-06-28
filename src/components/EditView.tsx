"use client"

import { useState, useRef, useEffect } from "react"
import { useP } from "@/lib/context"
import { PosterOptions } from "@/components/PosterOptions"
import { LogoOptions } from "@/components/LogoOptions"
import { Toggle } from "@/components/Toggle"
import { SliderRow } from "@/components/SliderRow"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "@/lib/awards"
import { computeBadge, computeExtraFallback, getAllBadgeOptions } from "@/lib/badge-priority"
import { resolveLabel, isRankKey, isPrefixedKey, badgeKey } from "@/lib/i18n"
import { SearchBar } from "@/components/SearchBar"
import { RankRow } from "@/components/RankRow"
import { RankingBadge, GenreRatingBadges, ExtraBadge } from "@/components/PreviewBadges"
import { RefreshCw, Search, Image, Ruler, Cloud, Minus, Circle, Moon, Pill, Square, BarChart3, Check, XCircle, ArrowLeftRight, ArrowUpDown, Clock, X } from "lucide-react"

export default function EditView() {
  const p = useP()
  const [searchFocused, setSearchFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previewDims, setPreviewDims] = useState({ w: 380, h: 570 })
  const previewRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [imageError, setImageError] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, startOX: 0, startOY: 0, active: false })
  const logoWheelRef = useRef<HTMLDivElement>(null)
  const [now] = useState(() => Date.now())
  const [posterLoading, setPosterLoading] = useState(false)

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
    setImageError(false)
    setPosterLoading(true)
  }, [p.previewPoster])

  const searchBar = (
    <div className={p.selected ? "w-full max-w-lg mb-8 relative z-[100] isolate" : "max-w-lg mx-auto relative z-[100] isolate mb-8"}>
      <SearchBar tmdbKey={p.tmdbKey} value={p.query} onChange={p.setQuery} onSearch={(q) => { p.setQuery(q); window.history.pushState({ view: "search" }, ""); p.setView("search"); p.doSearch(q) }} large onFocus={() => setSearchFocused(true)} onBlur={() => { blurTimerRef.current = setTimeout(() => setSearchFocused(false), 200) }} />
      {searchFocused && p.recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 animate-fade-scale-in">
          <p className="text-xs text-zinc-400 font-semibold px-2 py-1.5">{p.t("ui.recentSearches")}</p>
          {p.recentSearches.map((s) => (
            <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => { p.setQuery(s); p.setView("search"); p.doSearch(s); window.history.pushState({ view: "search" }, ""); setSearchFocused(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent-orange/10 text-sm text-zinc-300 hover:text-accent transition-all duration-150 text-left">
              <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="flex-1 truncate">{s}</span>
              <span onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); p.removeRecentSearch(s) }} className="text-red-400 hover:text-red-300 transition-all duration-150 text-sm px-2 shrink-0"><X className="w-3.5 h-3.5" /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const el = logoWheelRef.current
    if (!el) return
    const fn = (e: WheelEvent) => {
      if (!e.shiftKey) return
      e.preventDefault()
      p.setLogoScale((s) => Math.max(10, Math.min(100, s - Math.sign(e.deltaY) * 20)))
    }
    el.addEventListener("wheel", fn, { passive: false })
    return () => el.removeEventListener("wheel", fn)
  })

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

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { p.setSettingsOpen(false); p.setShowLangPicker(false) }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); p.saveConfig() }
    }
    addEventListener("keydown", fn)
    return () => removeEventListener("keydown", fn)
  }, [])

  const posterCol = (
    <div className="w-full md:w-72 xl:w-80 2xl:w-96 shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-1 space-y-4" style={{ animationDelay: "0ms", animationFillMode: "backwards" }}>
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1 text-center">{p.t("ui.posterSection")}</h3>
        {p.loadingImages ? <div className="text-center py-12 text-zinc-400">{p.t("ui.loadingPoster")}</div> : <PosterOptions posters={p.posters} posterActivePath={p.posterActivePath} selected={p.selected} lang={p.lang} openSections={p.openSections} posterScrollRef={p.posterScrollRef} toggleSection={p.toggleSection} selectPoster={p.selectPoster} />}
      </div>
    </div>
  )

  const badgesVisible = p.globalBadges && p.metaInfo.genres.length > 0 && p.metaInfo.voteAverage > 0

  const genreTopLight = (() => {
    const h = p.topEdgeColor
    if (h.length < 7) return true
    if (h === "#555555") return true
    const r = parseInt(h.slice(1, 3), 16) / 255
    const g = parseInt(h.slice(3, 5), 16) / 255
    const b = parseInt(h.slice(5, 7), 16) / 255
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.60
  })()

  const previewCol = (
    <div className="w-full max-w-[400px] md:w-[400px] xl:max-w-[520px] 2xl:max-w-[600px] shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-2" style={{ animationDelay: "60ms", animationFillMode: "backwards" }}>
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 overflow-hidden">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1 text-center">{p.t("ui.previewSection")}</h3>
        <div className="bg-zinc-800/80 rounded-2xl overflow-hidden relative shadow-2xl shadow-black/50 backdrop-blur-sm border border-white/[0.07]">
        <div ref={previewRef} className="relative aspect-[2/3] select-none pointer-events-none bg-zinc-900/50 overflow-hidden rounded-2xl">
          {p.previewPoster && !imageError && <>
            {posterLoading && <div className="absolute inset-0 bg-zinc-800 animate-pulse rounded-2xl" />}
            <img src={p.posterUrl(p.previewPoster.file_path, "w342")} alt="" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover" onLoad={() => setPosterLoading(false)} onError={() => { setImageError(true); setPosterLoading(false) }} />
          </>}
          {imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 text-center p-8">
              <Image className="w-12 h-12 mb-3 text-zinc-500" />
              <p className="text-sm text-zinc-400 font-medium">{p.t("ui.imageNotAvailable")}</p>
              <p className="text-xs text-zinc-500 mt-1">{p.t("ui.posterLoadError")}</p>
              <button onClick={() => setImageError(false)} className="mt-3 px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-all duration-150"><span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />{p.t("ui.retry")}</span></button>
            </div>
          )}
          {p.previewPoster?.iso_639_1 === null && p.selectedLogo && (() => {
            const scale = 0.38
            const baseGap = 57
            const badgeAdj = badgesVisible ? 0 : 15.2
            const bottomPx = baseGap - p.logoOffsetY * scale - badgeAdj
            return <div ref={logoWheelRef} style={{ position: "absolute", left: 0, right: 0, bottom: `${bottomPx}px`, display: "flex", justifyContent: "center", zIndex: 10, pointerEvents: "auto" }}>
              <div
                style={{
                  transform: `translateX(${p.logoOffsetX * scale}px)`,
                  width: `${p.logoScale}%`,
                  maxWidth: "100%",
                  cursor: dragging ? "grabbing" : "grab",
                  position: "relative",
                }}
                onPointerDown={(e) => {
                  e.preventDefault(); e.stopPropagation()
                  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                  dragRef.current = { startX: e.clientX, startY: e.clientY, startOX: p.logoOffsetX, startOY: p.logoOffsetY, active: true }
                  setDragging(false)
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current.active) return
                  const dx = e.clientX - dragRef.current.startX
                  const dy = e.clientY - dragRef.current.startY
                  if (!dragging && Math.abs(dx) + Math.abs(dy) < 4) return
                  if (!dragging) { setDragging(true); return }
                  p.setLogoOffsetX(dragRef.current.startOX + Math.round(dx / scale))
                  p.setLogoOffsetY(dragRef.current.startOY + Math.round(dy / scale))
                }}
                onPointerUp={(e) => {
                  ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
                  setDragging(false); dragRef.current.active = false
                }}
                onPointerLeave={() => { setDragging(false); dragRef.current.active = false }}
                onDoubleClick={() => {
                  const l = p.selectedLogo
                  if (l && l.width && l.height) {
                    const maxH = Math.round(1500 * 0.25)
                    const effW = Math.round(maxH * l.width / l.height)
                    p.setLogoScale(Math.min(Math.round(effW / 1000 * 100), 75))
                  } else {
                    p.setLogoScale(75)
                  }
                  p.setLogoOffsetX(0)
                  p.setLogoOffsetY(0)
                }}
                ><img src={p.posterUrl(p.selectedLogo.file_path, "original")} alt="" loading="eager" decoding="async" className="w-full relative" style={{ objectFit: "contain" }} /></div></div>
          })()}
          {p.rankingBadges && (() => {
            // eslint-disable-next-line
            const twoWeeks = 14 * 24 * 60 * 60 * 1000
            const isNewMovie = p.selected?.media_type === "movie" && p.metaInfo.release_date ? (now - new Date(p.metaInfo.release_date).getTime()) < twoWeeks : false
            const isNewSeries = p.selected?.media_type === "tv" && p.metaInfo.first_air_date ? (now - new Date(p.metaInfo.first_air_date).getTime()) < twoWeeks : false
            const award = p.metaInfo.awards?.length ? getAwardBadgeLabel(p.metaInfo.awards, p.t) : null
            const nomination = !award && p.metaInfo.nominations?.length ? getNominationBadgeLabel(p.metaInfo.nominations, p.t) : null

            const animeRankData = p.mdblistAnimeList?.find((a: any) => a.id === p.selected?.id)
            const animeRank = animeRankData ? animeRankData.rank : null
            const studio = p.metaInfo.studios?.length ? p.metaInfo.studios[0] : null
            const tvType = p.selected?.media_type === "tv" ? p.metaInfo.type : null
            const tvStatus = p.selected?.media_type === "tv" ? p.metaInfo.status : null
            const extra = computeExtraFallback({ mediaType: p.selected?.media_type === "tv" ? "tv" : "movie", voteAverage: p.metaInfo.voteAverage, tvType, tvStatus }, p.t)
            const autoBadge = computeBadge({ isNewMovie, isNewSeries, animeRank, trendRank: p.trendRank, award, franchise: p.metaInfo.franchise || null, nomination, studio, director: p.metaInfo.director || null, extra }, p.t)
            const badge = p.customBadge
              ? (() => {
                  const rk = isRankKey(p.customBadge)
                  if (rk === "badge.today" && p.trendRank) return { type: "rank" as const, label: p.t("badge.today"), rank: p.trendRank, rankLabel: p.t("badge.today") }
                  if (rk === "badge.anime" && animeRank) return { type: "rank" as const, label: p.t("badge.anime"), rank: animeRank, rankLabel: p.t("badge.anime") }
                  return { type: "extra" as const, label: resolveLabel(p.customBadge) }
                })()
              : autoBadge
            if (badge) {
              if (badge.type === "extra") return <div className="absolute inset-0"><ExtraBadge label={badge.label} topLight={genreTopLight} containerW={previewDims.w} badgeStyle={p.rankingBadgeStyle} accentColor={p.accentColor} /></div>
              return <div className="absolute inset-0"><RankingBadge rank={badge.rank!} label={badge.rankLabel || badge.label} topLight={genreTopLight} containerW={previewDims.w} badgeStyle={p.rankingBadgeStyle} accentColor={p.accentColor} /></div>
            }
            return null
          })()}
          {badgesVisible && <div className="absolute inset-0"><GenreRatingBadges genreName={p.metaInfo.genres[0].name} voteAverage={p.metaInfo.voteAverage} containerW={previewDims.w} containerH={previewDims.h} gradientHeight={p.gradientHeight} blurIntensity={p.blurIntensity} blurFade={p.blurFade} blurDarkness={p.blurDarkness} blurEnabled={p.blurEnabled} badgeStyle={p.badgeStyle} accentColor={p.accentColor} topLight={genreTopLight} releaseDate={p.metaInfo.release_date || p.metaInfo.first_air_date} rankingBadgeStyle={p.rankingBadgeStyle} /></div>}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: "3px solid rgba(255,255,255,0.80)", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)" }} />
        </div>
        </div>
      </div>
      {p.selected && (
        <div className="text-center select-text mt-3">
          <h2 className="text-xl font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_2px_8px_rgba(0,0,0,0.7)]">{p.titleOf(p.selected)}</h2>
          <p className="text-sm text-zinc-300 mt-0.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">{p.yearOf(p.selected)} {p.selected.media_type === "movie" ? p.t("ui.movie") : p.t("ui.tvSeries")}</p>
          <p className="text-sm text-zinc-400 mt-1">TMDB: <a href={`https://www.themoviedb.org/${p.selected.media_type}/${p.selected.id}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 underline underline-offset-2">{p.selected.id}</a>{p.selected.imdb_id ? <> • IMDB: <a href={`https://www.imdb.com/title/${p.selected.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 underline underline-offset-2">{p.selected.imdb_id}</a></> : ""}</p>
        </div>
      )}
      {p.previewPoster && p.selected && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={p.saveConfig} className="flex-1 min-w-0 py-3 px-4 btn-primary font-bold active:scale-[0.97]">{p.t("ui.savePoster")}</button>
          <button onClick={() => {
            if (!p.selected || !p.previewPoster) return
            const params: string[] = []
            if (p.tmdbKey) params.push(`api_key=${encodeURIComponent(p.tmdbKey)}`)
            if (!p.globalBadges) params.push("badges=0")
            if (!p.rankingBadges) params.push("ranking=0")
            params.push(`poster=${encodeURIComponent(p.previewPoster.file_path)}`)
            if (p.accentColor) params.push(`ac=${encodeURIComponent(p.accentColor)}`)
            const _h = p.topEdgeColor
            const _edgeLum = _h.length >= 7 && _h !== "#555555"
              ? 0.2126 * parseInt(_h.slice(1, 3), 16) / 255 + 0.7152 * parseInt(_h.slice(3, 5), 16) / 255 + 0.0722 * parseInt(_h.slice(5, 7), 16) / 255
              : null
            params.push(`tl=${_edgeLum !== null ? (_edgeLum > 0.60 ? "1" : "0") : "1"}`)
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
            params.push(`gradHeight=${p.gradientHeight}`)
            params.push(`blur=${p.blurIntensity}`)
            params.push(`bf=${p.blurFade}`)
            params.push(`bd=${p.blurDarkness}`)
            if (!p.blurEnabled) params.push("be=0")
            params.push(`bs=${p.badgeStyle}`)
            params.push(`rs=${p.rankingBadgeStyle}`)
            if (p.rankingBadges) {
              const now = Date.now()
              const twoWeeks = 14 * 24 * 60 * 60 * 1000
              const isNewMovie = p.selected.media_type === "movie" && p.metaInfo.release_date ? (now - new Date(p.metaInfo.release_date).getTime()) < twoWeeks : false
              const isNewSeries = p.selected.media_type === "tv" && p.metaInfo.first_air_date ? (now - new Date(p.metaInfo.first_air_date).getTime()) < twoWeeks : false
              const award = p.metaInfo.awards?.length ? getAwardBadgeLabel(p.metaInfo.awards, p.t) : null
              const nomination = !award && p.metaInfo.nominations?.length ? getNominationBadgeLabel(p.metaInfo.nominations, p.t) : null
              const animeRankData = p.mdblistAnimeList?.find((a: any) => a.id === p.selected!.id)
              const animeRank = animeRankData ? animeRankData.rank : null
              const studio = p.metaInfo.studios?.length ? p.metaInfo.studios[0] : null
              const tvType = p.selected.media_type === "tv" ? p.metaInfo.type : null
              const tvStatus = p.selected.media_type === "tv" ? p.metaInfo.status : null
              const extra = computeExtraFallback({ mediaType: p.selected.media_type === "tv" ? "tv" : "movie", voteAverage: p.metaInfo.voteAverage, tvType, tvStatus }, p.t)
              if (p.customBadge) {
                const rk = isRankKey(p.customBadge)
                if (rk === "badge.today" && p.trendRank) params.push(`rank=${p.trendRank}&label=${encodeURIComponent(p.t("badge.today"))}`)
                else if (rk === "badge.anime" && animeRank) params.push(`rank=${animeRank}&label=${encodeURIComponent(p.t("badge.anime"))}`)
                else params.push(`extra=${encodeURIComponent(resolveLabel(p.customBadge))}`)
              } else {
                const badge = computeBadge({ isNewMovie, isNewSeries, animeRank, trendRank: p.trendRank, award, franchise: p.metaInfo.franchise || null, nomination, studio, director: p.metaInfo.director || null, extra }, p.t)
                if (badge) {
                  if (badge.type === "extra") params.push(`extra=${encodeURIComponent(badge.label)}`)
                  else params.push(`rank=${badge.rank}&label=${encodeURIComponent(badge.rankLabel || badge.label)}`)
                }
              }
            }
            params.push(`v=${Date.now()}`)
            window.open(`/api/poster/${p.selected.media_type}/${p.selected.id}?${params.join("&")}`, "_blank")
          }} className="py-3 px-4 rounded-xl text-sm font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-accent/40 active:scale-[0.97] transition-all duration-200">{p.t("ui.testUrl")}</button>
          {(() => {
            const key = `${p.selected!.media_type}:${p.selected!.id}`
            const hasMapping = p.mappingsMap.get(key)
            if (!hasMapping) return null
            return (
              <button onClick={() => { p.removeMapping(hasMapping); p.setSelected(null); p.setPreviewPoster(null); p.setSelectedLogo(null); p.setPreviewId(null) }} className="py-3 px-4 rounded-xl text-sm font-semibold bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/50 hover:border-red-500 active:scale-[0.97] transition-all duration-200">{p.t("ui.remove")}</button>
            )
          })()}
        </div>
      )}
      {p.previewPoster?.iso_639_1 === null && p.selectedLogo && (
        <div className="mt-3 bg-background border border-zinc-700/40 rounded-xl p-4 shadow-lg shadow-black/30 pb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-zinc-300">{p.t("ui.transform")}</h4>
            <button onClick={() => { defaultLogoScale(); p.setLogoOffsetX(0); p.setLogoOffsetY(0) }} className="text-xs text-zinc-400 hover:text-accent transition-colors px-2 py-0.5 rounded-md border border-zinc-700/50 hover:border-accent/30">{p.t("ui.reset")}</button>
          </div>
          <div className="space-y-2">
            <SliderRow icon={<Search className="w-3.5 h-3.5" />} label={p.t("ui.scale")} value={p.logoScale} min={10} max={100} boundsMin={10} boundsMax={100} onChange={p.setLogoScale} onDoubleClick={defaultLogoScale} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="scale" />
            <SliderRow icon={<ArrowLeftRight className="w-3.5 h-3.5" />} label="X" value={p.logoOffsetX} min={p.logoBounds.minX} max={p.logoBounds.maxX} boundsMin={p.logoBounds.minX} boundsMax={p.logoBounds.maxX} onChange={p.setLogoOffsetX} onDoubleClick={() => p.setLogoOffsetX(0)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="ox" />
            <SliderRow icon={<ArrowUpDown className="w-3.5 h-3.5" />} label="Y" value={p.logoOffsetY} min={p.logoBounds.minY} max={p.logoBounds.maxY} boundsMin={p.logoBounds.minY} boundsMax={p.logoBounds.maxY} onChange={p.setLogoOffsetY} onDoubleClick={() => p.setLogoOffsetY(0)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="oy" />
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-400 text-center mt-3">{p.selectedLogo ? p.t("ui.logoSelected") : p.previewPoster?.iso_639_1 === null ? `${p.t("ui.clean")} ${p.t("ui.selected").toLowerCase()}` : p.previewPoster ? p.t("ui.logoHint") : p.t("ui.noPosterSelected")}</p>
    </div>
  )

  const cleanPoster = p.previewPoster?.iso_639_1 === null

  const logoCol = (
    <div className="w-full md:w-72 xl:w-80 2xl:w-96 shrink-0 self-start md:sticky md:top-4 animate-fade-scale-in md:order-3 space-y-4" style={{ animationDelay: "120ms", animationFillMode: "backwards" }}>
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1 text-center">{p.t("ui.logoSection")}</h3>
        <LogoOptions logos={p.logos} selectedLogo={p.selectedLogo} lang={p.lang} selectLogo={p.selectLogo} removeLogo={p.removeLogo} disabled={!cleanPoster} />
        {!cleanPoster && <p className="text-xs text-zinc-500 text-center mt-2 px-1">{p.t("ui.logoHint")}</p>}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1 text-center">{p.t("ui.badgeSection")}</h3>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-zinc-400">{p.t("ui.trendBadge")}</span>
            <Toggle value={p.rankingBadges} onChange={(v) => p.setRankingBadges(v)} />
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/60">
            <label className="text-xs text-zinc-400 font-medium block mb-2 px-1">{p.t("ui.styleRankingExtra")}</label>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 px-1">
                {(["default","bar","colored"] as const).map(s => (
                  <button key={s} onClick={() => p.setRankingBadgeStyle(s)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 ${p.rankingBadgeStyle === s ? "bg-white/15 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}>{s === "default" ? <><Circle className="w-3 h-3" /> {p.t("ui.bsDefault")}</> : s === "bar" ? <><BarChart3 className="w-3 h-3" /> {p.t("ui.bar")}</> : <><Circle className="w-3 h-3" style={{color: p.accentColor !== "#555555" ? p.accentColor : undefined}} /> {p.t("ui.colored")}</>}</button>
                ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-zinc-400">{p.t("ui.genreRatingBadge")}</span>
            <Toggle value={p.globalBadges} onChange={(v) => p.setGlobalBadges(v)} />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-zinc-500">{p.t("ui.customBadge")}</span>
            {p.editingValue === "customBadge" ? (
              <input autoFocus value={p.editText} onChange={(e) => p.setEditText(e.target.value)} onFocus={(e) => e.target.select()} onBlur={() => { const v = p.editText.trim(); p.setCustomBadge(v || null); p.setEditingValue(null) }} onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur() } }} className="w-28 text-right text-xs bg-black/40 border border-zinc-700 rounded px-1.5 py-1 outline-none focus:border-accent" placeholder={p.t("ui.customBadgePlaceholder")} />
            ) : (
              <select value={p.customBadge ?? "__auto__"} onChange={(e) => {
                const v = e.target.value
                if (v === "__custom__") { p.setEditText(""); p.setEditingValue("customBadge") }
                else if (v === "__auto__") p.setCustomBadge(null)
                else p.setCustomBadge(v)
              }} className="w-28 text-right text-xs bg-black/40 border border-zinc-700 rounded px-1.5 py-1 outline-none focus:border-accent cursor-pointer">
                <option value="__auto__">{p.t("ui.auto")}</option>
                {(() => {
                  const s = p.selected
                  if (!s) return null
                  const twoWeeks = 14 * 24 * 60 * 60 * 1000
                  const isNewMovie = s.media_type === "movie" && p.metaInfo.release_date ? (now - new Date(p.metaInfo.release_date).getTime()) < twoWeeks : false
                  const isNewSeries = s.media_type === "tv" && p.metaInfo.first_air_date ? (now - new Date(p.metaInfo.first_air_date).getTime()) < twoWeeks : false
                  const award = p.metaInfo.awards?.length ? getAwardBadgeLabel(p.metaInfo.awards, p.t) : null
                  const nomination = !award && p.metaInfo.nominations?.length ? getNominationBadgeLabel(p.metaInfo.nominations, p.t) : null
                  const animeRankData = p.mdblistAnimeList?.find((a: any) => a.id === s.id)
                  const animeRank = animeRankData ? animeRankData.rank : null
                  const studio = p.metaInfo.studios?.length ? p.metaInfo.studios[0] : null
                  const tvType = s.media_type === "tv" ? p.metaInfo.type : null
                  const tvStatus = s.media_type === "tv" ? p.metaInfo.status : null
                  const extra = computeExtraFallback({ mediaType: s.media_type === "tv" ? "tv" : "movie", voteAverage: p.metaInfo.voteAverage, tvType, tvStatus }, p.t)
                  const options = getAllBadgeOptions({
                    isNewMovie, isNewSeries, animeRank, trendRank: p.trendRank,
                    award, franchise: p.metaInfo.franchise || null, nomination, studio,
                    director: p.metaInfo.director || null, extra,
                    mediaType: s.media_type === "tv" ? "tv" : "movie",
                    voteAverage: p.metaInfo.voteAverage, tvType, tvStatus,
                  })
                  return options.map((o) => {
                    const display = isPrefixedKey(o) ? p.t(badgeKey(o)) : o
                    return <option key={o} value={o}>{display}</option>
                  })
                })()}
                <option value="__custom__">{p.t("ui.customOption")}</option>
              </select>
            )}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-800/60">
          <label className="text-xs text-zinc-400 font-medium block mb-2 px-1">{p.t("ui.styleGenreBadge")}</label>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 px-1">
            {(["shadow","pill","bar","colored"] as const).map(s => (
              <button key={s} title={s === "shadow" ? p.t("ui.shadow") : s === "pill" ? p.t("ui.pill") : s === "bar" ? p.t("ui.bar") : p.t("ui.colored")} onClick={() => p.setBadgeStyle(s)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 ${p.badgeStyle === s ? "bg-white/15 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}>{s === "shadow" ? <><Moon className="w-3 h-3" /> {p.t("ui.shadow")}</> : s === "pill" ? <><Pill className="w-3 h-3" /> {p.t("ui.pill")}</> : s === "bar" ? <><BarChart3 className="w-3 h-3" /> {p.t("ui.bar")}</> : <><Circle className="w-3 h-3" style={{color: p.accentColor !== "#555555" ? p.accentColor : undefined}} /> {p.t("ui.colored")}</>}</button>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-800/60">
          <button onClick={() => p.setBlurEnabled(!p.blurEnabled)} className={`w-full mb-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 ${p.blurEnabled ? "bg-white/10 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}><span className="flex items-center gap-1.5 justify-center">{p.blurEnabled ? <><Check className="w-3 h-3" /> {p.t("ui.blurEnabled")}</> : <><XCircle className="w-3 h-3" /> {p.t("ui.blurDisabled")}</>}</span></button>
          {p.blurEnabled && <div className="space-y-1 px-1"><SliderRow icon={<Ruler className="w-3.5 h-3.5" />} label={p.t("ui.height")} value={p.gradientHeight} min={5} max={100} boundsMin={5} boundsMax={100} onChange={(v) => p.setGradientHeight(v)} onDoubleClick={() => p.setGradientHeight(30)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="gradHeight" suffix="%" />
          <SliderRow icon={<Cloud className="w-3.5 h-3.5" />} label={p.t("ui.intensity")} value={p.blurIntensity} min={1} max={50} boundsMin={1} boundsMax={50} onChange={(v) => p.setBlurIntensity(v)} onDoubleClick={() => p.setBlurIntensity(5)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="blurIntensity" suffix="px" />
          <SliderRow icon={<Minus className="w-3.5 h-3.5" />} label={p.t("ui.fade")} value={p.blurFade} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => p.setBlurFade(v)} onDoubleClick={() => p.setBlurFade(60)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="blurFade" suffix="%" />
          <SliderRow icon={<Circle className="w-3.5 h-3.5" />} label={p.t("ui.darkness")} value={p.blurDarkness} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => p.setBlurDarkness(v)} onDoubleClick={() => p.setBlurDarkness(40)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="blurDarkness" suffix="%" /></div>}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {p.selected && (
        <div className="flex flex-col items-center">
          {searchBar}
          <div className="flex flex-col md:flex-row gap-6 md:gap-4 xl:gap-6 justify-center items-start w-full xl:px-6 2xl:px-16">
            {previewCol}
            {posterCol}
            {logoCol}
          </div>
        </div>
      )}
      {!p.selected && (
        <div>
          {searchBar}
        </div>
      )}
      {!p.selected && !p.tmdbKey && (
        <div className="flex flex-col items-center justify-center pb-16 text-zinc-400">
          <p className="text-sm">{p.t("ui.noKey")}</p>
        </div>
      )}
      {!p.selected && p.tmdbKey && (
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <h2 className="text-xl font-bold">{p.t("ui.trendingNow")}</h2>
          </div>
          {p.trending.length > 0 && (
            <div className="space-y-6">
              {(["movie", "tv"] as const).map((mediaType) => {
                const items = p.trending.filter((r) => r.media_type === mediaType).slice(0, 20)
                return <RankRow key={mediaType} label={mediaType === "movie" ? p.t("ui.movies") : p.t("ui.series")} items={items} onItemClick={(item) => p.navigateToPoster(item as any)} />
              })}
            </div>
          )}

          {p.STREAMING_PLATFORMS.map((sp) => {
            const chart = p.streamingCharts[sp.slug]
            if (!chart || (chart.movies.length === 0 && chart.tv.length === 0)) return null
            return (
              <div key={sp.slug} className="mt-10">
                <h2 className="text-xl font-bold mb-4 text-center">{sp.icon} {p.t("ui.top10", { name: sp.name })}</h2>
                <div className="space-y-6">
                  {([["movie", chart.movies], ["tv", chart.tv]] as const).map(([mediaType, items]) => {
                    if (items.length === 0) return null
                    return <RankRow key={mediaType} label={mediaType === "movie" ? p.t("ui.movies") : p.t("ui.series")} items={items.map((i) => ({ ...i, poster_path: i.posterPath, name: i.title }))} onItemClick={(item) => { if (item.tmdbId) p.navigateToPoster({ id: item.tmdbId, media_type: mediaType, title: item.title ?? "", name: item.title ?? "", poster_path: item.posterPath } as any) }} />
                  })}
                </div>
              </div>
            )
          })}

          {p.mdblistAnimeList.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4 text-center">{p.t("ui.trendingAnime")}</h2>
              <RankRow label={p.t("ui.anime")} items={p.mdblistAnimeList} onItemClick={(item: any) => p.navigateToPoster({ id: item.id ?? 0, media_type: item.media_type || 'tv', title: item.title ?? '', name: item.title ?? '', poster_path: item.poster_path ?? '' })} />
            </div>
          )}

          {p.trending.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <p className="text-sm">{p.t("ui.loading")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
