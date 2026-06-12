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

interface AccentResult { r: number; g: number; b: number; hsl: [number, number, number]; v: number; s: number; fb: boolean }

async function extractAccentColor(imageUrl: string, genre: string): Promise<AccentResult> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.crossOrigin = "anonymous"
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error("CORS/load"))
    i.src = imageUrl
  })

  const MAX_W = 342
  const w = Math.min(img.naturalWidth, MAX_W)
  const h = Math.round(w * img.naturalHeight / img.naturalWidth)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, w, h)

  const pixels: { r: number; g: number; b: number; h: number; s: number; l: number }[] = []
  const step = 2
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const p = ctx.getImageData(x, y, 1, 1).data
      const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const l = (max + min) / 2
      const d = max - min
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (s < 0.05 || l < 0.03 || l > 0.97) continue

      let hue = 0
      if (d !== 0) {
        if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6
        else if (max === g) hue = ((b - r) / d + 2) / 6
        else hue = ((r - g) / d + 4) / 6
      }
      pixels.push({ r: p[0], g: p[1], b: p[2], h: hue, s, l })
    }
  }

  // Fallback
  if (pixels.length === 0) {
    const fb = GENRE_FALLBACK[genre] || GENRE_FALLBACK[Object.keys(GENRE_FALLBACK)[0]] || '#C0C0C0'
    return { r: parseInt(fb.slice(1,3),16), g: parseInt(fb.slice(3,5),16), b: parseInt(fb.slice(5,7),16), hsl: [0, 0, 0.5], v: 0, s: 0, fb: true }
  }

  // bgMean of valid pixels
  const n = pixels.length
  const bgMean = { r: pixels.reduce((a, p) => a + p.r, 0) / n, g: pixels.reduce((a, p) => a + p.g, 0) / n, b: pixels.reduce((a, p) => a + p.b, 0) / n }

  let bestScore = -1, best = pixels[0]
  for (const p of pixels) {
    const chroma = p.s * (1 - Math.abs(p.l - 0.5))
    const dr = p.r - bgMean.r, dg = p.g - bgMean.g, db = p.b - bgMean.b
    const divergence = Math.sqrt(dr * dr + dg * dg + db * db) / 441.67
    const score = chroma * divergence
    if (score > bestScore) { bestScore = score; best = p }
  }

  // Lightness clamp
  const clampLum = 0.2126 * best.r / 255 + 0.7152 * best.g / 255 + 0.0722 * best.b / 255
  let cr = best.r, cg = best.g, cb = best.b
  if (clampLum < 0.4) {
    const ratio = 0.2
    cr = Math.round(cr + (255 - cr) * ratio)
    cg = Math.round(cg + (255 - cg) * ratio)
    cb = Math.round(cb + (255 - cb) * ratio)
  } else if (clampLum > 0.7) {
    const ratio = -0.15
    cr = Math.round(cr + cr * ratio)
    cg = Math.round(cg + cg * ratio)
    cb = Math.round(cb + cb * ratio)
  }
  cr = Math.max(0, Math.min(255, cr))
  cg = Math.max(0, Math.min(255, cg))
  cb = Math.max(0, Math.min(255, cb))

  return { r: cr, g: cg, b: cb, hsl: [best.h, best.s, best.l], v: n, s: bestScore, fb: false }
}

function useAccentColor(posterPath: string | null | undefined, genre: string, logoPath?: string | null): string {
  const [hex, setHex] = useState("")
  useEffect(() => {
    if (!posterPath) { setHex(""); return }
    const posterUrl_ = posterUrl(posterPath, "w342")
    const logoUrl_ = logoPath ? posterUrl(logoPath, "original") : null
    let cancelled = false

    const run = async () => {
      try {
        const poster = await extractAccentColor(posterUrl_, genre)
        if (cancelled) return
        const posterHex = `#${poster.r.toString(16).padStart(2, '0')}${poster.g.toString(16).padStart(2, '0')}${poster.b.toString(16).padStart(2, '0')}`
        if (!logoUrl_) { setHex(posterHex); return }
        let logo: AccentResult | null = null
        try { logo = await extractAccentColor(logoUrl_, genre) } catch {}
        if (cancelled) return
        if (logo) {
          const r = Math.round((poster.r + logo.r) / 2)
          const g = Math.round((poster.g + logo.g) / 2)
          const b = Math.round((poster.b + logo.b) / 2)
          setHex(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`)
        } else {
          setHex(posterHex)
        }
      } catch { if (!cancelled) setHex("") }
    }
    run()
    return () => { cancelled = true }
  }, [posterPath, genre, logoPath])
  return hex
}

function TopGradient({ containerW, svgH }: { containerW: number; svgH: number }) {
  const gradH = Math.max(Math.round(svgH * 1.5), Math.round(containerW * 0.06))
  return (
    <div className="absolute z-[8] pointer-events-none" style={{ top: 0, left: 0, right: 0, height: `${gradH}px`, background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }} />
  )
}

export function RankingBadge({ rank, containerW, containerH, color, posterPath, genreName, logoPath }: { rank: number; containerW: number; containerH: number; color?: string; posterPath?: string | null; genreName?: string | null; logoPath?: string | null }) {
  const [extracted, setExtracted] = useState("")
  const [dbg, setDbg] = useState("")
  const gn = genreName || ''
  useEffect(() => {
    const pp = !color ? posterPath : null
    const lp = !color ? logoPath : null
    if (!pp) { setExtracted(""); setDbg("no poster"); return }
    let cancelled = false
    const run = async () => {
      try {
        const poster = await extractAccentColor(posterUrl(pp, "w342"), gn)
        if (cancelled) return
        const ph = `#${poster.r.toString(16).padStart(2, '0')}${poster.g.toString(16).padStart(2, '0')}${poster.b.toString(16).padStart(2, '0')}`
        setDbg(`px=${poster.v} sc=${poster.s.toFixed(3)}${poster.fb?' FALLBACK':''}`)
        if (!lp) { setExtracted(ph); return }
        let logo: AccentResult | null = null
        try { logo = await extractAccentColor(posterUrl(lp, "original"), gn) } catch {}
        if (cancelled) return
        if (logo) {
          const r = Math.round((poster.r + logo.r) / 2)
          const g = Math.round((poster.g + logo.g) / 2)
          const b = Math.round((poster.b + logo.b) / 2)
          setExtracted(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`)
        } else { setExtracted(ph) }
      } catch { if (!cancelled) { setExtracted(""); setDbg("error") } }
    }
    run()
    return () => { cancelled = true }
  }, [posterPath, color, logoPath, gn])
  const genreFallback = genreName ? (GENRE_FALLBACK[genreName] || GENRE_FALLBACK[genreName.toLowerCase()] || '') : ''
  const badgeColor = color || extracted || genreFallback || '#555'
  const { svg, totalW, svgH, cornerR } = rankingBadgeSVG(rank, containerW, badgeColor)

  return (
    <>
      <TopGradient containerW={containerW} svgH={svgH} />
      <div className="absolute z-10 pointer-events-none" style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: totalW, height: svgH, borderRadius: `0 0 ${cornerR}px ${cornerR}px`, overflow: "hidden" }}>
        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="absolute z-20" style={{ top: `${svgH}px`, left: "50%", transform: "translateX(-50%)", fontSize: "9px", color: "#888", background: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: "4px", whiteSpace: "nowrap" }}>
        {badgeColor} {dbg}
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
  const extracted = useAccentColor(!color ? posterPath : null, genreName || '', !color ? logoPath : null)
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
