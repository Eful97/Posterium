"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useP } from "@/lib/context"
import { posterUrl, LANG_NAMES } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Search, X, Check, Square, Trash2, Calendar, ArrowUpAZ, ChevronDown, Clapperboard, Tv, Flag, Clipboard, List } from "lucide-react"

export function MyPostersView() {
  const p = useP()
  const { mappings, goHome, navigateToPoster, removeMapping } = p
  const [filter, setFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv" | "anime">("all")
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [sortBy, setSortBy] = useState<"updated" | "alpha">("updated")
  const [typeOpen, setTypeOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const typeRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const deleteSelected = async () => {
    const toDelete = mappings.filter((m) => selected.has(`${m.mediaType}:${m.tmdbId}`))
    setDeleting(true)
    for (const m of toDelete) {
      await removeMapping(m)
    }
    setDeleting(false)
    setSelected(new Set())
    setSelectMode(false)
  }

  const deleteAll = async () => {
    setDeleting(true)
    for (const m of mappings) {
      await removeMapping(m)
    }
    setDeleting(false)
    setShowDeleteAll(false)
  }

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
      .sort((a, b) => sortBy === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : a.title.localeCompare(b.title))
  }, [mappings, filter, sortBy, typeFilter])

  useEffect(() => {
    if (!typeOpen) return
    const handler = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [typeOpen])

  useEffect(() => {
    if (!sortOpen) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [sortOpen])

  return (
    <div className="pt-4 animate-fade-scale-in">
      <h2 className="text-xl font-bold text-center mb-4">{p.t("ui.myPostersTitle")} <span className="text-xs text-zinc-400 font-normal">({mappings.length})</span></h2>
      <div className="flex items-center gap-2 mb-4 px-4 max-w-7xl mx-auto md:justify-center md:relative">
        <div className="flex items-center h-9 md:h-12 bg-black/50 backdrop-blur-sm border border-zinc-700/80 focus-within:border-accent/60 focus-within:shadow-lg focus-within:shadow-accent/10 rounded-2xl transition-all duration-300 group flex-1 md:flex-none md:w-80 md:max-w-xs">
          <span className="shrink-0 pl-2.5 md:pl-3.5 text-zinc-500 group-focus-within:text-accent transition-colors duration-300"><Search size={14} /></span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={p.t("ui.filterPlaceholder")} className="flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400 focus:placeholder:text-zinc-400 px-1.5 md:px-2 h-full transition-colors duration-200" />
          {filter.length > 0 && (
            <button onClick={() => setFilter("")} className="shrink-0 w-8 h-8 mr-1 flex items-center justify-center bg-zinc-700/60 text-zinc-300 rounded-full hover:bg-zinc-600 hover:shadow-lg active:scale-90 transition-all duration-200"><X className="w-4 h-4" /></button>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-2 md:absolute md:right-0 shrink-0">
          <button onClick={() => { setSelectMode((v) => !v); setSelected(new Set()) }} className={`shrink-0 w-9 h-9 md:w-auto md:h-10 md:px-3 rounded-xl text-xs font-medium transition-all duration-150 active:scale-90 flex items-center justify-center gap-1 ${selectMode ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-surface text-zinc-400 hover:bg-surface2 hover:text-blue-400"}`}><span className="shrink-0">{selectMode ? <X className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}</span><span className="hidden md:inline">{selectMode ? p.t("ui.cancel") : p.t("ui.select")}</span></button>
          {mappings.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowDeleteAll((v) => !v)} className="shrink-0 w-9 h-9 md:w-auto md:h-10 md:px-3 rounded-xl text-xs font-medium transition-all duration-150 bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/50 hover:border-red-500 active:scale-[0.98] flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
              <ConfirmDialog open={showDeleteAll} title={p.t("ui.confirmDeleteAll")} message={p.t("ui.confirmDeleteAllMsg", { count: mappings.length })} confirmLabel={p.t("ui.deleteAll")} onConfirm={deleteAll} onCancel={() => setShowDeleteAll(false)} inline />
            </div>
          )}
          <div className="relative" ref={sortRef}>
            <button onClick={() => { setSortOpen((o) => !o); setTypeOpen(false) }} className="flex items-center gap-1 h-9 md:h-10 md:px-3 md:gap-2 rounded-xl text-xs font-medium bg-surface text-zinc-400 hover:bg-surface2 transition-all duration-150 shrink-0 px-2">
              <span className="shrink-0">{sortBy === "updated" ? <Calendar className="w-3.5 h-3.5" /> : <ArrowUpAZ className="w-3.5 h-3.5" />}</span>
              <span className="hidden md:inline truncate">{sortBy === "updated" ? p.t("ui.recent") : p.t("ui.sortAZ")}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-1.5 shadow-2xl shadow-black/50 z-50 min-w-44 animate-fade-scale-in">
                <button onClick={() => { setSortBy("updated"); setSortOpen(false) }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150 ${sortBy === "updated" ? "bg-accent/10 text-accent font-medium" : "text-zinc-200 hover:bg-zinc-800"}`}>{p.t("ui.sortRecent")}</button>
                <button onClick={() => { setSortBy("alpha"); setSortOpen(false) }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150 ${sortBy === "alpha" ? "bg-accent/10 text-accent font-medium" : "text-zinc-200 hover:bg-zinc-800"}`}>{p.t("ui.sortAlpha")}</button>
              </div>
            )}
          </div>
          <div className="relative" ref={typeRef}>
            <button onClick={() => { setTypeOpen((o) => !o); setSortOpen(false) }} className="flex items-center gap-1 h-9 md:h-10 md:px-3 md:gap-2 rounded-xl text-xs font-medium bg-surface text-zinc-400 hover:bg-surface2 transition-all duration-150 shrink-0 px-2">
              <span className="shrink-0">{typeFilter === "movie" ? <Clapperboard className="w-3.5 h-3.5" /> : typeFilter === "tv" ? <Tv className="w-3.5 h-3.5" /> : typeFilter === "anime" ? <Flag className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}</span>
              <span className="hidden md:inline truncate">{typeFilter === "all" ? p.t("ui.all") : typeFilter === "movie" ? p.t("ui.filterMovie") : typeFilter === "tv" ? p.t("ui.filterSeries") : p.t("ui.filterAnime")}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {typeOpen && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-1.5 shadow-2xl shadow-black/50 z-50 min-w-44 animate-fade-scale-in">
                {(["all", "movie", "tv", "anime"] as const).map((t) => (
                  <button key={t} onClick={() => { setTypeFilter(t); setTypeOpen(false) }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150 ${typeFilter === t ? "bg-accent/10 text-accent font-medium" : "text-zinc-200 hover:bg-zinc-800"}`}>
                    {t === "all" ? p.t("ui.all") : t === "movie" ? <><Clapperboard className="w-3.5 h-3.5" /> {p.t("ui.filterMovie")}</> : t === "tv" ? <><Tv className="w-3.5 h-3.5" /> {p.t("ui.filterSeries")}</> : <><Flag className="w-3.5 h-3.5" /> {p.t("ui.filterAnime")}</>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4 mx-auto max-w-7xl w-full px-4 animate-fade-scale-in">
          <span className="text-sm font-semibold text-zinc-200 tabular-nums">{p.t("ui.selectedCount", { count: selected.size })}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectMode(false); setSelected(new Set()) }} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-800 active:scale-95 transition-all duration-150">{p.t("ui.cancel")}</button>
            <button disabled={deleting} onClick={deleteSelected} className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-900/25 border border-red-900/50 px-4 py-1.5 rounded-xl hover:bg-red-900/40 hover:border-red-500 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              <Trash2 className="w-3.5 h-3.5" /> {deleting ? p.t("ui.deleting") : p.t("ui.delete")}
            </button>
          </div>
        </div>
      )}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-zinc-400 mb-4">{mappings.length === 0 ? p.t("ui.emptyPosters") : p.t("ui.noFilteredResults")}</p>
          {mappings.length === 0 && (
            <button onClick={goHome} className="px-6 py-3 btn-primary font-medium">
              {p.t("ui.searchCta")}
            </button>
          )}
        </div>
      )}
      <div className="mx-auto grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] lg:grid-cols-5 gap-3 md:gap-4 max-w-7xl justify-items-center">
        {filtered.map((m, idx) => {
          const key = `${m.mediaType}:${m.tmdbId}`
          return (
            <button key={key} onClick={() => { if (selectMode) toggleSelect(key); else navigateToPoster({ id: m.tmdbId, media_type: m.mediaType as "movie" | "tv", title: m.title, name: m.title, poster_path: m.posterPath } as any, "myposters") }} aria-label={m.title} className={`group relative bg-surface rounded-xl overflow-hidden border transition-all duration-200 ease-out w-full max-w-[250px] lg:max-w-none animate-stagger-in ${selectMode ? (selected.has(key) ? "border-red-400 ring-1 ring-red-400/50" : "border-zinc-800 hover:border-zinc-600") : "border-zinc-800 hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10"}`} style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}>
                <div className="aspect-[2/3] bg-zinc-800 overflow-hidden relative">
                  {m.posterPath ? <img src={posterUrl(m.posterPath, "w342")} alt={m.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-500">{m.title.charAt(0)}</div>}
                  {m.logoPath && (
                    <div className="absolute inset-x-0 bottom-[7.33%] flex items-center justify-center">
                      <div style={{ width: `${m.logoScale ?? 75}%` }}>
                        <img src={posterUrl(m.logoPath, "w154")} alt="" loading="lazy" decoding="async" className="w-full" style={{ objectFit: "contain" }} />
                      </div>
                    </div>
                  )}
                {selectMode && (
                  <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${selected.has(key) ? "bg-red-500 border-red-500 shadow-lg shadow-red-500/30 scale-110" : "border-white/40 bg-black/30 hover:border-white/60"}`}>
                    {selected.has(key) && <Check className="w-3 h-3 text-white drop-shadow" />}
                  </div>
                )}
              </div>
              <div className="px-2 py-2.5 text-center">
                <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-accent transition-colors duration-200">{m.title}</p>
                <p className="text-xs text-zinc-400">{m.language ? LANG_NAMES[m.language] || m.language : p.t("ui.clean")}{m.logoPath ? p.t("ui.withLogo") : ""}</p>
              </div>
              {!selectMode && (
                <span onClick={(e) => { e.stopPropagation(); removeMapping(m) }} className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg bg-red-900/70 flex items-center justify-center text-xs text-red-300 hover:bg-red-800 hover:text-red-200 active:scale-90 transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg shadow-black/30"><Trash2 className="w-3.5 h-3.5" /></span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
