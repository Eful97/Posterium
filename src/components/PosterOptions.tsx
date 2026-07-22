"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { TMDBImage } from "@/lib/types"
import { LANG_NAMES, groupBy } from "@/lib/utils"
import { PosterBtn } from "@/components/PosterBtn"
import { useP } from "@/lib/context"
import { usePosterFit } from "@/lib/usePosterFit"
import { RotateCcw, Check, Clock, Sparkles, ArrowUpDown, EyeOff, ChevronDown } from "lucide-react"

interface Props {
  posters: TMDBImage[]
  posterActivePath: string | null
  lang: string
  selectPoster: (img: TMDBImage) => void
  activeGroup?: string
  onActiveGroupChange?: (key: string) => void
  showTabs?: boolean
}

export function PosterOptions({ posters, posterActivePath, lang, selectPoster, activeGroup: controlledActiveGroup, onActiveGroupChange, showTabs = true }: Props) {
  const p = useP()

  const excludedSet = useMemo(() => new Set(p.excludedPosters), [p.excludedPosters])

  const cleanPosters = useMemo(() => posters.filter((img) => img.iso_639_1 === null && !excludedSet.has(img.file_path)), [posters, excludedSet])
  const hasClean = cleanPosters.length > 0
  const langGroups = useMemo(
    () => Object.entries(groupBy(posters.filter((img) => img.iso_639_1 !== null), (img) => img.iso_639_1 || "other")).sort(([a], [b]) => {
      if (a === lang) return -1; if (b === lang) return 1
      if (a === "en") return -1; if (b === "en") return 1
      return a.localeCompare(b)
    }),
    [lang, posters],
  )

  const posterTabs = useMemo(() => {
    const tabs: { key: string; label: string; count: number }[] = []
    if (hasClean) tabs.push({ key: "clean", label: "Clean", count: cleanPosters.length })
    for (const [language, imgs] of langGroups) {
      if (imgs.length > 0) tabs.push({ key: language, label: LANG_NAMES[language] || language, count: imgs.length })
    }
    return tabs
  }, [hasClean, cleanPosters.length, langGroups])

  const [internalActiveGroup, setInternalActiveGroup] = useState("clean")
  const activeGroup = controlledActiveGroup ?? internalActiveGroup
  const setActiveGroup = onActiveGroupChange ?? setInternalActiveGroup
  const prevTabCountRef = useRef(posterTabs.length)

  useEffect(() => {
    if (posterTabs.length !== prevTabCountRef.current) {
      prevTabCountRef.current = posterTabs.length
      if (!posterTabs.some((t) => t.key === activeGroup)) {
        setActiveGroup(posterTabs[0]?.key ?? "clean")
      }
    }
  }, [posterTabs, activeGroup, setActiveGroup])

  let idx = 0

  const { bestFitPath, results, loading: fitLoading } = usePosterFit({
    enabled: p.defaultLogoFitEnabled,
    selectedLogo: p.selectedLogo,
    cleanPosters,
    logoScale: p.logoScale,
    logoOffsetX: p.logoOffsetX,
    logoOffsetY: p.logoOffsetY,
    hasBadges: p.globalBadges,
  })

  const scoreMap = useMemo(() => new Map(results.map((r) => [r.posterPath, r.adjustedScore])), [results])
  const hasFitData = results.length > 0

  const bestResult = bestFitPath ? results.find((r) => r.posterPath === bestFitPath) : undefined
  const bestScore = bestResult?.adjustedScore ?? 0
  const bestPoster = bestFitPath ? cleanPosters.find((p) => p.file_path === bestFitPath) : undefined
  const isBestSelected = bestPoster ? posterActivePath === bestPoster.file_path : false

  const isSavedPoster = useMemo(() => {
    if (!p.selected) return false
    const mediaType = p.selected.media_type === "tv" ? "tv" : "movie"
    return p.mappingsMap.has(`${mediaType}:${p.selected.id}`)
  }, [p.mappingsMap, p.selected])

  const topFitRotationPosters = useMemo(() => {
    if (results.length === 0) return []
    const cleanPosterPaths = new Set(cleanPosters.map((poster) => poster.file_path))
    return results
      .filter((result) => cleanPosterPaths.has(result.posterPath))
      .slice(0, 10)
      .map((result) => result.posterPath)
  }, [cleanPosters, results])

  const populatedRotationRef = useRef(false)
  useEffect(() => {
    populatedRotationRef.current = false
  }, [p.selected?.id])
  useEffect(() => {
    if (isSavedPoster) return
    if (topFitRotationPosters.length === 0 || fitLoading) return
    if (p.rotationPosters.length > 0) { populatedRotationRef.current = false; return }
    if (populatedRotationRef.current) return
    populatedRotationRef.current = true
    p.setRotationPosters(topFitRotationPosters)
    if (p.defaultAutoRotateClean && topFitRotationPosters.length > 1) {
      p.setAutoRotateClean(true)
    }
  }, [topFitRotationPosters, fitLoading, isSavedPoster]) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only on fit results

  const [sortByFit, setSortByFit] = useState(false)
  const [showFitDebug, setShowFitDebug] = useState(false)
  const autoSelectedFitKeyRef = useRef<string | null>(null)

  useEffect(() => {
    setSortByFit(false)
    autoSelectedFitKeyRef.current = null
  }, [p.selected?.id])

  const autoSelectFitKey = useMemo(() => {
    if (!p.defaultLogoFitEnabled || !bestPoster || !p.selectedLogo) return null
    return JSON.stringify([
      bestPoster.file_path,
      cleanPosters.map((poster) => poster.file_path),
      p.selectedLogo.file_path,
      p.logoScale,
      p.logoOffsetX,
      p.logoOffsetY,
      p.globalBadges,
    ])
  }, [
    bestPoster,
    cleanPosters,
    p.defaultLogoFitEnabled,
    p.globalBadges,
    p.logoOffsetX,
    p.logoOffsetY,
    p.logoScale,
    p.selectedLogo,
  ])

  useEffect(() => {
    if (isSavedPoster) {
      autoSelectedFitKeyRef.current = null
      return
    }
    if (!autoSelectFitKey || !bestPoster || fitLoading) {
      if (!autoSelectFitKey) autoSelectedFitKeyRef.current = null
      return
    }
    if (isBestSelected) {
      autoSelectedFitKeyRef.current = autoSelectFitKey
      return
    }
    if (autoSelectedFitKeyRef.current === autoSelectFitKey) return
    autoSelectedFitKeyRef.current = autoSelectFitKey
    setSortByFit(true)
    selectPoster(bestPoster)
  }, [autoSelectFitKey, bestPoster, fitLoading, isBestSelected, isSavedPoster, selectPoster])

  const displayPosters = useMemo(() => {
    if (!sortByFit) return cleanPosters
    return [...cleanPosters].sort(
      (a, b) => (scoreMap.get(b.file_path) ?? -1) - (scoreMap.get(a.file_path) ?? -1),
    )
  }, [sortByFit, cleanPosters, scoreMap])

  const [visibleCleanCount, setVisibleCleanCount] = useState(12)

  useEffect(() => {
    setVisibleCleanCount(12)
  }, [p.selected?.id, activeGroup, sortByFit])

  const visibleCleanPosters = useMemo(() => {
    return displayPosters.slice(0, visibleCleanCount)
  }, [displayPosters, visibleCleanCount])

  const toggleRotation = (filePath: string) => {
    p.setRotationPosters((prev) => {
      if (prev.includes(filePath)) return prev.filter((f) => f !== filePath)
      return [...prev, filePath]
    })
  }

  const toggleAutoRotateClean = () => {
    const next = !p.autoRotateClean
    if (next && topFitRotationPosters.length > 0) {
      p.setRotationPosters(topFitRotationPosters)
    }
    p.setAutoRotateClean(next)
  }

  const [excludedSaveState, setExcludedSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const excludePoster = (filePath: string) => {
    const nextExcluded = Array.from(new Set([...p.excludedPosters, filePath]))
    const nextRotationPosters = p.rotationPosters.filter((path) => path !== filePath)
    p.setExcludedPosters(nextExcluded)
    p.setRotationPosters(nextRotationPosters)
    setExcludedSaveState("saving")
    const fallback = posterActivePath === filePath
      ? displayPosters.find((poster) => poster.file_path !== filePath)
      : undefined
    p.autoSaveExcludedPosters(nextExcluded, nextRotationPosters, fallback).then(() => { setExcludedSaveState("saved"); toast.success(p.t("ui.posterExcluded")) }).catch(() => { setExcludedSaveState("error"); toast.error(p.t("ui.saveError")) })
    if (posterActivePath === filePath) {
      if (fallback) selectPoster(fallback)
    }
  }

  const activeClean = activeGroup === "clean"
  const activeLangImgs = !activeClean ? langGroups.find(([l]) => l === activeGroup)?.[1] ?? [] : []

  function shortPath(p: string): string {
    return p.length > 18 ? `${p.slice(0, 10)}...${p.slice(-6)}` : p
  }

  function scoreClass(s: number): string {
    if (s >= 0.65) return "text-green-400"
    if (s >= 0.45) return "text-amber-400"
    return "text-red-400"
  }

  return (
    <div>
      {showTabs && posterTabs.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
          {posterTabs.map((tab) => (
            <button
              aria-label={tab.label}
              key={tab.key}
              onClick={() => setActiveGroup(tab.key)}
              className={`tab-chip h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all shrink-0 ${activeGroup === tab.key ? "tab-chip-active bg-accent-orange/15 text-accent-orange border-accent-orange/35" : "bg-white/5 text-zinc-400 border-white/10 hover:text-zinc-200 hover:bg-white/10"}`}
            >
              {tab.label}
              <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {activeClean && hasClean && (
        <div className="space-y-2 mb-2 px-1">
          {isBestSelected && (
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-accent-orange bg-accent-orange/10 border border-accent-orange/15 rounded-lg">
              <Check className="w-3 h-3" />Best fit selezionato
            </div>
          )}
          {p.rotationPosters.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" />{p.t("ui.autoRotate")}</span>
              <button
                aria-label={p.autoRotateClean ? p.t("ui.removeFromRotation") : p.t("ui.autoRotate")}
                onClick={toggleAutoRotateClean}
                className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-all ${p.autoRotateClean ? "bg-accent-orange/20 text-accent-orange border-accent-orange/25 animate-pulse-ring" : "bg-white/5 text-zinc-400 border-white/10"}`}
              >
                {p.autoRotateClean ? <><Check className="w-3 h-3 inline mr-1" />ON</> : "OFF"}
              </button>
            </div>
          )}
          {hasFitData && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1"><ArrowUpDown className="w-3 h-3" />Ordine poster</span>
              <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/[0.03]">
                <button
                  aria-label="Ordinamento TMDB"
                  onClick={() => setSortByFit(false)}
                  className={`px-2 py-1 text-[11px] font-semibold transition-all ${!sortByFit ? "bg-accent-orange/20 text-accent-orange" : "text-zinc-400 hover:bg-white/10"}`}
                >
                  TMDB
                </button>
                <button
                  aria-label="Miglior compatibilità logo"
                  onClick={() => setSortByFit(true)}
                  className={`px-2 py-1 text-[11px] font-semibold transition-all ${sortByFit ? "bg-accent-orange/20 text-accent-orange" : "text-zinc-400 hover:bg-white/10"}`}
                >
                  Best fit
                </button>
              </div>
            </div>
          )}
          {(bestPoster && !isBestSelected && !fitLoading) && (
            <button
              aria-label="Scegli miglior poster per il logo"
              onClick={() => selectPoster(bestPoster)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 bg-accent-orange/15 text-accent-orange hover:bg-accent-orange/25 active:scale-[0.98]"
            >
              <Sparkles className="w-3 h-3" />Scegli miglior poster
            </button>
          )}
          {fitLoading && (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] text-zinc-500">
              <Clock className="w-3 h-3 animate-spin" />Analisi...
            </div>
          )}
          {hasFitData && (
            <button
              type="button"
              aria-label={showFitDebug ? "Nascondi debug" : "Mostra debug best fit"}
              onClick={() => setShowFitDebug((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-lg transition-all duration-150 text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03]"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              {showFitDebug ? "Nascondi" : "Debug fit"}
            </button>
          )}
        </div>
      )}

      {activeClean && hasClean && (
        <>
          <div className="grid grid-cols-3 2xl:grid-cols-4 gap-2">
            {visibleCleanPosters.map((img) => {
              const stagger = idx++
              const inRotation = p.rotationPosters.includes(img.file_path)
              const isBestFit = bestFitPath === img.file_path
              const showBadge = isBestFit && bestScore >= 0.45
              const isHighScore = bestScore >= 0.65
              return (
                <div key={img.file_path} className={`relative group rounded-xl overflow-hidden ${isBestFit && bestScore >= 0.45 ? `ring-1 ${isHighScore ? "ring-orange-400/70 shadow-[0_0_18px_rgba(255,100,48,0.18)]" : "ring-amber-400/50"}` : ""}`}>
                  <PosterBtn staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                  {showBadge && (
                    <div className={`absolute left-1.5 top-1.5 z-20 rounded-md border px-1.5 py-0.5 text-[8px] font-semibold backdrop-blur-md pointer-events-none ${isHighScore ? "border-orange-300/30 bg-black/60 text-orange-200" : "border-amber-300/25 bg-black/55 text-amber-200"}`}>
                      <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />
                      {isHighScore ? "Best fit" : "Fit migliore"}
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5 z-20 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      aria-label={inRotation ? p.t("ui.removeFromRotation") : p.t("ui.addToRotation")}
                      onClick={(e) => { e.stopPropagation(); toggleRotation(img.file_path) }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md border transition-all duration-150 ${inRotation ? "bg-accent-orange text-white border-accent-orange shadow-sm shadow-accent-orange/40" : "bg-black/55 border-white/10 text-zinc-200 hover:bg-accent-orange/90 hover:text-white hover:border-accent-orange/60"}`}
                      title={inRotation ? p.t("ui.removeFromRotation") : p.t("ui.addToRotation")}
                    >
                      {inRotation ? <Check className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      aria-label="Escludi poster"
                      onClick={(e) => { e.stopPropagation(); excludePoster(img.file_path) }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-md border transition-all duration-150 bg-black/55 border-white/10 text-zinc-300 hover:bg-red-500/90 hover:text-white hover:border-red-400/60"
                      title="Escludi poster"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {displayPosters.length > visibleCleanCount && (
            <button
              type="button"
              aria-label="Carica altri poster"
              onClick={() => setVisibleCleanCount((prev) => prev + 12)}
              className="w-full mt-3 py-2 px-3 text-xs font-semibold rounded-xl bg-white/[0.06] border border-white/10 text-zinc-300 hover:bg-white/[0.12] hover:border-white/20 hover:text-white active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ChevronDown className="w-4 h-4" />
              Carica altri poster (+{Math.min(12, displayPosters.length - visibleCleanCount)})
              <span className="text-[10px] text-zinc-500 font-normal">({visibleCleanCount} di {displayPosters.length})</span>
            </button>
          )}
        </>
      )}

      {activeClean && showFitDebug && hasFitData && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-zinc-300 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-zinc-100">Debug Best fit</span>
            <span className="text-zinc-500">{results.length} candidati</span>
          </div>

          {bestResult && (
            <div className="rounded-lg bg-accent-orange/10 border border-accent-orange/20 px-2 py-1.5 text-accent-orange">
              Best: <span title={bestResult.posterPath}>{shortPath(bestResult.posterPath)}</span> - score {bestResult.adjustedScore.toFixed(2)}
            </div>
          )}

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {results.slice(0, 10).map((result, index) => (
              <div key={result.posterPath} className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-200" title={result.posterPath}>
                    #{index + 1} {shortPath(result.posterPath)}
                  </span>
                  <span className={`font-semibold ${scoreClass(result.adjustedScore)}`}>
                    {result.adjustedScore.toFixed(2)}
                  </span>
                </div>

                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-500">
                  <span>base {result.score.toFixed(2)}</span>
                  <span>qualita {result.qualityScore.toFixed(2)}</span>
                  <span>testo {result.textPenalty.toFixed(2)}</span>
                  <span>logo {result.logoZoneScore.toFixed(2)}</span>
                  <span>contrasto {result.metrics.contrast.toFixed(2)}</span>
                  <span>dettaglio {result.metrics.lowDetailScore.toFixed(2)}</span>
                </div>

                {result.reasons.length > 0 && (
                  <div className="mt-1 text-zinc-400">
                    {result.reasons.join(" - ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeClean && !hasClean && (
        <p className="text-center py-12 text-zinc-400 text-xs">{p.t("ui.loading")}</p>
      )}

      {!activeClean && (
        <div className="grid grid-cols-3 2xl:grid-cols-4 gap-2">
          {activeLangImgs.map((img) => {
            const stagger = idx++
            return <PosterBtn key={img.file_path} staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} />
          })}
        </div>
      )}

      {activeClean && p.rotationPosters.length > 0 && (
        <p className="text-[11px] text-zinc-500 mt-1.5 px-1">{p.rotationPosters.length} {p.t("ui.selectedCount", { count: p.rotationPosters.length })}</p>
      )}
      {activeClean && p.excludedPosters.length > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-zinc-800/70 bg-white/5 px-2.5 py-2">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <span>{p.excludedPosters.length} {p.excludedPosters.length === 1 ? 'poster escluso' : 'poster esclusi'}</span>
            {excludedSaveState === "saving" && <span className="text-[10px] text-zinc-500 animate-pulse">salvataggio...</span>}
            {excludedSaveState === "saved" && <span className="text-[10px] text-green-500">salvato</span>}
            {excludedSaveState === "error" && <span className="text-[10px] text-red-400">errore</span>}
          </span>
          <button onClick={() => { p.setExcludedPosters([]); setExcludedSaveState("saving"); p.autoSaveExcludedPosters([], p.rotationPosters).then(() => { setExcludedSaveState("saved"); toast.success(p.t("ui.cancel")) }).catch(() => { setExcludedSaveState("error"); toast.error(p.t("ui.saveError")) }) }} className="text-[11px] text-accent-orange hover:text-orange-300">
            Ripristina
          </button>
        </div>
      )}

      {posters.length === 0 && <p className="text-center py-12 text-zinc-400">{p.t("ui.loading")}</p>}
    </div>
  )
}
