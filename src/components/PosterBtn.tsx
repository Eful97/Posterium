"use client"

import React from "react"
import type { TMDBImage } from "@/lib/types"
import { posterUrl } from "@/lib/utils"

interface Props {
  img: TMDBImage
  active: boolean
  onSelect: (img: TMDBImage) => void
  title?: string
}

interface PosterBtnProps {
  img: TMDBImage
  active: boolean
  onSelect: (img: TMDBImage) => void
  title?: string
  staggerIndex?: number
}

export const PosterBtn = React.memo(function PosterBtn({ img, active, onSelect, title, staggerIndex }: PosterBtnProps) {
  return (
    <button
      onClick={() => onSelect(img)}
      className={`group relative bg-zinc-800 rounded-xl overflow-hidden border-2 transition-all duration-200 ease-out shadow-md hover:shadow-accent/25 hover:shadow-xl hover:-translate-y-1.5 ${active ? "border-accent shadow-[0_0_15px_var(--color-accent)] ring-2 ring-accent/30 ring-offset-1 ring-offset-background scale-[1.02]" : "border-transparent hover:border-white/20 hover:shadow-white/5"}`}
      title={title || ""}
      style={staggerIndex !== undefined ? { animation: `fade-scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${staggerIndex * 40}ms both` } : undefined}
    >
      <div className="aspect-[2/3] relative overflow-hidden">
        <img src={posterUrl(img.file_path, "w154")} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {active && (
          <>
            <div className="absolute inset-0 bg-accent-orange/10" />
            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-accent-orange rounded-full flex items-center justify-center shadow-lg shadow-accent-orange/40">
              <span className="text-[8px] font-bold text-white">✓</span>
            </div>
            <span className="absolute bottom-0 left-0 right-0 text-[8px] font-semibold text-accent-orange text-center py-0.5 bg-accent-orange/15 backdrop-blur-sm">Selezionato</span>
          </>
        )}
        {!active && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 transition-opacity duration-300" />}
      </div>
      {title && <p className="text-[10px] text-zinc-400 truncate px-1 py-1 text-left group-hover:text-accent transition-colors">{title}</p>}
    </button>
  )
})
