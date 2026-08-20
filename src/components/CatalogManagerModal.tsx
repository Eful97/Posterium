"use client"

import React, { useState, useMemo, useEffect } from "react"
import { X, ArrowUp, ArrowDown, Edit2, Check, RotateCcw, Power, Trash2, SlidersHorizontal, Film, Tv } from "lucide-react"
import { usePosterium } from "@/lib/context"
import { POSTERIUM_CATALOGS } from "@/lib/catalog-definitions"

interface CatalogManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CatalogEntryItem {
  id: string
  name: string
  originalName: string
  type: "movie" | "series"
  isCustom: boolean
  customBaseId?: string
  enabled: boolean
}

export function CatalogManagerModal({ isOpen, onClose }: CatalogManagerModalProps) {
  const {
    customCatalogs,
    toggleCustomCatalog,
    removeCustomCatalog,
    disabledCatalogIds,
    toggleBuiltinCatalog,
    catalogOrder,
    moveCatalog,
    catalogRenames,
    renameCatalog,
    resetCatalogNames,
    resetCatalogOrder,
  } = usePosterium()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingId) setEditingId(null)
        else onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, editingId])

  const allCatalogs = useMemo(() => {
    const list: CatalogEntryItem[] = []

    // Built-in catalogs
    for (const c of POSTERIUM_CATALOGS) {
      list.push({
        id: c.id,
        name: catalogRenames[c.id] || c.name,
        originalName: c.name,
        type: c.type,
        isCustom: false,
        enabled: !disabledCatalogIds.includes(c.id),
      })
    }

    // Custom catalogs
    for (const cc of customCatalogs) {
      if (cc.type === "mixed") {
        const mId = `posterium-custom-movie-${cc.id}`
        const sId = `posterium-custom-series-${cc.id}`
        list.push({
          id: mId,
          name: catalogRenames[mId] || `${cc.name} — Film`,
          originalName: `${cc.name} — Film`,
          type: "movie",
          isCustom: true,
          customBaseId: cc.id,
          enabled: cc.enabled !== false,
        })
        list.push({
          id: sId,
          name: catalogRenames[sId] || `${cc.name} — Serie TV`,
          originalName: `${cc.name} — Serie TV`,
          type: "series",
          isCustom: true,
          customBaseId: cc.id,
          enabled: cc.enabled !== false,
        })
      } else {
        const cId = `posterium-custom-${cc.type}-${cc.id}`
        list.push({
          id: cId,
          name: catalogRenames[cId] || cc.name,
          originalName: cc.name,
          type: cc.type,
          isCustom: true,
          customBaseId: cc.id,
          enabled: cc.enabled !== false,
        })
      }
    }

    // Sort according to catalogOrder
    if (catalogOrder && catalogOrder.length > 0) {
      const orderMap = new Map<string, number>()
      catalogOrder.forEach((id, idx) => orderMap.set(id, idx))
      list.sort((a, b) => {
        const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999
        const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999
        return orderA - orderB
      })
    }

    return list
  }, [customCatalogs, disabledCatalogIds, catalogOrder, catalogRenames])

  if (!isOpen) return null

  const startRename = (item: CatalogEntryItem) => {
    setEditingId(item.id)
    setEditName(item.name)
  }

  const saveRename = (id: string) => {
    if (editName.trim()) {
      renameCatalog(id, editName.trim())
    }
    setEditingId(null)
  }

  const cancelRename = () => {
    setEditingId(null)
  }

  const handleToggle = (item: CatalogEntryItem) => {
    if (item.isCustom && item.customBaseId) {
      toggleCustomCatalog(item.customBaseId)
    } else {
      toggleBuiltinCatalog(item.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-surface2/40">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-accent-orange" />
            <div>
              <h3 className="text-sm font-bold text-white">Priorità & Nomi Cataloghi Stremio</h3>
              <p className="text-[11px] text-muted">Trascina/sposta l&apos;ordine o clicca la matita per rinominare</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global actions bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-surface2/20 border-b border-white/5 text-[11px]">
          <span className="text-muted">
            {allCatalogs.filter((c) => c.enabled).length} di {allCatalogs.length} attivi su Stremio
          </span>
          <div className="flex items-center gap-2">
            {catalogOrder.length > 0 && (
              <button
                type="button"
                onClick={resetCatalogOrder}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-muted hover:text-zinc-200 hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Ripristina Ordine
              </button>
            )}
            {Object.keys(catalogRenames).length > 0 && (
              <button
                type="button"
                onClick={resetCatalogNames}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-muted hover:text-zinc-200 hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Ripristina Nomi
              </button>
            )}
          </div>
        </div>

        {/* Catalog List */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1 scrollbar-thin">
          {allCatalogs.map((item, index) => {
            const isEditing = editingId === item.id
            const isCustomRenamed = Boolean(catalogRenames[item.id] && catalogRenames[item.id] !== item.originalName)

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  item.enabled
                    ? "bg-surface2/60 border-white/10 hover:border-white/20 shadow-sm"
                    : "bg-surface2/20 border-white/5 opacity-50"
                }`}
              >
                {/* Left: Rank index + Reorder arrows */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveCatalog(item.id, "up")}
                      title="Sposta in alto (priorità maggiore)"
                      className="p-1 rounded hover:bg-white/10 text-muted hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === allCatalogs.length - 1}
                      onClick={() => moveCatalog(item.id, "down")}
                      title="Sposta in basso (priorità minore)"
                      className="p-1 rounded hover:bg-white/10 text-muted hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="w-6 text-center text-xs font-mono font-bold text-muted">
                    #{index + 1}
                  </span>
                </div>

                {/* Center: Title & inline edit */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
                        {["🍿", "🎬", "📺", "⛩️", "☁️", "🍎", "🏔️", "🏰", "🔴", "📦", "🟣", "🌶️", "🏆", "🔥", "⭐", "🎭"].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              const cleaned = editName.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{Emoji})\s*/u, "")
                              setEditName(`${em} ${cleaned}`)
                            }}
                            className="shrink-0 p-1 text-xs hover:scale-125 transition-transform rounded hover:bg-white/10"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(item.id)
                            if (e.key === "Escape") cancelRename()
                          }}
                          className="flex-1 px-3 py-1.5 bg-surface border border-accent-orange/50 rounded-lg text-xs text-white focus:outline-none focus:border-accent-orange"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveRename(item.id)}
                          className="p-1.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 transition-colors"
                          title="Salva nome"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
                          title="Annulla"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => startRename(item)}
                        className="p-1 rounded text-muted hover:text-white hover:bg-white/5 transition-colors shrink-0"
                        title="Rinomina catalogo"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {isCustomRenamed && (
                        <button
                          type="button"
                          onClick={() => renameCatalog(item.id, "")}
                          className="text-[10px] text-accent-orange hover:underline shrink-0"
                          title={`Nome originale: ${item.originalName}`}
                        >
                          (modificato, ripristina)
                        </button>
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          item.type === "movie"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            : "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {item.type === "movie" ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
                        {item.type === "movie" ? "Film" : "Serie TV"}
                      </span>
                      {item.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          Custom
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    title={item.enabled ? "Disattiva da Stremio" : "Attiva su Stremio"}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      item.enabled
                        ? "bg-accent-orange/15 border-accent-orange/30 text-accent-orange hover:bg-accent-orange/25"
                        : "bg-white/5 border-white/5 text-muted hover:text-white"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  {item.isCustom && item.customBaseId && (
                    <button
                      type="button"
                      onClick={() => removeCustomCatalog(item.customBaseId!)}
                      title="Elimina catalogo"
                      className="p-1.5 rounded-lg border border-white/5 text-muted hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-white/10 bg-surface2/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-accent-orange text-white text-xs font-semibold hover:bg-accent-orange/90 active:scale-95 transition-all shadow-md"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  )
}
