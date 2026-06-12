"use client"

import { useEffect, useState } from "react"
import { rankingBadgeSVG, extraBadgeSVG } from "@/lib/badges"
import { posterUrl } from "@/lib/utils"

function usePosterColor(posterPath: string | null | undefined, containerW: number, containerH: number): string {
  const [color, setColor] = useState("")
  useEffect(() => {
    if (!posterPath) { setColor(""); return }
    const url = posterUrl(posterPath, "w500")
    const img = new Image()
    img.crossOrigin = "anonymous"
    let cancelled = false
    img.onload = () => {
      if (cancelled) return
      const canvas = document.createElement("canvas")
      canvas.width = containerW
      canvas.height = containerH
      const ctx = canvas.getContext("2d")
      if (!ctx) { setColor(""); return }
      ctx.drawImage(img, 0, 0, containerW, containerH)

      let r = 0, g = 0, b = 0, n = 0
      const step = 4
      for (let y = 0; y < containerH; y += step) {
        for (let x = 0; x < containerW; x += step) {
          const pixel = ctx.getImageData(x, y, 1, 1).data
          r += pixel[0]; g += pixel[1]; b += pixel[2]; n++
        }
      }
      if (n > 0) {
        const rr = Math.round(r / n); const gg = Math.round(g / n); const bb = Math.round(b / n)
        setColor(`#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`)
      }
    }
    img.onerror = () => { if (!cancelled) setColor("") }
    img.src = url
    return () => { cancelled = true }
  }, [posterPath, containerW, containerH])
  return color
}

function TopGradient({ containerW, svgH }: { containerW: number; svgH: number }) {
  const gradH = Math.max(Math.round(svgH * 1.5), Math.round(containerW * 0.06))
  return (
    <div className="absolute z-[8] pointer-events-none" style={{ top: 0, left: 0, right: 0, height: `${gradH}px`, background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }} />
  )
}

export function RankingBadge({ rank, containerW, containerH, color, posterPath }: { rank: number; containerW: number; containerH: number; color?: string; posterPath?: string | null }) {
  const avgColor = usePosterColor(!color ? posterPath : null, containerW, containerH)
  const badgeColor = color || avgColor
  const { svg, totalW, svgH, cornerR } = rankingBadgeSVG(rank, containerW, badgeColor)

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

export function ExtraBadge({ label, containerW, containerH, color, posterPath }: { label: string; containerW: number; containerH: number; color?: string; posterPath?: string | null }) {
  const avgColor = usePosterColor(!color ? posterPath : null, containerW, containerH)
  const badgeColor = color || avgColor
  const { svg, totalW, svgH, cornerR } = extraBadgeSVG(label, containerW, badgeColor)

  return (
    <>
      <TopGradient containerW={containerW} svgH={svgH} />
      <div className="absolute z-10 pointer-events-none" style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: totalW, height: svgH, borderRadius: `0 0 ${cornerR}px ${cornerR}px`, overflow: "hidden" }}>
        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  )
}
