"use client"

import { useEffect, useState } from "react"
import { posterUrl } from "@/lib/utils"

const GENRE_FALLBACK: Record<string, string> = {
  Action: '#D4A574', Azione: '#D4A574',
  Horror: '#8B0000', Horreur: '#8B0000',
  Comedy: '#F4D03F', Commedia: '#F4D03F', Comédie: '#F4D03F',
  Drama: '#5D6D7E', Dramma: '#5D6D7E', Drame: '#5D6D7E',
  Thriller: '#4A4A4A',
  Adventure: '#2E86AB', Avventura: '#2E86AB', Aventure: '#2E86AB',
  Animation: '#E67E22', Animazione: '#E67E22',
  'Science Fiction': '#3498DB', 'Science-Fiction': '#3498DB', Fantascienza: '#3498DB',
  Romance: '#E74C3C', Romantico: '#E74C3C',
  Documentary: '#7F8C8D', Documentario: '#7F8C8D',
  Mystery: '#6C3483', Mistero: '#6C3483',
  Fantasy: '#8E44AD', Fantasia: '#8E44AD',
  War: '#6B4226', Guerra: '#6B4226',
  Western: '#A0522D',
  Music: '#1ABC9C', Musica: '#1ABC9C',
  Family: '#2ECC71', Famiglia: '#2ECC71',
  History: '#A67B5B', Storico: '#A67B5B',
  Crime: '#2C3E50', Crimine: '#2C3E50',
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function bestTextColor(bgHex: string): string {
  const bgLum = relativeLuminance(bgHex)
  const whiteRatio = (1.0 + 0.05) / (bgLum + 0.05)
  if (whiteRatio >= 4.5) return "#fff"
  return "#1a1a1a"
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

function useDominantColor(posterPath: string | null | undefined, containerW: number, containerH: number): string {
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

      let maxSat = -1
      let mr = 0, mg = 0, mb = 0
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
          if (s > maxSat) {
            maxSat = s; mr = p[0]; mg = p[1]; mb = p[2]
          }
        }
      }

      if (maxSat >= 0) {
        let hex = `#${mr.toString(16).padStart(2, '0')}${mg.toString(16).padStart(2, '0')}${mb.toString(16).padStart(2, '0')}`
        const lum = relativeLuminance(hex)
        if (lum < 0.4) hex = adjustHex(hex, 0.2)
        else if (lum > 0.7) hex = adjustHex(hex, -0.15)
        setColor(hex)
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

const BASE = 24
const REF_W = 380

function badgeLayout(text: string, containerW: number) {
  const fontSize = Math.round(BASE * containerW / REF_W)
  const charW = fontSize * 0.58
  const textW = Math.round(text.length * charW)
  const px = Math.round(fontSize * 100 / 72) * 2
  const pt = Math.round(fontSize * 12 / 72)
  const pb = Math.round(fontSize * 56 / 72)
  const totalW = textW + px
  const svgH = fontSize + pt + pb
  const cornerR = Math.round(pb * 1.0)
  return { totalW, svgH, cornerR, fontSize }
}

const BadgePill = ({ children, totalW, svgH, cornerR, bgColor }: { children: React.ReactNode; totalW: number; svgH: number; cornerR: number; bgColor: string }) => {
  const safeBg = bgColor || "#333"
  const textColor = bestTextColor(safeBg)
  const borderColor = textColor === '#fff'
    ? 'rgba(255,255,255,0.25)'
    : 'rgba(0,0,0,0.10)'
  return (
    <div className="absolute z-10 pointer-events-none" style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: totalW, height: svgH, borderRadius: `0 0 ${cornerR}px ${cornerR}px`, overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", background: `${safeBg}d9`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", color: textColor, fontWeight: 800, fontSize: `${Math.round(24 * totalW / 380 * 1.5)}px`, letterSpacing: "-0.01em", boxShadow: "0 4px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)", borderTop: `1px solid ${borderColor}`, transition: "background-color 300ms ease, color 200ms ease" }}>
        {children}
      </div>
    </div>
  )
}

export function RankingBadge({ rank, containerW, containerH, color, posterPath, genreName }: { rank: number; containerW: number; containerH: number; color?: string; posterPath?: string | null; genreName?: string | null }) {
  const extracted = useDominantColor(!color ? posterPath : null, containerW, containerH)
  const genreFallback = genreName ? (GENRE_FALLBACK[genreName] || GENRE_FALLBACK[genreName.toLowerCase()] || '') : ''
  const bgColor = color || extracted || genreFallback || '#555'
  const fullText = `#${rank} Oggi`
  const { totalW, svgH, cornerR, fontSize } = badgeLayout(fullText, containerW)

  return (
    <>
      <TopGradient containerW={containerW} svgH={svgH} />
      <BadgePill totalW={totalW} svgH={svgH} cornerR={cornerR} bgColor={bgColor}>
        <span style={{ fontSize: `${fontSize}px` }}>{fullText}</span>
      </BadgePill>
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

export function ExtraBadge({ label, containerW, containerH, color, posterPath, genreName }: { label: string; containerW: number; containerH: number; color?: string; posterPath?: string | null; genreName?: string | null }) {
  const extracted = useDominantColor(!color ? posterPath : null, containerW, containerH)
  const genreFallback = genreName ? (GENRE_FALLBACK[genreName] || GENRE_FALLBACK[genreName.toLowerCase()] || '') : ''
  const bgColor = color || extracted || genreFallback || '#555'
  const { totalW, svgH, cornerR, fontSize } = badgeLayout(label, containerW)

  return (
    <>
      <TopGradient containerW={containerW} svgH={svgH} />
      <BadgePill totalW={totalW} svgH={svgH} cornerR={cornerR} bgColor={bgColor}>
        <span style={{ fontSize: `${fontSize}px` }}>{label}</span>
      </BadgePill>
    </>
  )
}
