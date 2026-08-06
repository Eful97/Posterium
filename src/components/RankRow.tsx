"use client"

import React, { useRef, useEffect } from "react"
import { posterUrl } from "@/lib/utils"
import { ScrollButton } from "@/components/ScrollButton"

interface RankItem {
  id?: number | null
  tmdbId?: number | null
  title?: string | null
  name?: string | null
  media_type?: string
  poster_path?: string | null
  posterPath?: string | null
  rank: number
}

function rankBadge(rank: number) {
  const twoDigit = rank >= 10
  return (
    <span className="absolute top-[1%] left-[1%] flex items-center justify-center z-20" style={{ width: twoDigit ? '44px' : '34px', height: '34px' }}>
      <span className="absolute inset-0 rounded-xl bg-black/50 backdrop-blur-sm" />
      <span className="relative text-base md:text-xl font-bold leading-none text-white"
        style={{ filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.50))" }}
      >
        {rank}
      </span>
    </span>
  )
}

const RankCard = React.memo(function RankCard({ item, onClick, isFirst, staggerIndex }: { item: RankItem; onClick: () => void; isFirst?: boolean; staggerIndex?: number }) {
  const imgSrc = item.poster_path || item.posterPath
  const label = item.title || item.name || ""
  return (
    <button type="button"
      onClick={onClick}
      aria-label={label}
      className="group rank-btn relative text-left flex-shrink-0 animate-stagger-in snap-start"
      style={staggerIndex !== undefined ? { animationDelay: `${staggerIndex * 60}ms` } : undefined}
    >
      <div className="flex items-end">
        <div
          className={`poster-slide relative ${isFirst ? "" : "-ml-8 md:-ml-14"} z-10 w-[170px] md:w-72 shrink-0`}
        >
        <div className="aspect-[2/3] bg-zinc-800 rounded-xl overflow-hidden shadow-lg transition-all duration-200 relative border border-white/10">
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- TMDB dynamic URL
            <img
              src={posterUrl(imgSrc, "w342")}
              alt={label}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-2xl font-bold text-zinc-500">
              {item.rank}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-6 md:h-9 bg-black/70 backdrop-blur-sm flex items-center px-2 pointer-events-none rounded-b-xl" />
          <p className="absolute bottom-0 left-2 right-2 h-6 md:h-9 flex items-center text-[9px] md:text-xs text-white font-medium truncate leading-tight">
            {label}
          </p>
        </div>
        {rankBadge(item.rank)}
      </div>
      </div>
    </button>
  )
})

export function RankRow({
  label,
  items,
  onItemClick,
}: {
  label: string
  items: RankItem[]
  onItemClick: (item: RankItem) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const storageKey = `scroll:${label}`

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // sessionStorage può lanciare (private mode, iframe sandbox): non deve rompere il render
    let saved: string | null = null
    try { saved = sessionStorage.getItem(storageKey) } catch { /* storage non disponibile */ }
    if (saved) el.scrollLeft = Number(saved)
  }, [items.length, storageKey])

  if (items.length === 0) return null
  const gap = 3

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const poster = el.querySelector(".rank-btn") as HTMLElement
    const w = poster?.offsetWidth || 192
    el.scrollBy({ left: dir === "left" ? -(w * gap) : w * gap, behavior: "smooth" })
    requestAnimationFrame(() => { try { sessionStorage.setItem(storageKey, String(el.scrollLeft)) } catch { /* storage non disponibile */ } })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    try { sessionStorage.setItem(storageKey, String(el.scrollLeft)) } catch { /* storage non disponibile */ }
  }

  return (
    <div>
      <div className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase select-none mb-2">
        {label}
      </div>
      <div className="relative group/scroll bg-[#121620] border border-white/10 rounded-2xl p-2 shadow-xl">
        <div
          ref={scrollRef}
          className="flex overflow-x-scroll gap-0 pb-1 scrollbar-none scroll-smooth"
          onScroll={handleScroll}
        >
          {items.map((item, idx) => (
            <RankCard
              key={item.tmdbId ?? item.id ?? `rank-${idx}`}
              item={item}
              onClick={() => onItemClick(item)}
              isFirst={idx === 0}
              staggerIndex={idx}
            />
          ))}
        </div>
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#121620] via-[#121620]/60 to-transparent pointer-events-none z-30 rounded-r-2xl" />
        <ScrollButton direction="left" onClick={() => scroll("left")} />
        <ScrollButton direction="right" onClick={() => scroll("right")} />
      </div>
    </div>
  )
}
