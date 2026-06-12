"use client"

import { useRef } from "react"
import { posterUrl } from "@/lib/utils"
import { ScrollButton } from "@/components/ScrollButton"

interface RankItem {
  id?: number | null
  tmdbId?: number | null
  title?: string | null
  name?: string | null
  poster_path?: string | null
  posterPath?: string | null
  rank: number
}

function rankBadge(rank: number) {
  return (
    <span
      className="absolute top-[3%] left-[3%] text-xl md:text-4xl font-black leading-none"
      style={{
        background: "linear-gradient(180deg, #fff 0%, #f0f0f0 50%, #b0b8c4 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        filter: "drop-shadow(3px 6px 8px rgba(0,0,0,0.50))",
        WebkitTextStroke: "0.8px rgba(60,60,60,0.45)",
      }}
    >
      {rank}
    </span>
  )
}

function RankCard({ item, onClick, isFirst }: { item: RankItem; onClick: () => void; isFirst?: boolean }) {
  const imgSrc = item.poster_path || item.posterPath
  const label = item.title || item.name || ""
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group rank-btn relative text-left flex-shrink-0 scroll-snap-start"
    >
      <div className="flex items-end">
        <div
          className={`poster-slide relative ${isFirst ? "" : "-ml-8 md:-ml-14"} z-10 w-[170px] md:w-72 shrink-0 transition-transform duration-200 drop-shadow-[4px_0_6px_rgba(0,0,0,0.7)]`}
        >
          <div className="aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden shadow-xl transition-all duration-300 relative">
            {imgSrc ? (
              <img
                src={posterUrl(imgSrc, "w342")}
                alt={label}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-2xl font-bold text-zinc-600">
                {item.rank}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-6 md:h-9 bg-black/70 backdrop-blur-sm flex items-center px-2 pointer-events-none rounded-b-lg" />
            <p className="absolute bottom-0 left-2 right-2 h-6 md:h-9 flex items-center text-[9px] md:text-xs text-white font-medium truncate leading-tight">
              {label}
            </p>
          </div>
          {rankBadge(item.rank)}
        </div>
      </div>
    </button>
  )
}

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
  if (items.length === 0) return null
  const gap = 3

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const poster = el.querySelector(".rank-btn") as HTMLElement
    const w = poster?.offsetWidth || 192
    el.scrollBy({ left: dir === "left" ? -(w * gap) : w * gap, behavior: "smooth" })
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
        >
          {items.map((item, idx) => (
            <RankCard
              key={item.tmdbId ?? item.id ?? `rank-${idx}`}
              item={item}
              onClick={() => onItemClick(item)}
              isFirst={idx === 0}
            />
          ))}
        </div>
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background via-background/60 to-transparent pointer-events-none z-30 rounded-r-lg" />
        <ScrollButton direction="left" onClick={() => scroll("left")} />
        <ScrollButton direction="right" onClick={() => scroll("right")} />
      </div>
    </div>
  )
}
