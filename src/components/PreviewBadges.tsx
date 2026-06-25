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

export function GenreRatingBadges({ genreName, voteAverage, containerW = 380, containerH = 570, bottomOffset = 0, gradientHeight = 30, blurIntensity = 20, blurFade = 30, blurDarkness = 40, releaseDate }: { genreName: string; voteAverage: number; containerW?: number; containerH?: number; bottomOffset?: number; gradientHeight?: number; blurIntensity?: number; blurFade?: number; blurDarkness?: number; releaseDate?: string | null }) {
  const voteStr = voteAverage.toFixed(1)
  const year = releaseDate?.slice(0, 4)
  const yearStr = year || ""
  const base = 24 * containerW / 380
  const maxBadgeW = containerW - 20
  let finalFs = base
  function genreClientDims(fs: number) {
    const gap = Math.round(fs / 3)
    const gap2 = Math.round(fs / 6)
    const bulletW = Math.round(fs * 0.35)
    const starW = Math.round(fs * 0.92)
    const genreW = Math.round(genreName.length * fs * 0.58)
    const voteW = Math.round(voteStr.length * fs * 0.58)
    const yearW = yearStr ? Math.round(yearStr.length * fs * 0.58) : 0
    const buf = Math.round(fs * 0.25)
    const totalW = genreW + gap + bulletW + gap + starW + gap2 + voteW + (yearStr ? gap + bulletW + gap + yearW : 0) + buf
    return { totalW, gap, gap2 }
  }
  let dims = genreClientDims(finalFs)
  if (dims.totalW > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / dims.totalW * finalFs, 10)
    dims = genreClientDims(finalFs)
  }
  const fs = Math.round(finalFs)
  const gap = dims.gap
  const gap2 = dims.gap2
  const bottom = 20 * containerH / 570 + bottomOffset
  const minH = Math.round(100 * containerH / 1500)
  const opaquePct = Math.max(100 - blurFade, 0)
  return (
    <>
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: `${gradientHeight}%`,
        minHeight: `${minH}px`,
        backdropFilter: `blur(${blurIntensity}px)`,
        WebkitBackdropFilter: `blur(${blurIntensity}px)`,
        backgroundColor: `rgba(0,0,0,${blurDarkness / 100})`,
        maskImage: `linear-gradient(to top, black 0%, black ${opaquePct}%, transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to top, black 0%, black ${opaquePct}%, transparent 100%)`,
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
        {yearStr && <><span style={{ opacity: 0.6 }}>&bull;</span><span>{yearStr}</span></>}
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
