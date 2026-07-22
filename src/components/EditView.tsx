"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useP } from "@/lib/context"
import { LANG_NAMES, groupBy } from "@/lib/utils"
import { PosterOptions } from "@/components/PosterOptions"
import { LogoOptions } from "@/components/LogoOptions"
import { EditorPanel } from "@/components/EditorPanel"
import { Toggle } from "@/components/Toggle"
import { SliderRow } from "@/components/SliderRow"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "@/lib/awards"
import { computeExtraFallback, getAllBadgeOptions } from "@/lib/badge-priority"
import { getSubGenreLabel } from "@/lib/subgenres"
import { getUpcomingReleaseLabel } from "@/lib/release-badge"
import { isPrefixedKey, badgeKey } from "@/lib/i18n"
import { buildPreviewUrl } from "@/lib/poster-url"
import { SearchBar } from "@/components/SearchBar"
import { PosterCarousel } from "@/components/PosterCarousel"
import { BadgeStyleSelector } from "@/components/ui"
import { useToast } from "@/components/Toast"
import { ScrollReveal } from "@/components/ScrollReveal"
import { RefreshCw, Search, ImageOff, Ruler, Cloud, Minus, Circle, Check, XCircle, ArrowLeftRight, ArrowUpDown, Clock, X } from "lucide-react"

export default function EditView() {
  const p = useP()
  const [searchFocused, setSearchFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [imageError, setImageError] = useState(false)
  const [now] = useState(() => Date.now())
  const [previewLoading, setPreviewLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [activeRightTab, setActiveRightTab] = useState<"logo" | "badge" | "transform">("logo")
  const [activePosterTab, setActivePosterTab] = useState("clean")
  const [imgSrc, setImgSrc] = useState("")
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const prevObjUrlRef = useRef("")
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

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
    setLoadProgress(0)
    if (!p.previewUrl) { setImgSrc(""); setPreviewLoading(false); return }
    setPreviewLoading(true)
    setImgSrc("")
    const url = p.previewUrl
    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open("GET", url, true)
    xhr.responseType = "blob"
    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        setLoadProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = xhr.response
        const objUrl = URL.createObjectURL(blob)
        if (prevObjUrlRef.current) URL.revokeObjectURL(prevObjUrlRef.current)
        prevObjUrlRef.current = objUrl
        setImgSrc(objUrl)
        setLoadProgress(100)
        setTimeout(() => setPreviewLoading(false), 200)
      } else {
        setImageError(true)
        setPreviewLoading(false)
      }
    }
    xhr.onerror = () => { setImageError(true); setPreviewLoading(false); toastRef.current.error("Failed to load poster preview") }
    xhr.send()
    return () => {
      xhr.abort()
      xhrRef.current = null
    }
  }, [p.previewUrl])

  const searchBar = (
    <div className={p.selected ? "w-full max-w-lg mb-5 relative z-[100] isolate" : "max-w-lg mx-auto relative z-[100] isolate mb-8"}>
      <SearchBar tmdbKey={p.tmdbKey} value={p.query} onChange={p.setQuery} onSearch={(q) => { p.setQuery(q); window.history.pushState({ view: "search" }, ""); p.setView("search"); p.doSearch(q) }} large onFocus={() => setSearchFocused(true)} onBlur={() => { blurTimerRef.current = setTimeout(() => setSearchFocused(false), 200) }} />
      {searchFocused && p.recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 animate-fade-scale-in">
          <p className="text-xs text-zinc-400 font-semibold px-2 py-1.5">{p.t("ui.recentSearches")}</p>
          {p.recentSearches.map((s) => (
            <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => { p.setQuery(s); p.setView("search"); p.doSearch(s); window.history.pushState({ view: "search" }, ""); setSearchFocused(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent-orange/10 text-sm text-zinc-300 hover:text-accent transition-all duration-150 text-left">
              <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="flex-1 truncate">{s}</span>
              <span onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); p.removeRecentSearch(s) }} aria-label={p.t("ui.remove")} className="text-red-400 hover:text-red-300 transition-all duration-150 text-sm px-2 shrink-0"><X className="w-3.5 h-3.5" /></span>
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
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { p.setSettingsOpen(false); p.setShowLangPicker(false) }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); p.saveConfig() }
    }
    addEventListener("keydown", fn)
    return () => removeEventListener("keydown", fn)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- p is stable; only specific methods used
  }, [p.setSettingsOpen, p.setShowLangPicker, p.saveConfig])

  const cleanPoster = p.previewPoster?.iso_639_1 === null

  const leftTabs = useMemo(() => {
    const tabs: { key: string; label: string; count: number }[] = []
    const cleanCount = p.posters.filter((img) => img.iso_639_1 === null).length
    if (cleanCount > 0) tabs.push({ key: "clean", label: "Clean", count: cleanCount })
    const langGrouped = groupBy(p.posters.filter((img) => img.iso_639_1 !== null), (img) => img.iso_639_1 || "other")
    Object.entries(langGrouped)
      .filter(([, imgs]) => imgs.length > 0)
      .sort(([a], [b]) => { if (a === p.lang) return -1; if (b === p.lang) return 1; if (a === "en") return -1; if (b === "en") return 1; return a.localeCompare(b) })
      .forEach(([lang, imgs]) => tabs.push({ key: lang, label: LANG_NAMES[lang] || lang, count: imgs.length }))
    return tabs
  }, [p.lang, p.posters])

  useEffect(() => {
    if (leftTabs.length === 0) return
    if (!leftTabs.some((tab) => tab.key === activePosterTab)) {
      setActivePosterTab(leftTabs[0]?.key ?? "clean")
    }
  }, [activePosterTab, leftTabs])

  const rightTabs = [
    { key: "logo", label: p.t("ui.logoSection") },
    ...(cleanPoster ? [{ key: "badge", label: p.t("ui.badgeSection") }] : []),
    ...(cleanPoster && p.selectedLogo ? [{ key: "transform", label: p.t("ui.transform") }] : []),
  ]

  return (
    <div>
      {p.selected && (
        <div className="flex flex-col items-center">
          {searchBar}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_minmax(400px,480px)_minmax(300px,1fr)] gap-5 items-stretch w-full max-w-[1360px] mx-auto lg:h-[clamp(660px,calc(100dvh-260px),830px)] lg:min-h-0">

            {/* LEFT: Poster */}
            <div className="animate-fade-scale-in-panel-left" style={{animationDelay: "80ms"}}>
            <EditorPanel aria-label={`${p.selected?.title || ""} — Poster selection`} tabs={leftTabs} activeTab={activePosterTab} onTabChange={setActivePosterTab}>
              {p.loadingImages ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded-lg skeleton-shimmer" />)}</div>
              ) : (
                <PosterOptions posters={p.posters} posterActivePath={p.posterActivePath} lang={p.lang} selectPoster={p.selectPoster} activeGroup={activePosterTab} onActiveGroupChange={setActivePosterTab} showTabs={false} />
              )}
            </EditorPanel>
            </div>

            {/* CENTER: Preview */}
            <div className="animate-fade-scale-in" style={{animationDelay: "0ms"}}>
            <EditorPanel title={p.t("ui.previewSection")}>
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-[360px]">
                  <div
                    className="absolute -inset-6 rounded-3xl opacity-40 blur-3xl pointer-events-none transition-all duration-700 ease-out"
                    style={{
                      background: p.accentColor && p.accentColor !== "#555555"
                        ? `radial-gradient(circle at 50% 50%, ${p.accentColor}, transparent 70%)`
                        : "radial-gradient(circle at 50% 50%, rgba(255, 100, 48, 0.40), transparent 70%)",
                    }}
                  />
                  <div role="img" aria-label={`Preview of ${p.selected?.title || p.selected?.name || ""} poster with ${p.selectedLogo ? "logo" : "no logo"}`} className={`preview-frame w-full rounded-[1.35rem] overflow-hidden relative ${p.previewPoster ? "preview-frame-active" : ""}`}>
                  <div className="relative aspect-[2/3] select-none pointer-events-none bg-zinc-950/70 overflow-hidden rounded-[1.2rem]">
                    {p.previewUrl ? (
                      <>
                        <div className="loading-bar-overlay" style={{ opacity: previewLoading ? 1 : 0, pointerEvents: "none" }} />
                        <div className="loading-bar-container" style={{ opacity: previewLoading ? 1 : 0, transition: "opacity 0.3s ease" }}>
                          <div className="loading-bar-track" style={{ transform: `scaleX(${loadProgress / 100})`, transformOrigin: "left" }} />
                          <span className="loading-bar-text">{loadProgress}%</span>
                        </div>
                        {imgSrc && (
                          /* eslint-disable-next-line @next/next/no-img-element -- server-rendered poster */
                          <img
                            src={imgSrc}
                            alt={p.selected?.title || p.selected?.name || ""}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                      </>
                    ) : p.selected ? (
                      <div className="absolute inset-0 bg-zinc-800/50 animate-pulse rounded-2xl" />
                    ) : null}
                    {imageError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 text-center p-8 z-20">
                        <ImageOff className="w-12 h-12 mb-3 text-zinc-500" />
                        <p className="text-sm text-zinc-400 font-medium">{p.t("ui.imageNotAvailable")}</p>
                        <p className="text-xs text-zinc-500 mt-1">{p.t("ui.posterLoadError")}</p>
                        <button aria-label={p.t("ui.retry")} onClick={() => setImageError(false)} className="mt-3 px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-all duration-150"><span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />{p.t("ui.retry")}</span></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

                {p.selected && (
                  <div className="mt-4 w-full text-center select-text">
                    <h2 className="text-lg font-bold text-zinc-50 [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_2px_8px_rgba(0,0,0,0.7)]">{p.titleOf(p.selected)}</h2>
                    <p className="text-xs text-zinc-300 mt-0.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">{p.yearOf(p.selected)} {p.selected.media_type === "movie" ? p.t("ui.movie") : p.t("ui.tvSeries")}</p>
                    <p className="text-xs text-zinc-500 mt-1 preview-meta-info">TMDB: <a href={`https://www.themoviedb.org/${p.selected.media_type}/${p.selected.id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-white underline underline-offset-2">{p.selected.id}</a>{p.selected.imdb_id ? <> • IMDB: <a href={`https://www.imdb.com/title/${p.selected.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-white underline underline-offset-2">{p.selected.imdb_id}</a></> : ""}</p>
                  </div>
                )}

                {p.previewPoster && p.selected && (
                  <div className="mt-4 w-full max-w-[360px] grid grid-cols-3 gap-2">
                    <button aria-label={p.t("ui.savePoster")} onClick={p.saveConfig} className="py-2 px-3 text-[11px] font-bold btn-primary active:scale-[0.97] rounded-xl">{p.t("ui.savePoster")}</button>
                    <button aria-label={p.t("ui.testUrl")} onClick={() => {
                      if (!p.selected || !p.previewPoster) return
                      const url = buildPreviewUrl(p, {
                        globalBadges: p.globalBadges,
                        rankingBadges: p.rankingBadges,
                        badgeStyle: p.badgeStyle,
                        rankingBadgeStyle: p.rankingBadgeStyle,
                        customBadge: p.customBadge,
                        gradientHeight: p.gradientHeight,
                        blurIntensity: p.blurIntensity,
                        blurFade: p.blurFade,
                        blurDarkness: p.blurDarkness,
                        blurEnabled: p.blurEnabled,
                      })
                      if (!url) return
                      window.open(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, "_blank")
                    }} className="py-2 px-3 rounded-xl text-[11px] font-semibold bg-white/[0.06] border border-white/10 text-zinc-300 hover:bg-white/[0.10] hover:border-white/20 hover:text-white active:scale-[0.97] transition-all duration-200">{p.t("ui.testUrl")}</button>
                    {(() => {
                      const selected = p.selected
                      if (!selected) return null
                      const key = `${selected.media_type}:${selected.id}`
                      const hasMapping = p.mappingsMap.get(key)
                      if (!hasMapping) return null
                      return (
                        <button aria-label={p.t("ui.remove")} onClick={() => { p.removeMapping(hasMapping); p.setSelected(null); p.setPreviewPoster(null); p.setSelectedLogo(null); p.setPreviewId(null) }} className="py-2 px-3 rounded-xl text-[11px] font-semibold bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/50 hover:border-red-500 active:scale-[0.97] transition-all duration-200">{p.t("ui.remove")}</button>
                      )
                    })()}
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 text-center mt-3">{p.selectedLogo ? p.t("ui.logoSelected") : p.previewPoster?.iso_639_1 === null ? `${p.t("ui.clean")} ${p.t("ui.selected").toLowerCase()}` : p.previewPoster ? p.t("ui.logoHint") : p.t("ui.noPosterSelected")}</p>
              </div>
            </EditorPanel>
            </div>

            {/* RIGHT: Edit */}
            <div className="animate-fade-scale-in-panel-right" style={{animationDelay: "80ms"}}>
            <EditorPanel tabs={rightTabs} activeTab={activeRightTab} onTabChange={(k) => setActiveRightTab(k as typeof activeRightTab)}>
              <div key={activeRightTab} className="animate-fade-in space-y-3">
              {activeRightTab === "logo" && <>
                <LogoOptions logos={p.logos} selectedLogo={p.selectedLogo} lang={p.lang} selectLogo={p.selectLogo} removeLogo={p.removeLogo} disabled={!cleanPoster} />
                {!cleanPoster && <p className="text-xs text-zinc-500 text-center mt-2 px-1">{p.t("ui.logoHint")}</p>}
              </>}
              {activeRightTab === "badge" && <>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-zinc-400">{p.t("ui.trendBadge")}</span>
                    <Toggle value={p.rankingBadges} onChange={(v) => p.setRankingBadges(v)} />
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-800/60">
                    <label className="text-xs text-zinc-400 font-medium block mb-2 px-1">{p.t("ui.styleRankingExtra")}</label>
                    <div className="px-1">
                      <BadgeStyleSelector value={p.rankingBadgeStyle} options={["default","colored","pill"]} onChange={p.setRankingBadgeStyle} t={p.t} accentColor={p.accentColor} />
                    </div>
                    {p.accentColor === "#555555" && (
                      <div className="text-[10px] text-zinc-500 text-center mt-1.5 px-1">{p.t("ui.noDominantColor") || "No dominant color — using fallback"}</div>
                    )}
                    {p.accentColor !== "#555555" && (
                      <div className="text-[10px] text-zinc-500 text-center mt-1.5 px-1">Accent color condiviso con badge genere</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-zinc-400">{p.t("ui.genreRatingBadge")}</span>
                    <Toggle value={p.globalBadges} onChange={(v) => p.setGlobalBadges(v)} />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-zinc-400">Logo Network</span>
                    <Toggle value={p.networkLogo} onChange={(v) => p.setNetworkLogo(v)} />
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
                          const animeRankData = p.mdblistAnimeList?.find((a) => a.id === s.id)
                          const animeRank = animeRankData ? animeRankData.rank : null
                          const studio = p.metaInfo.studios?.length ? p.metaInfo.studios[0] : null
                          const tvType = s.media_type === "tv" ? p.metaInfo.type : null
                          const tvStatus = s.media_type === "tv" ? p.metaInfo.status : null
                          const extra = computeExtraFallback({ mediaType: s.media_type === "tv" ? "tv" : "movie", voteAverage: p.metaInfo.voteAverage, tvType, tvStatus }, p.t)
                          const upcomingRelease = getUpcomingReleaseLabel({
                            mediaType: s.media_type === "tv" ? "tv" : "movie",
                            releaseDate: p.metaInfo.release_date,
                            firstAirDate: p.metaInfo.first_air_date,
                            locale: p.lang,
                          })
                          const subGenre = getSubGenreLabel(p.metaInfo.keywords || [], p.lang)
                          const options = getAllBadgeOptions({
                            upcomingRelease, isNewMovie, isNewSeries, animeRank, trendRank: p.trendRank,
                            award, franchise: p.metaInfo.franchise || null, nomination, studio,
                            director: p.metaInfo.director || null, subGenre, extra,
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
                  <div className="px-1">
                    <BadgeStyleSelector value={p.badgeStyle} options={["shadow","pill","bar","colored","bordo","vetro"]} onChange={p.setBadgeStyle} t={p.t} accentColor={p.accentColor} />
                  </div>
                  <div className="flex items-center gap-2 justify-center mt-2 px-1">
                    <input
                      type="color"
                      value={p.accentColor === "#555555" ? "#000000" : p.accentColor}
                      onChange={(e) => p.setAccentColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded"
                    />
                    <input
                      type="text"
                      value={p.accentColor}
                      onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{6}$/.test(v)) p.setAccentColor(v) }}
                      onBlur={(e) => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) e.target.value = p.accentColor }}
                      className="w-20 text-center text-[11px] bg-black/40 border border-zinc-700 rounded px-1.5 py-1 outline-none focus:border-accent font-mono text-zinc-300"
                      placeholder="#555555"
                    />
                    {p.accentColor !== "#555555" && (
                      <button
                        onClick={() => p.setAccentColor("#555555")}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-1"
                        title="Reset to auto-detect"
                      >↺</button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-800/60">
                  <button aria-label={p.blurEnabled ? p.t("ui.blurDisabled") : p.t("ui.blurEnabled")} onClick={() => p.setBlurEnabled(!p.blurEnabled)} className={`w-full mb-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 ${p.blurEnabled ? "bg-white/10 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}><span className="flex items-center gap-1.5 justify-center">{p.blurEnabled ? <><Check className="w-3 h-3" /> {p.t("ui.blurEnabled")}</> : <><XCircle className="w-3 h-3" /> {p.t("ui.blurDisabled")}</>}</span></button>
                  {p.blurEnabled && <div className="space-y-1 px-1"><SliderRow icon={<Ruler className="w-3.5 h-3.5" />} label={p.t("ui.height")} value={p.gradientHeight} min={5} max={100} boundsMin={5} boundsMax={100} onChange={(v) => p.setGradientHeight(v)} onDoubleClick={() => p.setGradientHeight(30)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="gradHeight" suffix="%" />
                    <SliderRow icon={<Cloud className="w-3.5 h-3.5" />} label={p.t("ui.intensity")} value={p.blurIntensity} min={1} max={50} boundsMin={1} boundsMax={50} onChange={(v) => p.setBlurIntensity(v)} onDoubleClick={() => p.setBlurIntensity(5)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="blurIntensity" suffix="px" />
                    <SliderRow icon={<Minus className="w-3.5 h-3.5" />} label={p.t("ui.fade")} value={p.blurFade} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => p.setBlurFade(v)} onDoubleClick={() => p.setBlurFade(60)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="blurFade" suffix="%" />
                    <SliderRow icon={<Circle className="w-3.5 h-3.5" />} label={p.t("ui.darkness")} value={p.blurDarkness} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => p.setBlurDarkness(v)} onDoubleClick={() => p.setBlurDarkness(40)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="blurDarkness" suffix="%" /></div>}
                </div>
              </>}
              {activeRightTab === "transform" && <>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h4 className="text-xs font-semibold text-zinc-300">{p.t("ui.transform")}</h4>
                  <button aria-label={p.t("ui.reset")} onClick={() => { defaultLogoScale(); p.setLogoOffsetX(0); p.setLogoOffsetY(0) }} className="text-xs text-zinc-400 hover:text-accent transition-colors px-2 py-0.5 rounded-md border border-zinc-700/50 hover:border-accent/30">{p.t("ui.reset")}</button>
                </div>
                <div className="space-y-2">
                  <SliderRow icon={<Search className="w-3.5 h-3.5" />} label={p.t("ui.scale")} value={p.logoScale} min={10} max={100} boundsMin={10} boundsMax={100} onChange={p.setLogoScale} onDoubleClick={defaultLogoScale} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="scale" />
                  <SliderRow icon={<ArrowLeftRight className="w-3.5 h-3.5" />} label="X" value={p.logoOffsetX} min={p.logoBounds.minX} max={p.logoBounds.maxX} boundsMin={p.logoBounds.minX} boundsMax={p.logoBounds.maxX} onChange={p.setLogoOffsetX} onDoubleClick={() => p.setLogoOffsetX(0)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="ox" />
                  <SliderRow icon={<ArrowUpDown className="w-3.5 h-3.5" />} label="Y" value={p.logoOffsetY} min={p.logoBounds.minY} max={p.logoBounds.maxY} boundsMin={p.logoBounds.minY} boundsMax={p.logoBounds.maxY} onChange={p.setLogoOffsetY} onDoubleClick={() => p.setLogoOffsetY(0)} editingValue={p.editingValue} editText={p.editText} setEditingValue={p.setEditingValue} setEditText={p.setEditText} editingKey="oy" />
                </div>
              </>}
              </div>
            </EditorPanel>
            </div>

          </div>
        </div>
      )}
      {!p.selected && (
        <div>
          {searchBar}
        </div>
      )}
      {!p.selected && !p.tmdbKey && (
        <div className="max-w-md mx-auto mt-16 mb-16">
          <div className="glass-panel p-8 flex flex-col items-center text-center animate-fade-scale-in-hero">
            <div className="w-14 h-14 rounded-2xl bg-accent-orange/15 border border-accent-orange/20 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <polygon points="9.5 8 15.5 12 9.5 16 9.5 8" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mb-2">Benvenuto in Posterium</h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{p.t("ui.noKey")}</p>
            <button onClick={() => p.setSettingsOpen(true)} className="btn-primary px-5 py-2.5 text-sm">
              Apri Impostazioni
            </button>
            <div className="grid grid-cols-3 gap-3 mt-8 w-full">
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <svg className="w-4 h-4 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span className="text-[10px] text-zinc-500 font-medium">Personalizza</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <svg className="w-4 h-4 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polygon points="9.5 8 15.5 12 9.5 16 9.5 8" fill="currentColor" stroke="none"/></svg>
                <span className="text-[10px] text-zinc-500 font-medium">Preview</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <svg className="w-4 h-4 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span className="text-[10px] text-zinc-500 font-medium">Salva</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {!p.selected && p.tmdbKey && (
        <>
          <section className="hero-section max-w-5xl mx-auto px-8 py-6 mb-10 animate-fade-scale-in-hero">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-accent-orange/15 border border-accent-orange/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <polygon points="9.5 8 15.5 12 9.5 16 9.5 8" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-bold text-zinc-50 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{p.t("ui.heroTitle")}</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">{p.t("ui.heroSubtitle")}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { window.history.pushState({ view: "search" }, ""); p.setView("search") }} className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent-orange/20 border border-accent-orange/40 text-accent-orange hover:bg-accent-orange/30 hover:border-accent-orange/50 active:scale-95 transition-all duration-150 whitespace-nowrap">
                  {p.t("ui.searchCta")}
                </button>
                <button onClick={() => { window.history.pushState({ view: "cataloghi" }, ""); p.setView("cataloghi") }} className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 border border-white/10 text-zinc-300 hover:bg-white/15 hover:border-white/20 hover:text-white active:scale-95 transition-all duration-150 whitespace-nowrap">
                  {p.t("ui.heroCatalogsCta")}
                </button>
              </div>
            </div>
          </section>
          <ScrollReveal animation="fade-up" threshold={0.05}>
            <PosterCarousel />
          </ScrollReveal>
          {p.trending.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-accent-orange animate-spin mb-4" />
              <p className="text-sm text-zinc-400">{p.t("ui.loading")}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
