"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { toSearchResult } from "@/lib/types"
import { posterUrl } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Search, X, Square, Trash2, Calendar, ArrowUpAZ, ChevronDown, Clapperboard, Tv, Flag, Clipboard } from "lucide-react"
import { MoodBoardTile } from "@/components/MoodBoardTile"
import { PosterLightbox } from "@/components/PosterLightbox"
import { CollectionBar } from "@/components/CollectionBar"
import { useCollections } from "@/lib/useCollections"
import type { Mapping } from "@/lib/types"

export function MyPostersView() {
  const mappings = usePSelector((v) => v.mappings)
  const goHome = usePSelector((v) => v.goHome)
  const router = usePSelector((v) => v.router)
  const navigateToPoster = usePSelector((v) => v.navigateToPoster)
  const removeMapping = usePSelector((v) => v.removeMapping)
  const { t } = useT()
  const [filter, setFilter] = useState("")
  const filterRef = useRef<HTMLInputElement>(null)
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv" | "anime">("all")
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  // Conferma prima della cancellazione (F9): singolo tile e multi-select.
  const [confirmRemove, setConfirmRemove] = useState<Mapping | null>(null)
  const [showDeleteSelected, setShowDeleteSelected] = useState(false)
  const [sortBy, setSortBy] = useState<"updated" | "alpha">("updated")
  const [typeOpen, setTypeOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [typeClosing, setTypeClosing] = useState(false)
  const [sortClosing, setSortClosing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightbox, setLightbox] = useState<{ mapping: Mapping; rect: DOMRect } | null>(null)
  const [activeCollection, setActiveCollection] = useState<string | null>(null)
  const {
    collections,
    createCollection,
    deleteCollection,
    renameCollection,
    addToCollection,
    removeFromCollection,
  } = useCollections()
  const typeRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const typeCloseTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const sortCloseTimer = useRef<ReturnType<typeof setTimeout>>(null)

  // Cleanup dei timer di chiusura dropdown su unmount: evita setState su
  // componente smontato (warning React) e timer pendenti dopo la navigazione.
  useEffect(() => {
    return () => {
      if (typeCloseTimer.current) clearTimeout(typeCloseTimer.current)
      if (sortCloseTimer.current) clearTimeout(sortCloseTimer.current)
    }
  }, [])

  const closeTypeDropdown = useCallback(() => {
    if (typeOpen) {
      setTypeClosing(true)
      typeCloseTimer.current = setTimeout(() => { setTypeOpen(false); setTypeClosing(false) }, 150)
    }
  }, [typeOpen])

  const closeSortDropdown = useCallback(() => {
    if (sortOpen) {
      setSortClosing(true)
      sortCloseTimer.current = setTimeout(() => { setSortOpen(false); setSortClosing(false) }, 150)
    }
  }, [sortOpen])

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // Cancella N mapping e riporta il numero di fallimenti: con Promise.all una
  // singola HTTP non-2xx farebbe fallire tutto senza feedback e lascerebbe i
  // restanti non eliminati (alcuni già rimossi lato server, altri no).
  const removeMany = useCallback(async (items: Mapping[]) => {
    const results = await Promise.allSettled(items.map((m) => removeMapping(m)))
    return results.filter((r) => r.status === "rejected").length
  }, [removeMapping])

  const deleteSelected = async () => {
    const toDelete = mappings.filter((m) => selected.has(`${m.mediaType}:${m.tmdbId}`))
    if (toDelete.length === 0) return
    setDeleting(true)
    try {
      const failed = await removeMany(toDelete)
      if (failed > 0) {
        import("sonner").then(({ toast }) => toast.error(t("ui.deleteFailed", { count: failed })))
      } else {
        setSelected(new Set())
        setSelectMode(false)
      }
    } finally {
      setDeleting(false)
    }
  }

  const deleteAll = async () => {
    setDeleting(true)
    try {
      const failed = await removeMany(mappings)
      if (failed > 0) {
        import("sonner").then(({ toast }) => toast.error(t("ui.deleteFailed", { count: failed })))
      } else {
        setShowDeleteAll(false)
      }
    } finally {
      setDeleting(false)
    }
  }

  const countByCollection = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const col of collections) {
      acc[col.id] = col.posterIds.filter((k) => mappings.some((m) => `${m.mediaType}:${m.tmdbId}` === k)).length
    }
    return acc
  }, [collections, mappings])

  const filtered = useMemo(() => {
    return mappings
      .filter((m) => {
        if (!m.title.toLowerCase().includes(filter.toLowerCase())) return false
        if (typeFilter === "all") return true
        if (typeFilter === "movie") return m.mediaType === "movie"
        if (typeFilter === "tv") return m.mediaType === "tv" && !(m.genreName || "").toLowerCase().includes("anim")
        if (typeFilter === "anime") return m.mediaType === "tv" && (m.genreName || "").toLowerCase().includes("anim")
        return true
      })
      .filter((m) => {
        if (!activeCollection) return true
        const key = `${m.mediaType}:${m.tmdbId}`
        const col = collections.find((c) => c.id === activeCollection)
        return col?.posterIds.includes(key) ?? false
      })
      .sort((a, b) => sortBy === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : a.title.localeCompare(b.title))
  }, [mappings, filter, sortBy, typeFilter, activeCollection, collections])

  useEffect(() => {
    if (!typeOpen) return
    const handler = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) closeTypeDropdown()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [typeOpen, closeTypeDropdown])

  useEffect(() => {
    if (!sortOpen) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) closeSortDropdown()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [sortOpen, closeSortDropdown])

  // Shortcut "/" per il filtro titolo (non quando si sta già digitando)
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      const isTyping = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable)
      if (!isTyping) {
        e.preventDefault()
        filterRef.current?.focus()
      }
    }
    addEventListener("keydown", fn)
    return () => removeEventListener("keydown", fn)
  }, [])

  return (
    <div className="pt-4 animate-fade-scale-in">
      {/* Header libreria (da prototipo Open Design): kicker + titolo + conteggio + CTA */}
      <section className="max-w-[1180px] mx-auto px-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="text-center md:text-left">
            <span className="hero-kicker mb-3">
              <span className="dot" aria-hidden="true" />
              {t("ui.myPostersKicker")}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-50 flex items-center justify-center md:justify-start gap-3">
              {t("ui.myPostersTitle")}
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-muted tabular-nums" aria-label={t("ui.statusPosterCount", { count: mappings.length })}>
                {mappings.length}
              </span>
            </h1>
            <p className="text-sm text-muted mt-1">{t("ui.myPostersSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2 justify-center shrink-0">
            <button type="button" onClick={() => router.push("search")} className="btn-ghost px-4 py-2 text-xs whitespace-nowrap">{t("ui.myPostersSearchCta")}</button>
            <button type="button" onClick={goHome} className="btn-primary px-4 py-2 text-xs whitespace-nowrap">{t("ui.myPostersNewCta")}</button>
          </div>
        </div>
      </section>
      <div className="flex items-center gap-2 mb-4 px-4 max-w-7xl mx-auto md:justify-center md:relative">
        <div role="search" className="search-shell flex items-center h-9 md:h-12 rounded-2xl transition-all duration-300 group flex-1 md:flex-none md:w-80 md:max-w-xs">
          <span className="shrink-0 pl-2.5 md:pl-3.5 text-zinc-500 group-focus-within:text-zinc-300 transition-colors"><Search size={14} /></span>
          <input ref={filterRef} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("ui.filterPlaceholder")} aria-label={t("ui.filterPlaceholder")} className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted focus:placeholder:text-muted px-1.5 md:px-2 h-full transition-colors duration-200" />
          {filter.length === 0 && (
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 mr-1 text-[10px] font-mono font-medium text-zinc-500 bg-white/[0.06] border border-white/10 rounded-md pointer-events-none select-none">/</kbd>
          )}
          {filter.length > 0 && (
            <button type="button" aria-label={t("ui.filterPlaceholder")} onClick={() => setFilter("")} className="shrink-0 w-8 h-8 mr-1 flex items-center justify-center bg-zinc-700/60 text-zinc-300 rounded-full hover:bg-zinc-600 hover:shadow-lg active:scale-90 transition-all duration-200"><X className="w-4 h-4" /></button>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-2 md:absolute md:right-0 shrink-0">
          <button type="button" aria-label={selectMode ? t("ui.cancel") : t("ui.select")} onClick={() => { setSelectMode((v) => !v); setSelected(new Set()) }} className={`shrink-0 w-9 h-9 md:w-auto md:h-10 md:px-3 rounded-xl text-xs font-medium transition-all duration-150 active:scale-90 flex items-center justify-center gap-1 ${selectMode ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-surface text-muted hover:bg-surface2 hover:text-blue-400"}`}><span className="shrink-0">{selectMode ? <X className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}</span><span className="hidden md:inline">{selectMode ? t("ui.cancel") : t("ui.select")}</span></button>
          {mappings.length > 0 && (
            <div className="relative">
              <button type="button" aria-label={t("ui.deleteAll")} onClick={() => setShowDeleteAll((v) => !v)} className="shrink-0 w-9 h-9 md:w-auto md:h-10 md:px-3 rounded-xl text-xs font-medium transition-all duration-150 bg-red-900/30 border border-red-900/50 text-danger hover:bg-red-900/50 hover:border-red-500 active:scale-[0.98] flex items-center justify-center press-scale"><Trash2 className="w-4 h-4" /></button>
              <ConfirmDialog open={showDeleteAll} title={t("ui.confirmDeleteAll")} message={t("ui.confirmDeleteAllMsg", { count: mappings.length })} confirmLabel={t("ui.deleteAll")} onConfirm={deleteAll} onCancel={() => setShowDeleteAll(false)} inline />
            </div>
          )}
          <div className="relative" ref={sortRef}>
            <button type="button" aria-label={sortBy === "updated" ? t("ui.sortRecent") : t("ui.sortAZ")} onClick={() => { setSortOpen((o) => !o); setTypeOpen(false) }} className="flex items-center gap-1 h-9 md:h-10 md:px-3 md:gap-2 rounded-xl text-xs font-medium bg-surface text-muted hover:bg-surface2 transition-all duration-150 shrink-0 px-2 press-scale">
              <span className="shrink-0">{sortBy === "updated" ? <Calendar className="w-3.5 h-3.5" /> : <ArrowUpAZ className="w-3.5 h-3.5" />}</span>
              <span className="hidden md:inline truncate">{sortBy === "updated" ? t("ui.recent") : t("ui.sortAZ")}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {(sortOpen || sortClosing) && (
              <div className={`absolute right-0 top-full mt-2 glass-panel rounded-2xl p-1.5 z-50 min-w-44 ${sortClosing ? "animate-fade-scale-out" : "animate-fade-scale-in"}`}>
                <button type="button" onClick={() => { setSortBy("updated"); closeSortDropdown() }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150 ${sortBy === "updated" ? "bg-accent/10 text-accent font-medium" : "text-zinc-200 hover:bg-surface2"}`}>{t("ui.sortRecent")}</button>
                <button type="button" onClick={() => { setSortBy("alpha"); closeSortDropdown() }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150 ${sortBy === "alpha" ? "bg-accent/10 text-accent font-medium" : "text-zinc-200 hover:bg-surface2"}`}>{t("ui.sortAlpha")}</button>
              </div>
            )}
          </div>
          <div className="relative" ref={typeRef}>
            <button type="button" aria-label={typeFilter === "all" ? t("ui.all") : typeFilter === "movie" ? t("ui.filterMovie") : typeFilter === "tv" ? t("ui.filterSeries") : t("ui.filterAnime")} onClick={() => { setTypeOpen((o) => !o); setSortOpen(false) }} className="flex items-center gap-1 h-9 md:h-10 md:px-3 md:gap-2 rounded-xl text-xs font-medium bg-surface text-muted hover:bg-surface2 transition-all duration-150 shrink-0 px-2 press-scale">
              <span className="shrink-0">{typeFilter === "movie" ? <Clapperboard className="w-3.5 h-3.5" /> : typeFilter === "tv" ? <Tv className="w-3.5 h-3.5" /> : typeFilter === "anime" ? <Flag className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}</span>
              <span className="hidden md:inline truncate">{typeFilter === "all" ? t("ui.all") : typeFilter === "movie" ? t("ui.filterMovie") : typeFilter === "tv" ? t("ui.filterSeries") : t("ui.filterAnime")}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {(typeOpen || typeClosing) && (
              <div className={`absolute right-0 top-full mt-2 glass-panel rounded-2xl p-1.5 z-50 min-w-44 ${typeClosing ? "animate-fade-scale-out" : "animate-fade-scale-in"}`}>
                {(["all", "movie", "tv", "anime"] as const).map((typeKey) => (
                  <button type="button" key={typeKey} onClick={() => { setTypeFilter(typeKey); closeTypeDropdown() }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150 ${typeFilter === typeKey ? "bg-accent/10 text-accent font-medium" : "text-zinc-200 hover:bg-surface2"}`}>
                    {typeKey === "all" ? t("ui.all") : typeKey === "movie" ? <><Clapperboard className="w-3.5 h-3.5" /> {t("ui.filterMovie")}</> : typeKey === "tv" ? <><Tv className="w-3.5 h-3.5" /> {t("ui.filterSeries")}</> : <><Flag className="w-3.5 h-3.5" /> {t("ui.filterAnime")}</>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {mappings.length > 0 && (
        <div className="px-4 max-w-7xl mx-auto mb-3">
          <CollectionBar
            collections={collections}
            activeId={activeCollection}
            onSelect={setActiveCollection}
            onCreate={createCollection}
            onRename={renameCollection}
            onDelete={(id) => {
              if (activeCollection === id) setActiveCollection(null)
              deleteCollection(id)
            }}
            countByCollection={countByCollection}
            totalCount={mappings.length}
          />
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4 mx-auto max-w-7xl w-full px-4 animate-fade-scale-in">
          <span className="text-sm font-semibold text-zinc-200 tabular-nums">{t("ui.selectedCount", { count: selected.size })}</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t("ui.cancel")} onClick={() => { setSelectMode(false); setSelected(new Set()) }} className="text-xs text-muted hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-surface2 active:scale-95 transition-all duration-150">{t("ui.cancel")}</button>
            <div className="relative">
              <button type="button" aria-label={t("ui.delete")} disabled={deleting} onClick={() => setShowDeleteSelected(true)} className="flex items-center gap-1.5 text-xs font-semibold text-danger bg-red-900/25 border border-red-900/50 px-4 py-1.5 rounded-xl hover:bg-red-900/40 hover:border-red-500 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                <Trash2 className="w-3.5 h-3.5" /> {deleting ? t("ui.deleting") : t("ui.delete")}
              </button>
              <ConfirmDialog
                open={showDeleteSelected}
                title={t("ui.confirmDeleteSelected", { count: selected.size })}
                message={t("ui.confirmDeleteSelectedMsg", { count: selected.size })}
                confirmLabel={t("ui.delete")}
                onConfirm={() => { setShowDeleteSelected(false); void deleteSelected() }}
                onCancel={() => setShowDeleteSelected(false)}
                inline
              />
            </div>
          </div>
        </div>
      )}
      {filtered.length === 0 && (
        <div className="text-center py-16 animate-fade-scale-in">
          {mappings.length === 0 ? (
            <>
              <div className="relative h-[7.5rem] w-20 mx-auto mb-7" aria-hidden="true">
                <div className="absolute -inset-9 -z-10" style={{ background: "radial-gradient(circle, rgb(var(--accent-rgb) / 0.16), transparent 70%)" }} />
                <div className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.04] rotate-[-9deg]" />
                <div className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.04] rotate-[9deg]" />
                <div className="absolute inset-0 rounded-xl border border-accent-orange/45 bg-gradient-to-b from-accent-orange/[0.18] via-accent-orange/[0.06] to-transparent flex items-center justify-center shadow-[0_0_34px_rgb(var(--accent-rgb)/0.25)]">
                  <svg className="w-7 h-7 text-accent-orange drop-shadow-[0_2px_10px_rgb(var(--accent-rgb)/0.45)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" opacity="0.4"/>
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
              </div>
              <p className="text-zinc-300 text-sm font-medium mb-1.5">{t("ui.emptyPosters")}</p>
              <p className="text-zinc-500 text-xs mb-6 max-w-xs mx-auto leading-relaxed">Cerca un film o una serie, personalizza il poster con badge e logo, poi salvalo qui.</p>
              <button type="button" onClick={goHome} className="px-6 py-3 btn-primary font-medium press-scale">
                {t("ui.searchCta")}
              </button>
            </>
          ) : activeCollection ? (
            <>
              <div className="empty-state-illustration mb-4">
                <svg className="w-10 h-10 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" opacity="0.3"/>
                  <line x1="8" y1="12" x2="21" y2="12" opacity="0.3"/>
                  <line x1="8" y1="18" x2="21" y2="18" opacity="0.3"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
              <p className="text-zinc-300 text-sm font-medium mb-1">Questa collezione è vuota</p>
              <p className="text-zinc-500 text-xs mb-4">Apri un poster per aggiungerlo a questa collezione.</p>
              <button type="button" onClick={() => setActiveCollection(null)} className="px-4 py-2 text-xs rounded-xl bg-surface hover:bg-surface2 text-zinc-300 transition-colors press-scale">
                Mostra tutti i poster ({mappings.length})
              </button>
            </>
          ) : (
            <>
              <div className="empty-state-illustration mb-4">
                <svg className="w-10 h-10 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" opacity="0.3"/>
                  <line x1="8" y1="12" x2="21" y2="12" opacity="0.3"/>
                  <line x1="8" y1="18" x2="21" y2="18" opacity="0.3"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
              <p className="text-muted text-sm mb-1">{t("ui.noFilteredResults")}</p>
              <p className="text-zinc-500 text-xs">Prova a modificare il filtro o la ricerca.</p>
            </>
          )}
        </div>
      )}
      {/* Mood Board layout */}
      <div className="mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 max-w-7xl">
        {filtered.map((m, idx) => (
          <MoodBoardTile
            key={`${m.mediaType}:${m.tmdbId}`}
            mapping={m}
            idx={idx}
            selectMode={selectMode}
            selected={selected}
            onSelect={() => toggleSelect(`${m.mediaType}:${m.tmdbId}`)}
            onOpen={() => navigateToPoster(toSearchResult({ id: m.tmdbId, media_type: m.mediaType, title: m.title, name: m.title, poster_path: m.posterPath }), "myposters")}
            onQuickView={(e) => {
              const tileEl = (e.target as HTMLElement).closest("button")
              const rect = tileEl?.getBoundingClientRect()
              if (rect) setLightbox({ mapping: m, rect })
            }}
            onRemove={(e) => { e.stopPropagation(); setConfirmRemove(m) }}
            collectionCount={collections.filter((c) => c.posterIds.includes(`${m.mediaType}:${m.tmdbId}`)).length}
            t={t}
          />
        ))}
      </div>
      <PosterLightbox
        lightbox={lightbox}
        onClose={() => setLightbox(null)}
        posterUrlFn={posterUrl}
        t={t}
        collections={collections}
        onAddToCollection={addToCollection}
        onRemoveFromCollection={removeFromCollection}
      />
      <ConfirmDialog
        open={confirmRemove !== null}
        title={t("ui.confirmDelete")}
        message={confirmRemove ? t("ui.confirmDeleteMsg", { title: confirmRemove.title }) : ""}
        confirmLabel={t("ui.delete")}
        onConfirm={() => {
          const target = confirmRemove
          setConfirmRemove(null)
          if (target) void removeMapping(target)
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  )
}
