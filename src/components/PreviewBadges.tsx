"use client"

import { rankingBadgeSVG, extraBadgeSVG } from "@/lib/badges"

function TopGradient({ containerW, svgH }: { containerW: number; svgH: number }) {
  const gradH = Math.max(Math.round(svgH * 1.5), Math.round(containerW * 0.06))
  return (
    <div className="absolute z-[8] pointer-events-none" style={{ top: 0, left: 0, right: 0, height: `${gradH}px`, background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }} />
  )
}

export function RankingBadge({ rank, containerW, containerH, color }: { rank: number; containerW: number; containerH: number; color?: string }) {
  const { svg, totalW, svgH, cornerR } = rankingBadgeSVG(rank, containerW, color)

  return (
    <>
      <TopGradient containerW={containerW} svgH={svgH} />
      <div className="absolute z-10 pointer-events-none" style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: totalW, height: svgH, borderRadius: `0 0 ${cornerR}px ${cornerR}px`, overflow: "hidden" }}>
        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  )
}

export function GenreRatingBadges({ genreName, voteAverage, containerW, containerH }: { genreName: string; voteAverage: number; containerW: number; containerH: number }) {
  return (
    <>
      <div className="absolute z-[8] pointer-events-none" style={{ bottom: 0, left: 0, right: 0, height: `${Math.round(containerH * 0.18)}px`, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 40%)" }} />
      <div className="absolute z-[11] pointer-events-none" style={{ bottom: "16px", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: "24px", fontWeight: 500, color: "#fff", marginRight: "8px" }}>{genreName}</span>
          <span style={{ fontSize: "19px", color: "rgba(255,255,255,0.6)", marginRight: "8px", lineHeight: 1 }}>•</span>
          <span style={{ fontSize: "22px", color: "#F5C518", marginRight: "6px", lineHeight: 1, display: "inline-flex", alignItems: "center" }}>★</span>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "#fff" }}>{voteAverage.toFixed(1)}</span>
        </div>
      </div>
    </>
  )
}

export function ExtraBadge({ label, containerW, containerH, color }: { label: string; containerW: number; containerH: number; color?: string }) {
  const { svg, totalW, svgH, cornerR } = extraBadgeSVG(label, containerW, color)

  return (
    <>
      <TopGradient containerW={containerW} svgH={svgH} />
      <div className="absolute z-10 pointer-events-none" style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: totalW, height: svgH, borderRadius: `0 0 ${cornerR}px ${cornerR}px`, overflow: "hidden" }}>
        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  )
}
