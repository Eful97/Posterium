"use client"

import React from "react"
import { posterUrl } from "@/lib/utils"
import { Check } from "lucide-react"
import { PosterDepthEdge, PosterDepthSheen } from "@/components/PosterDepthGlow"

export interface SimklCardItem {
  tmdbId?: number | null
  id?: number | null
  title?: string | null
  name?: string | null
  poster_path?: string | null
  posterPath?: string | null
  media_type?: string
  mediaType?: string
  rank?: number
}

interface SimklCardProps {
  items: SimklCardItem[]
  title: string
  totalCount?: number
  meta?: string[]
  onClick?: () => void
  onItemClick?: (item: SimklCardItem) => void
  savedKeys?: Set<string>
}

export function SimklCard({ items, title, totalCount, meta = [], onClick, onItemClick, savedKeys }: SimklCardProps) {
  const displayItems = items.slice(0, 5)
  const isSingle = displayItems.length <= 2
  const count = totalCount ?? items.length

  const imgSrc = (item: SimklCardItem) => {
    const path = item.poster_path || item.posterPath
    return path ? posterUrl(path, "w185") : ""
  }

  const handlePosterClick = (e: React.MouseEvent, item: SimklCardItem) => {
    e.stopPropagation()
    onItemClick?.(item)
  }

  return (
    <div
      className={`simkl-list-card relative${isSingle ? " simkl-list-card--single" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="posters">
        {displayItems.map((item, idx) => {
          const src = imgSrc(item)
          const mediaType = item.media_type || item.mediaType || "movie"
          const tmdbId = item.tmdbId ?? item.id
          const itemKey = `${mediaType}:${tmdbId}`
          const isSaved = tmdbId && savedKeys?.has(itemKey)

          return (
            <div
              key={tmdbId ?? idx}
              className="relative isolate shrink-0 overflow-hidden cursor-pointer"
              onClick={(e) => handlePosterClick(e, item)}
            >
              <PosterDepthEdge edgeStrength={40} edgeCoverage={10} />
              <div className="relative z-[1]">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote TMDB poster tiles (lazy, optimized by CDN)
                  <img
                    src={src}
                    alt={item.title ?? item.name ?? ""}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="poster-placeholder w-full h-full" />
                )}
                {isSaved && (
                  <div
                    className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg z-10"
                    title="Già personalizzato nei tuoi poster"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <PosterDepthSheen sheenStrength={20} />
            </div>
          )
        })}
      </div>
      <div className="info">
        <h3>
          <span className="truncate">{title}</span>
          <span className="grid-hint ml-2 shrink-0" title="Vedi tutti">⧉</span>
        </h3>
        <div className="meta flex items-center justify-between mt-2.5">
          {count > 0 && (
            <span className="counter-badge text-[11px] px-2 py-0.5 rounded-md font-medium bg-white/10 border border-white/10 text-zinc-300 backdrop-blur-sm">
              {count} {count === 1 ? "titolo" : "titoli"}
            </span>
          )}
          {meta.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {meta.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
