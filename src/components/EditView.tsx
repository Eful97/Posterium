"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useP } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { LANG_NAMES, groupBy, posterUrl } from "@/lib/utils"
import { PosterOptions } from "@/components/PosterOptions"
import { LogoOptions } from "@/components/LogoOptions"
import { EditorPanel } from "@/components/EditorPanel"
import { buildPreviewUrl } from "@/lib/poster-url"
import { SearchBar } from "@/components/SearchBar"
import { PosterCarousel } from "@/components/PosterCarousel"
import { ScrollReveal } from "@/components/ScrollReveal"
import { PosterPreview } from "@/components/PosterPreview"
import { PosterDepthEdge, PosterDepthSheen } from "@/components/PosterDepthGlow"
import { BadgeControls } from "@/components/BadgeControls"
import { TransformControls } from "@/components/TransformControls"
import { usePosterPreview } from "@/lib/usePosterPreview"
import { Clock, X, Layers, Sparkles, Globe } from "lucide-react"

export default function EditView() {
  const p = useP()
  const { t, lang } = useT()
  const ed = usePosterEditor()
  const [searchFocused, setSearchFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeRightTab, setActiveRightTab] = useState<"logo" | "badge" | "transform">("logo")
  const [activePosterTab, setActivePosterTab] = useState("clean")

  const { imageError, setImageError, previewLoading, loadProgress, imgSrc } = usePosterPreview()

  const searchBar = (
    <div className={p.selected ? "w-full max-w-lg mb-5 relative z-[100] isolate" : "max-w-lg mx-auto relative z-[100] isolate mb-8"}>
      <SearchBar tmdbKey={p.tmdbKey} value={p.query} onChange={p.setQuery} onSearch={(q) => { p.setQuery(q); window.history.pushState({ view: "search" }, ""); p.setView("search"); p.doSearch(q) }} large onFocus={() => setSearchFocused(true)} onBlur={() => { blurTimerRef.current = setTimeout(() => setSearchFocused(false), 200) }} />
      {searchFocused && p.recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 animate-fade-scale-in">
          <p className="text-xs text-zinc-400 font-semibold px-2 py-1.5">{t("ui.recentSearches")}</p>
          {p.recentSearches.map((s) => (
            <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => { p.setQuery(s); p.setView("search"); p.doSearch(s); window.history.pushState({ view: "search" }, ""); setSearchFocused(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent-orange/10 text-sm text-zinc-300 hover:text-accent transition-all duration-150 text-left">
              <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="flex-1 truncate">{s}</span>
              <span onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }} onClick={(e) => { e.stopPropagation(); p.removeRecentSearch(s) }} aria-label={t("ui.remove")} className="text-red-400 hover:text-red-300 transition-all duration-150 text-sm px-2 shrink-0"><X className="w-3.5 h-3.5" /></span>
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
      .sort(([a], [b]) => { if (a === lang) return -1; if (b === lang) return 1; if (a === "en") return -1; if (b === "en") return 1; return a.localeCompare(b) })
      .forEach(([lang, imgs]) => tabs.push({ key: lang, label: LANG_NAMES[lang] || lang, count: imgs.length }))
    return tabs
  }, [lang, p.posters])

  useEffect(() => {
    if (leftTabs.length === 0) return
    if (!leftTabs.some((tab) => tab.key === activePosterTab)) {
      setActivePosterTab(leftTabs[0]?.key ?? "clean")
    }
  }, [activePosterTab, leftTabs])

  const rightTabs = [
    { key: "logo", label: t("ui.logoSection") },
    ...(cleanPoster ? [{ key: "badge", label: t("ui.badgeSection") }] : []),
    ...(cleanPoster && p.selectedLogo ? [{ key: "transform", label: t("ui.transform") }] : []),
  ]

  return (
    <div>
      {p.selected && (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[1360px] mx-auto mb-3 flex items-center justify-between">
            <button
              onClick={() => { window.history.back() }}
              className="text-xs text-zinc-300 hover:text-white transition-all inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 active:scale-95 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{p.sourceView === "cataloghi" ? "Torna ai cataloghi" : p.sourceView === "myposters" ? "Torna ai miei poster" : "Torna indietro"}</span>
            </button>
          </div>
          {searchBar}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_minmax(400px,480px)_minmax(300px,1fr)] gap-5 items-stretch w-full max-w-[1360px] mx-auto lg:h-[clamp(660px,calc(100dvh-260px),830px)] lg:min-h-0">

            {/* LEFT: Poster */}
            <div className="order-2 lg:order-1 animate-fade-scale-in-panel-left" style={{animationDelay: "80ms"}}>
            <EditorPanel aria-label={`${p.selected?.title || ""} — Poster selection`} tabs={leftTabs} activeTab={activePosterTab} onTabChange={setActivePosterTab}>
              {p.loadingImages ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded-lg skeleton-shimmer" />)}</div>
              ) : (
                <PosterOptions posters={p.posters} posterActivePath={p.posterActivePath} lang={lang} selectPoster={p.selectPoster} activeGroup={activePosterTab} onActiveGroupChange={setActivePosterTab} showTabs={false} />
              )}
            </EditorPanel>
            </div>

            {/* CENTER: Preview */}
            <div className="order-1 lg:order-2 animate-fade-scale-in" style={{animationDelay: "0ms"}}>
            <EditorPanel title={t("ui.previewSection")}>
              <div className="flex flex-col items-center">
                <div className={`editor-stage relative isolate w-full max-w-[360px] my-2 ${p.previewPoster?.file_path ? "editor-stage-glow" : ""}`}>
                  {/* NuvioDesktop-style depth edge */}
                  <PosterDepthEdge edgeStrength={40} edgeCoverage={10} />
                  {/* Poster Image Ambient Depth Glow */}
                  {p.previewPoster?.file_path && (
                    <div
                      className="absolute -inset-6 rounded-3xl opacity-75 blur-2xl pointer-events-none transition-all duration-700 ease-out z-0"
                      style={{
                        backgroundImage: `url(${posterUrl(p.previewPoster.file_path, "w185")})`,
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
                      background: p.accentColor
                        ? `radial-gradient(circle at 50% 50%, ${p.accentColor}, transparent 70%)`
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
                    />
                  </div>
                  <PosterDepthSheen sheenStrength={20} />
                </div>

                {p.selected && (
                  <div className="mt-4 w-full text-center select-text">
                    <h2 className="text-lg font-bold tracking-tight text-zinc-50">{p.titleOf(p.selected)}</h2>
                    <p className="text-xs text-zinc-300 mt-0.5">{p.yearOf(p.selected)} {p.selected.media_type === "movie" ? t("ui.movie") : t("ui.tvSeries")}</p>
                    <p className="text-xs text-zinc-500 mt-1 preview-meta-info">TMDB: <a href={`https://www.themoviedb.org/${p.selected.media_type}/${p.selected.id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-white underline underline-offset-2">{p.selected.id}</a>{p.selected.imdb_id ? <> • IMDB: <a href={`https://www.imdb.com/title/${p.selected.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-white underline underline-offset-2">{p.selected.imdb_id}</a></> : ""}</p>
                  </div>
                )}

                {p.previewPoster && p.selected && (
                  <div className="mt-4 w-full max-w-[360px] grid grid-cols-3 gap-2">
                    <button aria-label={t("ui.savePoster")} onClick={p.saveConfig} className="btn-primary py-2 px-3 rounded-xl active:scale-[0.97]">{t("ui.savePoster")}</button>
                    <button aria-label={t("ui.testUrl")} onClick={() => {
                      if (!p.selected || !p.previewPoster) return
                      const url = buildPreviewUrl({
                        selected: p.selected,
                        previewPoster: p.previewPoster,
                        selectedLogo: p.selectedLogo,
                        selectedBackdrop: ed.selectedBackdrop,
                        logoScale: ed.logoScale,
                        logoOffsetX: ed.logoOffsetX,
                        logoOffsetY: ed.logoOffsetY,
                        backdropScale: ed.backdropScale,
                        backdropOffsetX: ed.backdropOffsetX,
                        backdropOffsetY: ed.backdropOffsetY,
                        metaInfo: p.metaInfo,
                        trendRank: p.trendRank,
                        mdblistAnimeList: p.mdblistAnimeList,
                        topEdgeColor: p.topEdgeColor,
                        accentColor: p.accentColor,
                        lang: p.lang,
                        tmdbKey: p.tmdbKey,
                      }, {
                        globalBadges: ed.globalBadges,
                        rankingBadges: ed.rankingBadges,
                        badgeStyle: ed.badgeStyle,
                        rankingBadgeStyle: ed.rankingBadgeStyle,
                        badgeFont: ed.badgeFont,
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
                      window.open(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, "_blank")
                    }} className="btn-secondary py-2 px-3 rounded-xl text-[11px]">{t("ui.testUrl")}</button>
                    {(() => {
                      const selected = p.selected
                      if (!selected) return null
                      const key = `${selected.media_type}:${selected.id}`
                      const hasMapping = p.mappingsMap.get(key)
                      if (!hasMapping) return null
                      return (
                        <button aria-label={t("ui.remove")} onClick={() => { p.removeMapping(hasMapping).catch((e) => console.error("[posterium] Remove mapping failed:", e)); p.setSelected(null); p.setPreviewPoster(null); p.setSelectedLogo(null); p.setPreviewId(null) }} className="btn-danger py-2 px-3 rounded-xl text-[11px]">{t("ui.remove")}</button>
                      )
                    })()}
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 text-center mt-3">{p.selectedLogo ? t("ui.logoSelected") : p.previewPoster?.iso_639_1 === null ? `${t("ui.clean")} ${t("ui.selected").toLowerCase()}` : p.previewPoster ? t("ui.logoHint") : t("ui.noPosterSelected")}</p>
              </div>
            </EditorPanel>
            </div>

            {/* RIGHT: Edit */}
            <div className="order-3 lg:order-3 animate-fade-scale-in-panel-right" style={{animationDelay: "80ms"}}>
            <EditorPanel tabs={rightTabs} activeTab={activeRightTab} onTabChange={(k) => setActiveRightTab(k as typeof activeRightTab)}>
              <div key={activeRightTab} className="animate-fade-in space-y-3">
              {activeRightTab === "logo" && <>
                <LogoOptions logos={p.logos} selectedLogo={p.selectedLogo} lang={lang} selectLogo={p.selectLogo} removeLogo={p.removeLogo} disabled={!cleanPoster} />
                {!cleanPoster && <p className="text-xs text-zinc-500 text-center mt-2 px-1">{t("ui.logoHint")}</p>}
              </>}
              {activeRightTab === "badge" && <BadgeControls />}
              {activeRightTab === "transform" && <TransformControls />}
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
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{t("ui.noKey")}</p>
            <button onClick={() => p.setSettingsOpen(true)} className="btn-primary px-5 py-2.5 text-sm">
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
      {!p.selected && p.tmdbKey && (
        <>
          <section className="hero-section max-w-5xl mx-auto px-8 py-8 mb-10 animate-fade-scale-in-hero">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0">
                <span className="hero-kicker mb-3">{t("ui.heroKicker")}</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-orange/15 border border-accent-orange/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <polygon points="9.5 8 15.5 12 9.5 16 9.5 8" fill="currentColor" stroke="none"/>
                    </svg>
                  </div>
                  <h1 className="text-xl md:text-2xl tracking-tight font-bold text-zinc-50">{t("ui.heroTitle")}</h1>
                </div>
                <p className="text-xs text-zinc-400 mt-2 max-w-md">{t("ui.heroSubtitle")}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                  <span className="stat-pill"><Layers className="w-3.5 h-3.5" />{t("ui.heroPillLogos")}</span>
                  <span className="stat-pill"><Sparkles className="w-3.5 h-3.5" />{t("ui.heroPillAi")}</span>
                  <span className="stat-pill"><Globe className="w-3.5 h-3.5" />{t("ui.heroPillLangs")}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { window.history.pushState({ view: "cataloghi" }, ""); p.setView("cataloghi") }} className="btn-primary px-5 py-2.5 whitespace-nowrap">
                  {t("ui.heroCatalogsCta")}
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
              <p className="text-sm text-zinc-400">{t("ui.loading")}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
