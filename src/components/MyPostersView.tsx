"use client"

import React, { useState } from "react"
import { useP } from "@/lib/context"
import { posterUrl, LANG_NAMES } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ConfirmDialog"

export function MyPostersView() {
  const { mappings, goHome, navigateToPoster, removeMapping } = useP()
  const [filter, setFilter] = useState("")
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [sortBy, setSortBy] = useState<"updated" | "alpha">("updated")
  const [sortOpen, setSortOpen] = useState(false)

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const deleteSelected = () => {
    mappings.filter((m) => selected.has(`${m.mediaType}:${m.tmdbId}`)).forEach(removeMapping)
    setSelected(new Set())
    setSelectMode(false)
  }

  const deleteAll = () => {
    mappings.forEach(removeMapping)
    setShowDeleteAll(false)
  }

  const filtered = mappings
    .filter((m) => m.title.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => sortBy === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : a.title.localeCompare(b.title))

  return (
    <div className="pt-4 animate-fade-scale-in">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">📋 I miei poster <span className="text-xs text-zinc-500 font-normal">({mappings.length})</span></h2>
      </div>
      <div className="flex flex-col md:flex-row items-center md:justify-center gap-2 mb-4">
          <div className="flex md:flex-row items-center gap-2 w-full md:w-auto justify-center relative">
            <div className="flex items-center h-10 md:h-12 bg-black/50 backdrop-blur-sm border border-zinc-700/80 focus-within:border-accent/60 focus-within:shadow-lg focus-within:shadow-accent/10 rounded-2xl transition-all duration-300 group flex-1 max-w-xs md:w-80">
              <span className="shrink-0 pl-3 md:pl-3.5 text-zinc-500 group-focus-within:text-accent transition-colors duration-300 text-xs md:text-sm">🔍</span>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cerca poster..." className="flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-500 focus:placeholder:text-zinc-400 px-2 h-full transition-colors duration-200" />
              {filter.length > 0 && (
                <button onClick={() => setFilter("")} className="shrink-0 w-6 h-6 md:w-8 md:h-8 mr-1.5 flex items-center justify-center bg-accent text-white rounded-full text-[10px] md:text-sm hover:shadow-lg hover:shadow-accent/30 active:scale-90 transition-all duration-200">✕</button>
              )}
            </div>
            <button onClick={() => { setSelectMode((v) => !v); setSelected(new Set()) }} className={`shrink-0 w-9 h-9 md:w-auto md:h-10 md:px-3 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-center md:inline-flex ${selectMode ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-black/40 border border-zinc-700 text-zinc-400 hover:border-blue-500/50 hover:text-blue-400"}`}>✎</button>
            {mappings.length > 0 && (
              <div className="relative">
                <button onClick={() => setShowDeleteAll((v) => !v)} className="shrink-0 w-9 h-9 md:w-auto md:h-10 md:px-3 rounded-lg text-xs font-medium transition-all duration-150 bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/50 hover:border-red-500 active:scale-[0.98] flex items-center justify-center md:inline-flex">🗑️</button>
                <ConfirmDialog open={showDeleteAll} title="Eliminare tutti i poster?" message={`Questa azione rimuoverà tutti i ${mappings.length} poster personalizzati. Non può essere annullata.`} confirmLabel="Elimina tutto" onConfirm={deleteAll} onCancel={() => setShowDeleteAll(false)} inline />
              </div>
            )}
        </div>
        <div className="relative">
          <button onClick={() => setSortOpen((o) => !o)} className="flex items-center gap-1 px-3 h-9 md:h-10 rounded-lg text-xs font-medium bg-black/40 border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition-all duration-150">
            {sortBy === "updated" ? "📅 Più recenti" : "🔤 A-Z"} <span className="text-[10px]">▼</span>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl p-1 shadow-2xl shadow-black/50 z-50 min-w-40 animate-fade-scale-in">
              <button onClick={() => { setSortBy("updated"); setSortOpen(false) }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all duration-150 ${sortBy === "updated" ? "bg-accent/10 text-accent font-medium" : "text-zinc-300 hover:bg-zinc-800"}`}>📅 Più recenti</button>
              <button onClick={() => { setSortBy("alpha"); setSortOpen(false) }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all duration-150 ${sortBy === "alpha" ? "bg-accent/10 text-accent font-medium" : "text-zinc-300 hover:bg-zinc-800"}`}>🔤 A-Z</button>
            </div>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <button onClick={deleteSelected} className="mb-4 py-3 px-4 rounded-lg text-xs font-medium text-red-400 border border-red-400/40 bg-red-900/15 hover:text-red-300 hover:border-red-400/70 hover:bg-red-900/30 active:scale-[0.98] transition-all duration-150">
          Elimina {selected.size} selezionat{selected.size === 1 ? "o" : "i"}
        </button>
      )}
      {filtered.length === 0 && <p className="text-sm text-zinc-500 text-center py-12">{mappings.length === 0 ? "Nessun poster personalizzato" : "Nessun risultato"}</p>}
      <div className="mx-auto grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] lg:grid-cols-5 gap-3 md:gap-4 max-w-7xl justify-items-center">
        {filtered.map((m) => {
          const key = `${m.mediaType}:${m.tmdbId}`
          return (
            <button key={key} onClick={() => { if (selectMode) toggleSelect(key); else navigateToPoster({ id: m.tmdbId, media_type: m.mediaType as "movie" | "tv", title: m.title, name: m.title, poster_path: m.posterPath } as any) }} className={`group relative bg-surface rounded-xl overflow-hidden border transition-all duration-200 ease-out w-full max-w-[250px] lg:max-w-none ${selectMode ? (selected.has(key) ? "border-red-400 ring-1 ring-red-400/50" : "border-zinc-800 hover:border-zinc-600") : "border-zinc-800 hover:border-accent/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/10"}`}>
                <div className="aspect-[2/3] bg-zinc-800 overflow-hidden relative">
                  <img src={posterUrl(m.posterPath, "w342")} alt={m.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  {m.logoPath && (
                    <div className="absolute inset-x-0 flex items-center justify-center" style={{ bottom: "7.33%" }}>
                      <div style={{ transform: `translate(${m.logoOffsetX ?? 0}px, ${m.logoOffsetY ?? 0}px)`, width: `${m.logoScale ?? 75}%` }}>
                        <img src={posterUrl(m.logoPath, "original")} alt="" className="w-full" style={{ objectFit: "contain" }} />
                      </div>
                    </div>
                  )}
                {selectMode && (
                  <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selected.has(key) ? "bg-red-400 border-red-400" : "border-white/60 bg-black/40"}`}>
                    {selected.has(key) && <span className="text-black text-[10px] font-bold">✓</span>}
                  </div>
                )}
              </div>
              <div className="px-2 py-2.5 text-center">
                <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-accent transition-colors duration-200">{m.title}</p>
                <p className="text-[11px] text-zinc-500">{m.language ? LANG_NAMES[m.language] || m.language : "Clean"}{m.logoPath ? " + logo" : ""}</p>
              </div>
              {!selectMode && (
                <span onClick={(e) => { e.stopPropagation(); removeMapping(m) }} className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-900/60 flex items-center justify-center text-[10px] text-red-300 hover:bg-red-800 active:scale-90 transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-pointer">✕</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
