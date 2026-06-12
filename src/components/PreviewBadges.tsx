"use client"

import { useEffect, useState } from "react"
import { genreRatingSVG, rankingBadgeSVG, extraBadgeSVG, GENRE_FALLBACK } from "@/lib/badges"
import { posterUrl } from "@/lib/utils"
import { findAccentColor, blendColors, AccentResult } from "@/lib/accent-color"

async function extractAccentColor(imageUrl: string, genre: string): Promise<AccentResult> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.crossOrigin = "anonymous"
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error("CORS/load"))
    i.src = imageUrl
  })

  const w = Math.min(img.naturalWidth, 342)
  const h = Math.round(w * img.naturalHeight / img.naturalWidth)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, w, h)
  const pixelData = ctx.getImageData(0, 0, w, h).data

  return findAccentColor(pixelData, w, h, genre)
}

function TopGradient({ containerW, svgH }: { containerW: number; svgH: number }) {
  const gradH = Math.max(Math.round(svgH * 1.5), Math.round(containerW * 0.06))
  return (
    <div className="absolute z-[8] pointer-events-none" style={{ top: 0, left: 0, right: 0, height: `${gradH}px`, background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }} />
  )
}

export function RankingBadge({ rank, containerW, containerH, color, posterPath, genreName, logoPath }: { rank: number; containerW: number; containerH: number; color?: string; posterPath?: string | null; genreName?: string | null; logoPath?: string | null }) {
  const [extracted, setExtracted] = useState("")
  const gn = genreName || ''
  useEffect(() => {
    const pp = !color ? posterPath : null
    const lp = !color ? logoPath : null
    if (!pp) { setExtracted(""); return }
    let cancelled = false
    const run = async () => {
      try {
        const sizes = ["w342", "w185", "original"]
        let poster: AccentResult | null = null
        for (const s of sizes) {
          if (cancelled) return
          try { poster = await extractAccentColor(posterUrl(pp, s), gn); break } catch {}
        }
        if (!poster) throw new Error()
        if (cancelled) return
        const ph = `#${poster.r.toString(16).padStart(2, '0')}${poster.g.toString(16).padStart(2, '0')}${poster.b.toString(16).padStart(2, '0')}`
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
      } catch { if (!cancelled) setExtracted("") }
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
  const [extracted, setExtracted] = useState("")
  const gn = genreName || ''
  useEffect(() => {
    const pp = !color ? posterPath : null
    const lp = !color ? logoPath : null
    if (!pp) { setExtracted(""); return }
    let cancelled = false
    const run = async () => {
      try {
        const sizes = ["w342", "w185", "original"]
        let poster: AccentResult | null = null
        for (const s of sizes) {
          if (cancelled) return
          try { poster = await extractAccentColor(posterUrl(pp, s), gn); break } catch {}
        }
        if (!poster) throw new Error()
        if (cancelled) return
        const ph = `#${poster.r.toString(16).padStart(2, '0')}${poster.g.toString(16).padStart(2, '0')}${poster.b.toString(16).padStart(2, '0')}`
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
      } catch { if (!cancelled) setExtracted("") }
    }
    run()
    return () => { cancelled = true }
  }, [posterPath, color, logoPath, gn])
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
