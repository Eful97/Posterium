"use client"

import { genreRatingSVG } from "@/lib/badges"

export function RankingBadge({ rank, label }: { rank: number; label?: string }) {
  return (
    <div className="absolute z-10 pointer-events-none" style={{ top: "16px", left: "50%", transform: "translateX(-50%)" }}>
      <div className="bg-neutral-900 px-6 py-2 rounded-2xl flex items-center justify-center gap-1 shadow-lg shadow-black/30">
        <span className="text-white font-bold text-xl">#{rank}</span>
        {label && <span className="text-white font-bold text-xl">{label}</span>}
      </div>
    </div>
  )
}

export function GenreRatingBadges({ genreName, voteAverage, containerW, containerH }: { genreName: string; voteAverage: number; containerW: number; containerH: number }) {
  return (
    <>
      <div className="absolute z-[8] pointer-events-none" style={{ bottom: 0, left: 0, right: 0, height: `${Math.round(containerH * 0.18)}px`, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 40%)" }} />
      <div className="absolute z-[11] pointer-events-none" style={{ bottom: "16px", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "#d4d4d4", fontFamily: "sans-serif" }}>{genreName}</span>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "#d4d4d4", fontFamily: "sans-serif" }}>•</span>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "#d4d4d4", fontFamily: "sans-serif" }}>★</span>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "#d4d4d4", fontFamily: "sans-serif" }}>{voteAverage.toFixed(1)}</span>
        </div>
      </div>
    </>
  )
}

export function ExtraBadge({ label }: { label: string }) {
  return (
    <div className="absolute z-10 pointer-events-none" style={{ top: "16px", left: "50%", transform: "translateX(-50%)" }}>
      <div className="bg-neutral-900 px-6 py-2 rounded-2xl flex items-center justify-center shadow-lg shadow-black/30">
        <span className="text-white font-bold text-xl">{label}</span>
      </div>
    </div>
  )
}
