"use client"

import { useP } from "@/lib/context"
import { textColorForBg } from "@/lib/accent-color"

export function RankingBadge({ rank = "13", label: labelProp, topLight, containerW = 380, badgeStyle, accentColor }: { rank?: number | string; label?: string; topLight?: boolean; containerW?: number; badgeStyle?: string; accentColor?: string }) {
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
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const tlBg = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const tlFg = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"
  const content = `#${rank} ${label}`

  const isBar = badgeStyle === "bar" || badgeStyle === "glass"
  const isColored = badgeStyle === "colored"
  const px = Math.round(fs)
  const bpy = isBar ? Math.round(fs * 0.35) : Math.round(fs * 0.5)
  const r = Math.round(fs * 0.7)
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const badge = (
    <div className={isBar
      ? "absolute top-0 left-0 right-0 font-semibold tracking-wide whitespace-nowrap text-center"
      : "absolute top-0 left-1/2 -translate-x-1/2 font-semibold tracking-wide whitespace-nowrap"} style={{
        padding: `${bpy}px ${px}px`,
        fontSize: `${fs}px`,
        lineHeight: 1,
        backgroundColor: coloredBg || (badgeStyle === "glass" ? "rgba(255,255,255,0.15)" : tlBg),
        backdropFilter: badgeStyle === "glass" ? "blur(12px)" : undefined,
        WebkitBackdropFilter: badgeStyle === "glass" ? "blur(12px)" : undefined,
        border: badgeStyle === "glass" ? "1px solid rgba(255,255,255,0.20)" : undefined,
        color: isColored ? textColorForBg(accentColor || "") : (badgeStyle === "glass" ? "#e5e7eb" : tlFg),
        borderBottomLeftRadius: `${r}px`,
        borderBottomRightRadius: `${r}px`,
        boxShadow: `0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)`,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>{content}</div>
  )
  if (isBar && badgeStyle === "glass") {
    return (
      <div className="absolute top-0 left-0 right-0" style={{ height: `${bpy * 2 + fs}px`, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.35)", borderBottomLeftRadius: `${r}px`, borderBottomRightRadius: `${r}px` }} />
        {badge}
      </div>
    )
  }
  return badge
}

export function GenreRatingBadges({ genreName, voteAverage, containerW = 380, containerH = 570, bottomOffset = 0, gradientHeight = 30, blurIntensity = 5, blurFade = 60, blurDarkness = 40, blurEnabled = true, badgeStyle = "shadow", accentColor = "#000000", topLight, releaseDate, rankingBadgeStyle }: { genreName: string; voteAverage: number; containerW?: number; containerH?: number; bottomOffset?: number; gradientHeight?: number; blurIntensity?: number; blurFade?: number; blurDarkness?: number; blurEnabled?: boolean; badgeStyle?: string; accentColor?: string; topLight?: boolean; releaseDate?: string | null; rankingBadgeStyle?: string }) {
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
  const isPillLike = badgeStyle === "pill"
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
  const isPillStyle = badgeStyle === "pill"
  const barH = fs + Math.round(fs * 0.5) * 2
  const targetCenter = 30 * containerH / 570 + bottomOffset
  const barVisualH = barH
  const barShadowOff = Math.max(Math.round(barVisualH * 0.2), 3)
  const barShadowBlur = Math.max(Math.round(barVisualH * 0.5), 8)
  const badgeH = isPillStyle ? fs + Math.round(fs * 0.35) * 2 : Math.max(Math.round(fs * 1.6), 24)
  const bottom = isBarStyle ? 0 : Math.round(targetCenter - badgeH / 2)
  const minH = Math.round(100 * containerH / 1500)
  const opaquePct = Math.max(100 - blurFade, 0)
  const textShadow = badgeStyle === "outline"
    ? "1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9)"
    : badgeStyle === "shadow"
    ? "0 5px 8px rgba(0,0,0,0.6)"
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
      {badgeStyle === "bar" || badgeStyle === "glass" ? (
        <div key={badgeStyle} className="animate-fade-scale-in" style={{ animationDuration: "0.25s", position: "absolute", left: 0, right: 0, bottom: 0, height: `${barVisualH}px`, pointerEvents: "none" }}>
          {badgeStyle === "glass" && <div style={{
            position: "absolute", inset: 0,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            backgroundColor: "rgba(0,0,0,0.35)",
            borderRadius: `${Math.round(fs * 0.7)}px ${Math.round(fs * 0.7)}px 0 0`,
          }} />}
          <div style={{
            height: "100%",
            backgroundColor: badgeStyle === "glass" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.80)",
            backdropFilter: badgeStyle === "glass" ? "blur(12px)" : undefined,
            WebkitBackdropFilter: badgeStyle === "glass" ? "blur(12px)" : undefined,
            borderTop: badgeStyle === "glass" ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(0,0,0,0.10)",
            borderRadius: `${Math.round(fs * 0.7)}px ${Math.round(fs * 0.7)}px 0 0`,
            boxShadow: `0 -${barShadowOff}px ${barShadowBlur}px rgba(0,0,0,0.3)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}>
            <div className="font-bold whitespace-nowrap" style={{
              fontSize: `${fs}px`,
              lineHeight: 1,
              color: badgeStyle === "glass" ? "#e5e7eb" : "rgba(0,0,0,0.80)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: `${gap}px` }}>
                {textEls}
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div key={badgeStyle} className="animate-fade-scale-in" style={{ animationDuration: "0.25s", position: "absolute", width: "100%", bottom: `${bottom}px`, display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10, pointerEvents: "none" }}>
        {badgeStyle === "pill" || badgeStyle === "colored" ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: `${gap}px`,
            padding: `${pillPad}px ${pillPad * 1.5}px`,
            borderRadius: `${pillR}px`,
            backgroundColor: badgeStyle === "colored" ? (accentColor !== "#555555" ? accentColor : "rgba(255,255,255,0.80)") : "rgba(255,255,255,0.80)",
            fontSize: `${fs}px`,
            fontWeight: 700,
            lineHeight: 1,
            color: badgeStyle === "colored" ? textColorForBg(accentColor) : "rgba(0,0,0,0.80)",
          }}>{textEls}</div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: `${gap}px`,
            height: `${badgeH}px`,
            fontSize: `${fs}px`,
            fontWeight: 700,
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

export function ExtraBadge({ label, topLight, containerW = 380, badgeStyle, accentColor }: { label: string; topLight?: boolean; containerW?: number; badgeStyle?: string; accentColor?: string }) {
  const base = 23 * containerW / 380
  const maxBadgeW = containerW - 20
  let finalFs = base
  if (finalFs * (label.length * 0.58 + 2.0) > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / (label.length * 0.58 + 2.0), 10)
  }
  const fs = Math.round(finalFs)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const tlBg = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const tlFg = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"

  const isBar = badgeStyle === "bar" || badgeStyle === "glass"
  const isColored = badgeStyle === "colored"
  const bpy = isBar ? Math.round(fs * 0.35) : Math.round(fs * 0.5)
  const px = Math.round(fs)
  const r = Math.round(fs * 0.7)
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const badge = (
    <div className={isBar
      ? "absolute top-0 left-0 right-0 font-semibold tracking-wide whitespace-nowrap text-center"
      : "absolute top-0 left-1/2 -translate-x-1/2 font-semibold tracking-wide whitespace-nowrap"} style={{
        padding: `${bpy}px ${px}px`,
        fontSize: `${fs}px`,
        lineHeight: 1,
        backgroundColor: coloredBg || (badgeStyle === "glass" ? "rgba(255,255,255,0.15)" : tlBg),
        backdropFilter: badgeStyle === "glass" ? "blur(12px)" : undefined,
        WebkitBackdropFilter: badgeStyle === "glass" ? "blur(12px)" : undefined,
        border: badgeStyle === "glass" ? "1px solid rgba(255,255,255,0.20)" : undefined,
        color: isColored ? textColorForBg(accentColor || "") : (badgeStyle === "glass" ? "#e5e7eb" : tlFg),
        borderBottomLeftRadius: `${r}px`,
        borderBottomRightRadius: `${r}px`,
        boxShadow: `0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)`,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>{label}</div>
  )
  if (isBar && badgeStyle === "glass") {
    return (
      <div className="absolute top-0 left-0 right-0" style={{ height: `${bpy * 2 + fs}px`, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.35)", borderBottomLeftRadius: `${r}px`, borderBottomRightRadius: `${r}px` }} />
        {badge}
      </div>
    )
  }
  return badge
}
