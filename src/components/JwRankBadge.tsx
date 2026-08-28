"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Trophy } from "lucide-react"

interface Props {
  tmdbId: number
  type: "movie" | "tv"
}

export function JwRankBadge({ tmdbId, type }: Props) {
  const [rank, setRank] = useState<number | null | undefined>(undefined)
  const [top, setTop] = useState(20)

  useEffect(() => {
    let active = true
    setRank(undefined)
    fetch(`/api/trending/rank?type=${type}&id=${tmdbId}&first=20`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        setRank(data.rank ?? null)
        setTop(data.top ?? 20)
      })
      .catch(() => {
        if (active) setRank(null)
      })
    return () => {
      active = false
    }
  }, [tmdbId, type])

  if (rank === undefined) {
    return <span className="text-[11px] text-zinc-500 animate-pulse">Carico rank…</span>
  }
  if (rank === null) {
    return <span className="text-[11px] text-zinc-500">Fuori Top {top} 🇮🇹</span>
  }
  const isTop3 = rank <= 3
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
        isTop3 ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-white/[0.06] text-zinc-200 border-white/10"
      }`}
      title={`JustWatch trending rank #${rank} in Italia`}
    >
      {isTop3 ? <Trophy className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 text-accent-orange" />}
      Trending #{rank} 🇮🇹
    </span>
  )
}
