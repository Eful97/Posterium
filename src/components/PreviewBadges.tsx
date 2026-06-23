"use client"

import { useP } from "@/lib/context"

export function RankingBadge({ rank = "13", label: labelProp, topLight, containerW = 380 }: { rank?: number | string; label?: string; topLight?: boolean; containerW?: number }) {
  const p = useP()
  const label = labelProp ?? p.t("ui.today") ?? "Oggi"
  const base = 23 * containerW / 380
  const textLen = String(rank).length + label.length
  const maxBadgeW = containerW - 20
  let finalFs = base
  if (finalFs * (textLen * 0.58 + 2.35) > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / (textLen * 0.58 + 2.35), 10)
  }
  const fs = Math.round(finalFs)
  const px = Math.round(fs)
  const py = Math.round(fs * 0.5)
  const r = Math.round(fs * 0.7)
  const bg = topLight ? "bg-black/80" : "bg-white/80"
  const text = topLight ? "text-white/80" : "text-black/80"
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  return (
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${bg} font-semibold tracking-wide whitespace-nowrap`} style={{
      padding: `${py}px ${px}px`,
      borderBottomLeftRadius: `${r}px`,
      borderBottomRightRadius: `${r}px`,
      boxShadow: `0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)`,
      fontSize: `${fs}px`,
    }}>
      <span className={text}>#{rank} {label}</span>
    </div>
  )
}

export function GenreRatingBadges({ genreName, voteAverage, containerW = 380, containerH = 570, bottomOffset = 0, gradientColor = "#000000", gradientOpacity = 1, gradientHeight = 50, gradientFade = 0 }: { genreName: string; voteAverage: number; containerW?: number; containerH?: number; bottomOffset?: number; gradientColor?: string; gradientOpacity?: number; gradientHeight?: number; gradientFade?: number }) {
  const voteStr = voteAverage.toFixed(1)
  const base = 24 * containerW / 380
  const maxBadgeW = containerW - 20
  let finalFs = base
  if (finalFs * ((genreName.length + voteStr.length) * 0.58 + 2.43) > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / ((genreName.length + voteStr.length) * 0.58 + 2.43), 10)
  }
  const fs = Math.round(finalFs)
  const gap = Math.round(fs / 3)
  const gap2 = Math.round(fs / 6)
  const bottom = 20 * containerH / 570 + bottomOffset
  const minH = 100 * containerH / 570
  const hex = gradientColor.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16) || 0
  const g = parseInt(hex.substring(2, 4), 16) || 0
  const b = parseInt(hex.substring(4, 6), 16) || 0
  const gf = Math.min(gradientFade, 100)
  const fadeEnd = Math.min(gf + 20, 100)
  return (
    <>
      <div className="absolute bottom-0 left-0 right-0" style={{
        background: `linear-gradient(to top, rgba(${r},${g},${b},${gradientOpacity}) 0%, rgba(${r},${g},${b},${gradientOpacity}) ${gf}%, rgba(${r},${g},${b},0) ${fadeEnd}%, rgba(${r},${g},${b},0) 100%)`,
        height: `${gradientHeight}%`,
        minHeight: `${minH}px`,
        pointerEvents: "none",
      }} />
      <div className="absolute w-full flex justify-center items-center whitespace-nowrap z-10 font-bold" style={{
        bottom: `${bottom}px`,
        gap: `${gap}px`,
        fontSize: `${fs}px`,
        lineHeight: 1,
        color: "#e5e7eb",
        textShadow: "0 4px 6px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}>
        <span>{genreName}</span>
        <span style={{ opacity: 0.6 }}>&bull;</span>
        <span style={{ display: "flex", alignItems: "center", gap: `${gap2}px` }}>
          <span>★</span>
          <span>{voteStr}</span>
        </span>
      </div>
    </>
  )
}

export function ExtraBadge({ label, topLight, containerW = 380 }: { label: string; topLight?: boolean; containerW?: number }) {
  const base = 23 * containerW / 380
  const maxBadgeW = containerW - 20
  let finalFs = base
  if (finalFs * (label.length * 0.58 + 2.0) > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / (label.length * 0.58 + 2.0), 10)
  }
  const fs = Math.round(finalFs)
  const px = Math.round(fs)
  const py = Math.round(fs * 0.5)
  const r = Math.round(fs * 0.7)
  const bg = topLight ? "bg-black/80" : "bg-white/80"
  const text = topLight ? "text-white/80" : "text-black/80"
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  return (
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${bg} font-semibold tracking-wide whitespace-nowrap`} style={{
      padding: `${py}px ${px}px`,
      borderBottomLeftRadius: `${r}px`,
      borderBottomRightRadius: `${r}px`,
      boxShadow: `0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)`,
      fontSize: `${fs}px`,
    }}>
      <span className={text}>{label}</span>
    </div>
  )
}
