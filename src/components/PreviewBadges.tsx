"use client"

import { useEffect, useState } from "react"
import { genreRatingSVG, rankingBadgeSVG, extraBadgeSVG, GENRE_FALLBACK } from "@/lib/badges"
import { posterUrl } from "@/lib/utils"

function hexLuminanceRaw(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function adjustHex(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const nr = Math.max(0, Math.min(255, Math.round(r + (ratio > 0 ? (255 - r) : r) * Math.abs(ratio))))
  const ng = Math.max(0, Math.min(255, Math.round(g + (ratio > 0 ? (255 - g) : g) * Math.abs(ratio))))
  const nb = Math.max(0, Math.min(255, Math.round(b + (ratio > 0 ? (255 - b) : b) * Math.abs(ratio))))
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

function extractFromCanvas(containerW: number, containerH: number): { r: number; g: number; b: number } | null {
  const canvas = document.createElement("canvas")
  canvas.width = containerW
  canvas.height = containerH
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  let maxSat = -1, mr = 0, mg = 0, mb = 0
  const step = 4
  for (let y = 0; y < containerH; y += step) {
    for (let x = 0; x < containerW; x += step) {
      const p = ctx.getImageData(x, y, 1, 1).data
      const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const l = (max + min) / 2
      const d = max - min
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (s < 0.05 || l < 0.03 || l > 0.97) continue
      if (s > maxSat) { maxSat = s; mr = p[0]; mg = p[1]; mb = p[2] }
    }
  }
  if (maxSat < 0) return null
  return { r: mr, g: mg, b: mb }
}

function processRgb(r: number, g: number, b: number): string {
  let hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  const lum = hexLuminanceRaw(hex)
  if (lum < 0.4) hex = adjustHex(hex, 0.2)
  else if (lum > 0.7) hex = adjustHex(hex, -0.15)
  return hex
}

function useDominantColor(posterPath: string | null | undefined, containerW: number, containerH: number, logoPath?: string | null): string {
  const [color, setColor] = useState("")
  useEffect(() => {
    if (!posterPath) { setColor(""); return }
    const posterUrl_ = posterUrl(posterPath, "w500")
    const logoUrl_ = logoPath ? posterUrl(logoPath, "original") : null
    let cancelled = false

    const posterImg = new Image()
    posterImg.crossOrigin = "anonymous"
    posterImg.onload = () => {
      if (cancelled) return
      const canvas = document.createElement("canvas")
      canvas.width = containerW
      canvas.height = containerH
      const ctx = canvas.getContext("2d")
      if (!ctx) { setColor(""); return }
      ctx.drawImage(posterImg, 0, 0, containerW, containerH)

      if (!logoUrl_) {
        const r = extractFromCanvas(containerW, containerH)
        setColor(r ? processRgb(r.r, r.g, r.b) : "")
        return
      }

      const logoImg = new Image()
      logoImg.crossOrigin = "anonymous"
      logoImg.onload = () => {
        if (cancelled) return
        const logoW = Math.round(containerW * 0.4)
        const logoH = Math.round(logoW * logoImg.naturalHeight / logoImg.naturalWidth)
        const logoX = Math.round((containerW - logoW) / 2)
        const logoY = containerH - logoH - Math.round(containerH * 0.1)
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)
        const r = extractFromCanvas(containerW, containerH)
        setColor(r ? processRgb(r.r, r.g, r.b) : "")
      }
      logoImg.onerror = () => {
        if (!cancelled) { const r = extractFromCanvas(containerW, containerH); setColor(r ? processRgb(r.r, r.g, r.b) : "") }
      }
      logoImg.src = logoUrl_
    }
    posterImg.onerror = () => { if (!cancelled) setColor("") }
    posterImg.src = posterUrl_
    return () => { cancelled = true }
  }, [posterPath, containerW, containerH, logoPath])
  return color
}

function TopGradient({ containerW, svgH }: { containerW: number; svgH: number }) {
  const gradH = Math.max(Math.round(svgH * 1.5), Math.round(containerW * 0.06))
  return (
    <div className="absolute z-[8] pointer-events-none" style={{ top: 0, left: 0, right: 0, height: `${gradH}px`, background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }} />
  )
}

export function RankingBadge({ rank, containerW, containerH, color, posterPath, genreName, logoPath }: { rank: number; containerW: number; containerH: number; color?: string; posterPath?: string | null; genreName?: string | null; logoPath?: string | null }) {
  const extracted = useDominantColor(!color ? posterPath : null, containerW, containerH, !color ? logoPath : null)
  const genreFallback = genreName ? (GENRE_FALLBACK[genreName] || GENRE_FALLBACK[genreName.toLowerCase()] || '') : ''
  const badgeColor = color || extracted || genreFallback || '#555'
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
  const { svg, totalW, svgH } = genreRatingSVG(genreName, voteAverage, containerW)

  return (
    <>
      <div className="absolute z-[8] pointer-events-none" style={{ bottom: 0, left: 0, right: 0, height: `${Math.round(containerH * 0.18)}px`, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 40%)" }} />
      <div className="absolute z-[11] pointer-events-none" style={{ bottom: "16px", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ width: totalW, height: svgH }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </>
  )
}

export function ExtraBadge({ label, containerW, containerH, color, posterPath, genreName, logoPath }: { label: string; containerW: number; containerH: number; color?: string; posterPath?: string | null; genreName?: string | null; logoPath?: string | null }) {
  const extracted = useDominantColor(!color ? posterPath : null, containerW, containerH, !color ? logoPath : null)
  const genreFallback = genreName ? (GENRE_FALLBACK[genreName] || GENRE_FALLBACK[genreName.toLowerCase()] || '') : ''
  const badgeColor = color || extracted || genreFallback || '#555'
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
