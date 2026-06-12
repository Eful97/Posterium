"use client"

import { genreRatingSVG } from "@/lib/badges"

export function RankingBadge({ rank = "13", label = "Oggi" }: { rank?: number | string; label?: string }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-neutral-900/95 px-6 py-2 rounded-2xl">
      <span className="text-white text-2xl font-bold tracking-wide">
        #{rank} {label}
      </span>
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
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-neutral-900/95 px-6 py-2 rounded-2xl">
      <span className="text-white text-2xl font-bold tracking-wide">{label}</span>
    </div>
  )
}
