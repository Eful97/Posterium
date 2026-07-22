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

function NetflixRankNumber({ rank }: { rank: number }) {
  const isDouble = rank >= 10
  const numStr = String(rank)
  
  return (
    <div className="relative pointer-events-none select-none flex items-center justify-end h-full pr-1 md:pr-2 z-0">
      <svg
        viewBox={isDouble ? "0 0 160 180" : "0 0 95 180"}
        className="h-[145px] md:h-[220px] w-auto overflow-visible"
        aria-hidden="true"
      >
        <text
          x={isDouble ? "80" : "47.5"}
          y="155"
          textAnchor="middle"
          fill="#141414"
          stroke="#595959"
          strokeWidth="6"
          strokeLinejoin="miter"
          fontSize="170"
          fontWeight="900"
          fontFamily="Impact, 'Arial Black', sans-serif"
          style={{ letterSpacing: isDouble ? "-16px" : "0" }}
        >
          {numStr}
        </text>
        <text
          x={isDouble ? "80" : "47.5"}
          y="155"
          textAnchor="middle"
          fill="#000000"
          stroke="#737373"
          strokeWidth="3"
          strokeLinejoin="miter"
          fontSize="170"
          fontWeight="900"
          fontFamily="Impact, 'Arial Black', sans-serif"
          style={{ letterSpacing: isDouble ? "-16px" : "0" }}
        >
          {numStr}
        </text>
      </svg>
    </div>
  )
}

const RankCard = React.memo(function RankCard({ item, onClick, isFirst, staggerIndex }: { item: RankItem; onClick: () => void; isFirst?: boolean; staggerIndex?: number }) {
  const imgSrc = item.poster_path || item.posterPath
  const label = item.title || item.name || ""
  const isDouble = item.rank >= 10

  return (
    <button
      onClick={onClick}
      aria-label={`${item.rank}. ${label}`}
      className="group rank-btn relative text-left flex-shrink-0 scroll-snap-start animate-stagger-in flex items-center"
      style={staggerIndex !== undefined ? { animationDelay: `${staggerIndex * 50}ms` } : undefined}
    >
      <div className="flex items-center">
        {/* Giant Netflix Rank Number (left of poster, partially under overlapping edge) */}
        <div className={`shrink-0 ${isDouble ? "w-[75px] md:w-[115px]" : "w-[45px] md:w-[70px]"} h-[145px] md:h-[220px] flex items-center justify-end z-0`}>
          <NetflixRankNumber rank={item.rank} />
        </div>

        {/* Poster Card overlapping number */}
        <div className="relative -ml-4 md:-ml-7 z-10 w-[110px] md:w-[160px] shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:z-20">
          <div className="aspect-[2/3] bg-zinc-900 rounded-md overflow-hidden shadow-2xl transition-all duration-300 relative border border-zinc-800/80 group-hover:border-zinc-500/50">
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- TMDB dynamic URL
              <img
                src={posterUrl(imgSrc, "w342")}
                alt={label}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-600">
                {item.rank}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-7 md:h-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end p-1.5 pointer-events-none rounded-b-md" />
            <p className="absolute bottom-1 left-1.5 right-1.5 text-[9px] md:text-[11px] text-zinc-100 font-semibold truncate leading-snug drop-shadow-md">
              {label}
            </p>
          </div>
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
    const saved = sessionStorage.getItem(storageKey)
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
    requestAnimationFrame(() => sessionStorage.setItem(storageKey, String(el.scrollLeft)))
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (el) sessionStorage.setItem(storageKey, String(el.scrollLeft))
  }

  return (
    <div>
      <div className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase select-none mb-2">
        {label}
      </div>
      <div className="relative group/scroll">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto md:overflow-x-hidden gap-0 pb-1 pr-4 scrollbar-none scroll-smooth scroll-snap-x"
          onWheel={(e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault() }}
          onScroll={handleScroll}
        >
          {items.map((rawItem, idx) => {
            const item = { ...rawItem, rank: rawItem.rank || (idx + 1) }
            return (
              <RankCard
                key={item.tmdbId ?? item.id ?? `rank-${idx}`}
                item={item}
                onClick={() => onItemClick(item)}
                isFirst={idx === 0}
                staggerIndex={idx}
              />
            )
          })}
        </div>
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background via-background/60 to-transparent pointer-events-none z-30 rounded-r-lg" />
        <ScrollButton direction="left" onClick={() => scroll("left")} />
        <ScrollButton direction="right" onClick={() => scroll("right")} />
      </div>
    </div>
  )
}
