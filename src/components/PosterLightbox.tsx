"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { X, Star, ExternalLink, Maximize2, Check } from "lucide-react"
import type { Mapping } from "@/lib/types"
import type { PosterCollection } from "@/lib/useCollections"

interface PosterLightboxProps {
  lightbox: { mapping: Mapping; rect: DOMRect } | null
  onClose: () => void
  posterUrlFn: (path: string, size?: string) => string
  t: (key: string, params?: Record<string, string | number>) => string
  collections?: PosterCollection[]
  onAddToCollection?: (collectionId: string, posterKey: string) => void
  onRemoveFromCollection?: (collectionId: string, posterKey: string) => void
}

export function PosterLightbox({
  lightbox,
  onClose,
  posterUrlFn,
  t,
  collections,
  onAddToCollection,
  onRemoveFromCollection,
}: PosterLightboxProps) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mapping = lightbox?.mapping ?? null
  const rect = lightbox?.rect ?? null
  const posterKey = mapping ? `${mapping.mediaType}:${mapping.tmdbId}` : null

  // Start animation on mount
  useEffect(() => {
    if (!mapping) return
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true))
    })
    return () => cancelAnimationFrame(raf)
  }, [mapping])

  // Set transform-origin on the card once measured
  useEffect(() => {
    if (!mounted || !cardRef.current || !rect) return
    const cardRect = cardRef.current.getBoundingClientRect()
    const tileCenterX = rect.left + rect.width / 2
    const tileCenterY = rect.top + rect.height / 2
    const originX = tileCenterX - cardRect.left
    const originY = tileCenterY - cardRect.top
    cardRef.current.style.transformOrigin = `${originX}px ${originY}px`
  }, [mounted, rect])

  const handleClose = useCallback(() => {
    setClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setClosing(false)
      setMounted(false)
      onClose()
      closeTimerRef.current = null
    }, 150)
  }, [onClose])

  // Keyboard handler
  useEffect(() => {
    if (!mapping) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [mapping, handleClose])

  // Cleanup del timer di chiusura su unmount: evita setState su componente smontato
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  if (!mapping) return null

  const year = (mapping.releaseDate || mapping.firstAirDate || "").slice(0, 4)
  const typeLabel = mapping.mediaType === "movie"
    ? t("ui.movie")
    : (mapping.genreName || "").toLowerCase().includes("anim")
      ? t("ui.filterAnime")
      : t("ui.tvSeries")
  const vote = mapping.voteAverage != null ? mapping.voteAverage.toFixed(1) : null

  const isInCol = (colId: string) =>
    collections?.some((c) => c.id === colId && c.posterIds.includes(posterKey!)) ?? false

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-200 ${
        closing ? "bg-black/30" : mounted ? "bg-black/50 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${mapping.title} ${t("ui.quickView")}`}
    >
      {/* Card — anima dalla posizione del tile al centro */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xs sm:max-w-sm rounded-2xl surface-card overflow-hidden shadow-2xl shadow-black/60 transition-all duration-300 ${
          mounted && !closing
            ? "opacity-100 scale-100"
            : closing
              ? "opacity-0 scale-75"
              : "opacity-0 scale-[0.3]"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Close button */}
        <button
          autoFocus
          onClick={handleClose}
          aria-label={t("ui.cancel")}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:bg-black/70 hover:text-white transition-all duration-200 active:scale-90 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Poster area */}
        <div className="aspect-[2/3] bg-zinc-900 relative overflow-hidden">
          {mapping.posterPath ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- TMDB dynamic URL */}
              <img
                src={posterUrlFn(mapping.posterPath, "w500")}
                alt={mapping.title}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <ExternalLink className="w-12 h-12 text-zinc-600" />
            </div>
          )}

          {/* Title + metadata sovrapposti al poster */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <p className="text-base font-bold text-white drop-shadow-lg leading-tight">{mapping.title}</p>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
              {year && <span className="text-xs font-medium text-zinc-200 drop-shadow">{year}</span>}
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 text-white font-semibold backdrop-blur-sm">
                {typeLabel}
              </span>
              {vote && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-400 drop-shadow">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {vote}
                </span>
              )}
            </div>
          </div>

          {/* Poster icon badge */}
          {mapping.posterPath && (
            <div className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
              <Maximize2 className="w-3.5 h-3.5 text-white/60" />
            </div>
          )}
        </div>

        {/* Collections section */}
        {posterKey && collections && collections.length > 0 && (
          <div className="px-4 py-3 border-t border-white/5">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Collezioni
            </p>
            <div className="flex flex-wrap gap-1.5">
              {collections.map((col) => {
                const checked = isInCol(col.id)
                return (
                  <button
                    key={col.id}
                    onClick={() => {
                      if (checked) {
                        onRemoveFromCollection?.(col.id, posterKey)
                      } else {
                        onAddToCollection?.(col.id, posterKey)
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 active:scale-95 ${
                      checked
                        ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/25"
                        : "bg-white/5 text-zinc-400 hover:text-zinc-300 border border-white/5 hover:border-white/10"
                    }`}
                  >
                    {checked && <Check className="w-2.5 h-2.5" />}
                    <span className="truncate max-w-24">{col.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
