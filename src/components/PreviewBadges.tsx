"use client"

import { useP } from "@/lib/context"
import { GENRE_FALLBACK } from "@/lib/badges"

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

export function GenreRatingBadges({ genreName, voteAverage, containerW = 380, containerH = 570, bottomOffset = 0, gradientHeight = 30, blurIntensity = 5, blurFade = 60, blurDarkness = 40, blurEnabled = true, badgeStyle = "shadow", accentColor = "#000000", releaseDate }: { genreName: string; voteAverage: number; containerW?: number; containerH?: number; bottomOffset?: number; gradientHeight?: number; blurIntensity?: number; blurFade?: number; blurDarkness?: number; blurEnabled?: boolean; badgeStyle?: string; accentColor?: string; releaseDate?: string | null }) {
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
  const isPillLike = badgeStyle === "pill" || badgeStyle === "colored"
  if (isPillLike) {
    const _pillPad = Math.round(finalFs * 0.35)
    if (dims.totalW + _pillPad * 3 > maxBadgeW) {
      finalFs = Math.max(maxBadgeW / (dims.totalW + _pillPad * 3) * finalFs, 10)
      dims = genreClientDims(finalFs)
    }
  }
  const fs = Math.round(finalFs)
  const gap = dims.gap
  const gap2 = dims.gap2
  const pillPad = Math.round(fs * 0.35)
  const pillR = Math.round(fs * 0.8)
  const isBarStyle = badgeStyle === "bar"
  const styleOffset = isPillLike ? -pillPad : 0
  const bottom = isBarStyle ? 0 : 20 * containerH / 570 + bottomOffset + styleOffset
  const minH = Math.round(100 * containerH / 1500)
  const opaquePct = Math.max(100 - blurFade, 0)
  const textShadow = badgeStyle === "outline"
    ? "1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9)"
    : badgeStyle === "shadow"
    ? "0 4px 6px rgba(0,0,0,0.5)"
    : "none"
  const textEls = (
    <>
      <span>{genreName}</span>
      <span style={{ opacity: 0.6 }}>&bull;</span>
      <span style={{ display: "flex", alignItems: "center", gap: `${gap2}px` }}>
        <span>★</span>
        <span>{voteStr}</span>
      </span>
      {yearStr && <><span style={{ opacity: 0.6 }}>&bull;</span><span>{yearStr}</span></>}
    </>
  )
  const hex = accentColor.replace("#", "")
  let ar = parseInt(hex.substring(0, 2), 16) || 0
  let ag = parseInt(hex.substring(2, 4), 16) || 0
  let ab = parseInt(hex.substring(4, 6), 16) || 0
  if (ar > 240 && ag > 240 && ab > 240) { ar = 85; ag = 85; ab = 85 }
  const genreFallback = GENRE_FALLBACK[genreName] || null
  if (genreFallback) {
    const fh = genreFallback.replace("#", "")
    ar = parseInt(fh.substring(0, 2), 16) || ar
    ag = parseInt(fh.substring(2, 4), 16) || ag
    ab = parseInt(fh.substring(4, 6), 16) || ab
  }
  return (
    <>
      {blurEnabled && <div className="absolute bottom-0 left-0 right-0" style={{
        height: `${gradientHeight}%`,
        minHeight: `${minH}px`,
        backdropFilter: `blur(${blurIntensity}px)`,
        WebkitBackdropFilter: `blur(${blurIntensity}px)`,
        backgroundColor: `rgba(0,0,0,${blurDarkness / 100})`,
        maskImage: `linear-gradient(to top, black 0%, black ${opaquePct}%, transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to top, black 0%, black ${opaquePct}%, transparent 100%)`,
        pointerEvents: "none",
      }} />}
      {badgeStyle === "bar" ? (
        <div className="absolute bottom-0 left-0 right-0 z-10" style={{
          height: `${fs + Math.round(fs * 0.5) * 2}px`,
          backgroundColor: "rgba(0,0,0,0.65)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          pointerEvents: "none",
        }}>
          <div className="w-full h-full flex justify-center items-center font-bold whitespace-nowrap" style={{
            fontSize: `${fs}px`,
            lineHeight: 1,
            color: "#e5e7eb",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: `${gap}px` }}>
              {textEls}
            </div>
          </div>
        </div>
      ) : (
      <div className="absolute w-full flex justify-center items-center z-10 font-bold whitespace-nowrap" style={{
        bottom: `${bottom}px`,
        pointerEvents: "none",
      }}>
        {badgeStyle === "pill" ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: `${gap}px`,
            padding: `${pillPad}px ${pillPad * 1.5}px`,
            borderRadius: `${pillR}px`,
          backgroundColor: "rgba(0,0,0,0.65)",
            fontSize: `${fs}px`,
            lineHeight: 1,
            color: "#e5e7eb",
          }}>{textEls}</div>
        ) : badgeStyle === "colored" ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: `${gap}px`,
            padding: `${pillPad}px ${pillPad * 1.5}px`,
            borderRadius: `${pillR}px`,
            backgroundColor: `rgba(${ar},${ag},${ab},0.8)`,
            fontSize: `${fs}px`,
            lineHeight: 1,
            color: "#e5e7eb",
          }}>{textEls}</div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: `${gap}px`,
            fontSize: `${fs}px`,
            lineHeight: 1,
            color: "#e5e7eb",
            textShadow,
          }}>{textEls}</div>
        )}
      </div>
      )}
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
