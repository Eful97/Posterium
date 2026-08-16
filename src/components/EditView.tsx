"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { posterUrl } from "@/lib/utils"
import { PosterOptions } from "@/components/PosterOptions"
import { LogoOptions } from "@/components/LogoOptions"
import { EditorPanel } from "@/components/EditorPanel"
import { buildPreviewUrl } from "@/lib/poster-url"
import { SearchBar } from "@/components/SearchBar"
import { PosterCarousel } from "@/components/PosterCarousel"
import { ScrollReveal } from "@/components/ScrollReveal"
import { HomeHero } from "@/components/HomeHero"
import { PosterPreview } from "@/components/PosterPreview"
import { PosterDepthEdge, PosterDepthSheen } from "@/components/PosterDepthGlow"
import { BadgeControls } from "@/components/BadgeControls"
import { TransformControls } from "@/components/TransformControls"
import { usePosterPreview } from "@/lib/usePosterPreview"
import { Clock, X, Check, Copy, Download, Settings } from "lucide-react"

interface EditViewProps {
  /** Apre il popup impostazioni rapide (gestito da AppShell) */
  onQuickSettings?: () => void
}

export default function EditView({ onQuickSettings }: EditViewProps) {
  const accentColor = usePSelector((v) => v.accentColor)
  const doSearch = usePSelector((v) => v.doSearch)
  const goHome = usePSelector((v) => v.goHome)
  const copyUrl = usePSelector((v) => v.copyUrl)
  const urlPattern = usePSelector((v) => v.urlPattern)
  const profileId = usePSelector((v) => v.profileId)
  const mappings = usePSelector((v) => v.mappings)
  const loadingImages = usePSelector((v) => v.loadingImages)
  const logos = usePSelector((v) => v.logos)
  const mappingsMap = usePSelector((v) => v.mappingsMap)
  const mdblistAnimeList = usePSelector((v) => v.mdblistAnimeList)
  const metaInfo = usePSelector((v) => v.metaInfo)
  const posterActivePath = usePSelector((v) => v.posterActivePath)
  const posters = usePSelector((v) => v.posters)
  const previewPoster = usePSelector((v) => v.previewPoster)
  const query = usePSelector((v) => v.query)
  const recentSearches = usePSelector((v) => v.recentSearches)
  const removeLogo = usePSelector((v) => v.removeLogo)
  const removeMapping = usePSelector((v) => v.removeMapping)
  const removeRecentSearch = usePSelector((v) => v.removeRecentSearch)
  const router = usePSelector((v) => v.router)
  const saveConfig = usePSelector((v) => v.saveConfig)
  const selected = usePSelector((v) => v.selected)
  const selectedLogo = usePSelector((v) => v.selectedLogo)
  const selectLogo = usePSelector((v) => v.selectLogo)
  const selectPoster = usePSelector((v) => v.selectPoster)
  const setPreviewId = usePSelector((v) => v.setPreviewId)
  const setPreviewPoster = usePSelector((v) => v.setPreviewPoster)
  const setQuery = usePSelector((v) => v.setQuery)
  const setSelected = usePSelector((v) => v.setSelected)
  const setSelectedLogo = usePSelector((v) => v.setSelectedLogo)
  const setSettingsOpen = usePSelector((v) => v.setSettingsOpen)
  const setShowLangPicker = usePSelector((v) => v.setShowLangPicker)
  const sourceView = usePSelector((v) => v.sourceView)
  const titleOf = usePSelector((v) => v.titleOf)
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const topEdgeColor = usePSelector((v) => v.topEdgeColor)
  const trendRank = usePSelector((v) => v.trendRank)
  const yearOf = usePSelector((v) => v.yearOf)
  const { t, lang } = useT()
  const ed = usePosterEditor()
  const [searchFocused, setSearchFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeRightTab, setActiveRightTab] = useState<"logo" | "badge" | "transform">("logo")
  const [activePosterTab, setActivePosterTab] = useState("clean")
  const [configLinkStatus, setConfigLinkStatus] = useState<"idle" | "copying" | "copied">("idle")
  const [testUrl, setTestUrl] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)

  const copyConfigLink = async () => {
    setConfigLinkStatus("copying")
    try {
      const config = {
        globalBadges: ed.globalBadges,
        rankingBadges: ed.rankingBadges,
        badgeGenre: ed.badgeGenre,
        badgeYear: ed.badgeYear,
        badgeRating: ed.badgeRating,
        badgeStyle: ed.badgeStyle,
        rankingBadgeStyle: ed.rankingBadgeStyle,
        blurEnabled: ed.blurEnabled,
        blurIntensity: ed.blurIntensity,
        blurFade: ed.blurFade,
        blurDarkness: ed.blurDarkness,
        gradientHeight: ed.gradientHeight,
        networkLogo: ed.networkLogo,
        autoRotateClean: ed.autoRotateClean,
        logoFitEnabled: ed.defaultLogoFitEnabled,
        customBadge: ed.customBadge || undefined,
        ribbonSide: ed.ribbonSide,
      }
      const res = await fetch("/api/config-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      const { token } = await res.json()
      const url = `${window.location.origin}/api/poster/{type}/{imdb_id}?config=${encodeURIComponent(token)}`
      await navigator.clipboard.writeText(url)
      setConfigLinkStatus("copied")
      setTimeout(() => setConfigLinkStatus("idle"), 2000)
    } catch (e) {
      console.error("[posterium] Copy config link failed:", e)
      import("sonner").then(({ toast }) =>
        toast.error(t("ui.configLinkError")),
      )
      setConfigLinkStatus("idle")
    }
  }

  const { imageError, setImageError, previewLoading, loadProgress, imgSrc, retry } = usePosterPreview()

  const searchBar = (
    <div className={selected ? "w-full max-w-lg relative z-[100] isolate" : "max-w-lg mx-auto relative z-[100] isolate mb-8"}>
      <SearchBar tmdbKey={tmdbKey} value={query} onChange={setQuery} onSearch={(q) => { setQuery(q); router.push("search"); doSearch(q) }} large onFocus={() => setSearchFocused(true)} onBlur={() => { blurTimerRef.current = setTimeout(() => setSearchFocused(false), 200) }} />
      {searchFocused && recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl p-2 shadow-2xl shadow-black/50 z-50 animate-fade-scale-in">
          <p className="text-xs text-muted font-semibold px-2 py-1.5">{t("ui.recentSearches")}</p>
          {recentSearches.map((s) => (
            <button type="button" key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(s); router.push("search"); doSearch(s); setSearchFocused(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent-orange/10 text-sm text-zinc-300 hover:text-accent transition-all duration-150 text-left">
              <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="flex-1 truncate">{s}</span>
              <span onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); removeRecentSearch(s) }} aria-label={t("ui.remove")} className="text-danger hover:text-red-300 transition-all duration-150 text-sm px-2 shrink-0"><X className="w-3.5 h-3.5" /></span>
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
      if (e.key === "Escape") { setSettingsOpen(false); setShowLangPicker(false) }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveConfig() }
    }
    addEventListener("keydown", fn)
    return () => removeEventListener("keydown", fn)
  }, [setSettingsOpen, setShowLangPicker, saveConfig])

  const cleanPoster = previewPoster?.iso_639_1 === null

  const rightTabs = [
    { key: "logo", label: t("ui.logoSection") },
    ...(cleanPoster ? [{ key: "badge", label: t("ui.badgeSection") }] : []),
    ...(cleanPoster && selectedLogo ? [{ key: "transform", label: t("ui.transform") }] : []),
  ]

  return (
    <div>
      {selected && (
        <div className="flex flex-col items-center w-full">
          {/* Header editor (da prototipo): logo + back + ricerca + stato + azioni */}
          <header className="w-full max-w-[1360px] mx-auto mb-4 flex items-center gap-3 flex-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo locale */}
            <img onClick={goHome} src="/posterium.png" alt="Posterium" decoding="async" className="header-logo h-10 md:h-12 w-auto cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150" />
            <button type="button"
              onClick={() => { router.back() }}
              aria-label={sourceView === "cataloghi" ? t("ui.backToCatalogs") : sourceView === "myposters" ? t("ui.backToMyPosters") : t("ui.back")}
              className="text-xs text-zinc-300 hover:text-white transition-all inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 active:scale-95 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{sourceView === "cataloghi" ? t("ui.backToCatalogs") : sourceView === "myposters" ? t("ui.backToMyPosters") : t("ui.back")}</span>
            </button>
            <div className="flex-1 min-w-[200px] max-w-lg">{searchBar}</div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" aria-hidden="true" />
                {t("ui.saveState")}
              </span>
              {/* Azioni rapide (da prototipo: copia, installa, i miei poster, impostazioni) */}
              <div className="hidden md:flex floating-group">
                <button type="button" suppressHydrationWarning aria-label={t("ui.copyUrl")} onClick={() => { copyUrl() }} disabled={!urlPattern} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 disabled:opacity-30 text-accent-orange hover:bg-white/[0.08] press-scale"><Copy className="w-4 h-4" /></button>
                <button type="button" suppressHydrationWarning aria-label={t("ui.installCatalog")} onClick={async () => { const base = `${window.location.origin}/manifest.json`; const url = profileId ? `${window.location.origin}/u/${profileId}/manifest.json` : base; await navigator.clipboard.writeText(url) }} disabled={!urlPattern && !profileId} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 disabled:opacity-30 text-zinc-300 hover:bg-white/[0.08] press-scale"><Download className="w-4 h-4" /></button>
                <button type="button" aria-label={t("ui.myPostersBtn")} onClick={() => { if (router) router.replace("myposters") }} className="h-9 min-w-9 px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] active:scale-[0.93] transition-all duration-150 press-scale">{mappings.length}</button>
                <div className="h-5 w-px bg-white/10 self-center" />
                <button type="button" aria-label={t("ui.settings")} onClick={() => { if (onQuickSettings) onQuickSettings(); else setSettingsOpen(true) }} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-zinc-300 hover:bg-white/[0.08] press-scale"><Settings className="w-4 h-4" /></button>
              </div>
            </div>
          </header>
          <div className="editor-workspace max-w-[1360px] mx-auto lg:h-[clamp(660px,calc(100dvh-260px),830px)] lg:min-h-0">

            {/* LEFT: Poster */}
            <EditorPanel className="animate-fade-scale-in-panel-left" aria-label={`${selected?.title || ""} — Poster selection`} title={t("ui.posterAvailable")} headerRight={<span className="text-[10px] font-mono text-muted px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/10 tabular-nums">{posters.length}</span>}>
              {loadingImages ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded-lg skeleton-shimmer" />)}</div>
              ) : (
                <PosterOptions posters={posters} posterActivePath={posterActivePath} lang={lang} selectPoster={selectPoster} activeGroup={activePosterTab} onActiveGroupChange={setActivePosterTab} showTabs />
              )}
            </EditorPanel>

            {/* CENTER: Preview */}
            <EditorPanel className="animate-fade-scale-in" title={<><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle shadow-[0_0_6px_rgba(52,211,153,0.7)]" aria-hidden="true" />{t("ui.previewLive")}</>} headerRight={<span className="text-[10px] font-mono text-muted px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/10">2:3 · JPEG</span>}>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-muted mb-1" aria-hidden="true">500 × 750</span>
                <div className="relative w-full max-w-[360px] my-2">
                <div className={`editor-stage relative isolate w-full ${previewPoster?.file_path ? "editor-stage-glow" : ""}`}>
                  {/* NuvioDesktop-style depth edge */}
                  <PosterDepthEdge edgeStrength={40} edgeCoverage={10} />
                  {/* Poster Image Ambient Depth Glow */}
                  {previewPoster?.file_path && (
                    <div
                      className="absolute -inset-6 rounded-3xl opacity-75 blur-2xl pointer-events-none transition-all duration-700 ease-out z-0"
                      style={{
                        backgroundImage: `url(${posterUrl(previewPoster.file_path, "w185")})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(32px) saturate(1.8)",
                      }}
                    />
                  )}
                  {/* Accent Glow */}
                  <div
                    className="absolute -inset-8 rounded-3xl opacity-45 blur-3xl pointer-events-none transition-all duration-700 ease-out z-0"
                    style={{
                      background: accentColor
                        ? `radial-gradient(circle at 50% 50%, ${accentColor}, transparent 70%)`
                        : "radial-gradient(circle at 50% 50%, rgba(232, 93, 42, 0.40), transparent 70%)",
                    }}
                  />
                  <div className="relative z-[1]">
                    <PosterPreview
                      previewLoading={previewLoading}
                      loadProgress={loadProgress}
                      imageError={imageError}
                      setImageError={setImageError}
                      imgSrc={imgSrc}
                      onRetry={retry}
                    />
                  </div>
                    <PosterDepthSheen sheenStrength={20} />
                  </div>
                </div>

                {selected && (
                  <div className="mt-4 w-full text-center select-text">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold tracking-tight text-zinc-50">{titleOf(selected)}</h2>
                      {cleanPoster && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-muted uppercase tracking-wide">{t("ui.clean")}</span>
                      )}
                      {(() => {
                        const key = `${selected.media_type}:${selected.id}`
                        if (!mappingsMap.get(key)) return null
                        return (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            {t("ui.savedShort")}
                          </span>
                        )
                      })()}
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5">{yearOf(selected)} {selected.media_type === "movie" ? t("ui.movie") : t("ui.tvSeries")}</p>
                    <p className="text-xs text-zinc-500 mt-1 preview-meta-info">TMDB: <a href={`https://www.themoviedb.org/${selected.media_type}/${selected.id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-white underline underline-offset-2">{selected.id}</a>{selected.imdb_id ? <> • IMDB: <a href={`https://www.imdb.com/title/${selected.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-white underline underline-offset-2">{selected.imdb_id}</a></> : ""}</p>
                  </div>
                )}

                {previewPoster && selected && (
                  <div className="mt-4 w-full max-w-[360px] grid grid-cols-3 gap-2">
                    <button type="button" aria-label={t("ui.savePoster")} onClick={saveConfig} className="btn-primary py-2 px-3 rounded-xl active:scale-[0.97]">{t("ui.savePoster")}</button>
                    <button type="button" aria-label={t("ui.testUrl")} onClick={() => {
                      if (!selected || !previewPoster) return
                      const url = buildPreviewUrl({
                        selected: selected,
                        previewPoster: previewPoster,
                        selectedLogo: selectedLogo,
                        selectedBackdrop: ed.selectedBackdrop,
                        logoScale: ed.logoScale,
                        logoOffsetX: ed.logoOffsetX,
                        logoOffsetY: ed.logoOffsetY,
                        backdropScale: ed.backdropScale,
                        backdropOffsetX: ed.backdropOffsetX,
                        backdropOffsetY: ed.backdropOffsetY,
                        metaInfo: metaInfo,
                        trendRank: trendRank,
                        mdblistAnimeList: mdblistAnimeList,
                        topEdgeColor: topEdgeColor,
                        accentColor: accentColor,
                        lang: lang,
                        tmdbKey: tmdbKey,
                      }, {
                        globalBadges: ed.globalBadges,
                        rankingBadges: ed.rankingBadges,
                        badgeStyle: ed.badgeStyle,
                        rankingBadgeStyle: ed.rankingBadgeStyle,
                        customBadge: ed.customBadge,
                        gradientHeight: ed.gradientHeight,
                        blurIntensity: ed.blurIntensity,
                        blurFade: ed.blurFade,
                        blurDarkness: ed.blurDarkness,
                        blurEnabled: ed.blurEnabled,
                        networkLogo: ed.networkLogo,
                        ribbonSide: ed.ribbonSide,
                      })
                      if (!url) return
                      setUrlCopied(false)
                      setTestUrl(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`)
                    }} className="btn-secondary py-2 px-3 rounded-xl text-[11px]">{t("ui.testUrl")}</button>
                    <button type="button" aria-label={t("ui.copyConfigLink")} onClick={copyConfigLink} disabled={configLinkStatus === "copying"} className="btn-secondary py-2 px-3 rounded-xl text-[11px] disabled:opacity-50">{configLinkStatus === "copied" ? t("ui.configLinkCopied") : configLinkStatus === "copying" ? "…" : t("ui.copyConfigLink")}</button>
                    {(() => {
                      if (!selected) return null
                      const key = `${selected.media_type}:${selected.id}`
                      const hasMapping = mappingsMap.get(key)
                      if (!hasMapping) return null
                      return (
                        <button type="button" aria-label={t("ui.remove")} onClick={() => { removeMapping(hasMapping).catch((e) => console.error("[posterium] Remove mapping failed:", e)); setSelected(null); setPreviewPoster(null); setSelectedLogo(null); setPreviewId(null) }} className="btn-danger py-2 px-3 rounded-xl text-[11px]">{t("ui.remove")}</button>
                      )
                    })()}
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 text-center mt-3">{selectedLogo ? t("ui.logoSelected") : previewPoster?.iso_639_1 === null ? `${t("ui.clean")} ${t("ui.selected").toLowerCase()}` : previewPoster ? t("ui.logoHint") : t("ui.noPosterSelected")}</p>
              </div>
            </EditorPanel>

            {/* RIGHT: Edit */}
            <EditorPanel className="animate-fade-scale-in-panel-right" title={t("ui.customize")} tabs={rightTabs} activeTab={activeRightTab} onTabChange={(k) => setActiveRightTab(k as typeof activeRightTab)}>
              <div key={activeRightTab} className="animate-fade-in space-y-3">
              {activeRightTab === "logo" && <>
                <LogoOptions logos={logos} selectedLogo={selectedLogo} lang={lang} selectLogo={selectLogo} removeLogo={removeLogo} disabled={!cleanPoster} />
                {!cleanPoster && <p className="text-xs text-zinc-500 text-center mt-2 px-1">{t("ui.logoHint")}</p>}
              </>}
              {activeRightTab === "badge" && <BadgeControls />}
              {activeRightTab === "transform" && <TransformControls />}
              </div>
            </EditorPanel>

          </div>
        </div>
      )}
      {!selected && (
        <div>
          {searchBar}
        </div>
      )}
      {!selected && !tmdbKey && (
        <div className="max-w-md mx-auto mt-16 mb-16">
          <div className="glass-panel relative overflow-hidden p-8 flex flex-col items-center text-center animate-fade-scale-in-hero">
            <div className="welcome-accent" />
            <span className="hero-kicker mb-4">{t("ui.welcomePanelKicker")}</span>
            <div className="w-14 h-14 rounded-2xl bg-accent-orange/15 border border-accent-orange/20 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <polygon points="9.5 8 15.5 12 9.5 16 9.5 8" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mb-2">{t("ui.welcomePanelTitle")}</h2>
            <p className="text-sm text-muted mb-6 leading-relaxed">{t("ui.noKey")}</p>
            <button type="button" onClick={() => setSettingsOpen(true)} className="btn-primary px-5 py-2.5 text-sm">
              {t("ui.openSettings")}
            </button>
            <div className="grid grid-cols-3 gap-3 mt-8 w-full">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="feature-card-title">{t("ui.welcomeFeature1Title")}</span>
                  <span className="feature-card-desc">{t("ui.welcomeFeature1Desc")}</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polygon points="9.5 8 15.5 12 9.5 16 9.5 8" fill="currentColor" stroke="none"/></svg>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="feature-card-title">{t("ui.welcomeFeature2Title")}</span>
                  <span className="feature-card-desc">{t("ui.welcomeFeature2Desc")}</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="feature-card-title">{t("ui.welcomeFeature3Title")}</span>
                  <span className="feature-card-desc">{t("ui.welcomeFeature3Desc")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {!selected && tmdbKey && (
        <>
          <HomeHero />
          <ScrollReveal animation="fade-up" threshold={0.05}>
            <PosterCarousel />
          </ScrollReveal>
        </>
      )}

      {testUrl && createPortal(
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fade-scale-in" onClick={() => setTestUrl(null)}>
          <div className="max-w-md mx-auto px-4 py-8 min-h-full flex flex-col justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-50">{t("ui.testUrlTitle")}</h3>
              <button type="button" onClick={() => setTestUrl(null)} aria-label={t("ui.close")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface2 hover:bg-zinc-700 text-muted hover:text-zinc-200 transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-surface shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- poster reale renderizzato dal server */}
              <img src={testUrl} alt={t("ui.testUrlTitle")} className="w-full" />
            </div>
            <div className="mt-4 flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
              <code className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-mono text-muted select-text">{testUrl}</code>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(testUrl)
                  setUrlCopied(true)
                  setTimeout(() => setUrlCopied(false), 2000)
                } catch { /* clipboard non disponibile */ }
              }} className="btn-secondary py-2 rounded-xl text-[11px]">{urlCopied ? t("ui.copied") : t("ui.copyPosterUrl")}</button>
              <button type="button" onClick={() => window.open(testUrl, "_blank")} className="btn-primary py-2 rounded-xl text-[11px]">{t("ui.openInNewTab")}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
