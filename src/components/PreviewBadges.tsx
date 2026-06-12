"use client"

import { genreRatingSVG, rankingBadgeSVG, extraBadgeSVG } from "@/lib/badges"

export function RankingBadge({ rank, containerW, containerH, color }: { rank: number; containerW: number; containerH: number; color?: string }) {
  const { svg, totalW, svgH } = rankingBadgeSVG(rank, containerW, color)
  const topOff = 0
  const r = Math.round(36 * containerW / 1000)

  return (
    <div className="absolute z-10 pointer-events-none" style={{ top: `${topOff}px`, left: "50%", transform: "translateX(-50%)", width: totalW, height: svgH, borderRadius: `0 0 ${r}px ${r}px` }}>
      <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}

export function GenreRatingBadges({ genreName, voteAverage, containerW, containerH }: { genreName: string; voteAverage: number; containerW: number; containerH: number }) {
  const { svg, totalW, svgH } = genreRatingSVG(genreName, voteAverage, containerW)
  const bottomOff = Math.round(containerH * 0.032)

  return (
    <>
      <div className="absolute z-[8] pointer-events-none" style={{ bottom: 0, left: 0, right: 0, height: `${Math.round(containerH * 0.18)}px`, background: "linear-gradient(to top, rgba(0,0,0,.50), transparent)" }} />
      <div className="absolute z-[11] pointer-events-none" style={{ bottom: `${bottomOff}px`, left: 0, right: 0, display: "flex", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ width: totalW, height: svgH }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </>
  )
}

export function ExtraBadge({ label, containerW, containerH, color }: { label: string; containerW: number; containerH: number; color?: string }) {
  const { svg, totalW, svgH } = extraBadgeSVG(label, containerW, color)
  const r = Math.round(36 * containerW / 1000)

  return (
    <div className="absolute z-10 pointer-events-none" style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: totalW, height: svgH, borderRadius: `0 0 ${r}px ${r}px` }}>
      <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
