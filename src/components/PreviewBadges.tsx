"use client"

import { useP } from "@/lib/context"
import { textColorForBg } from "@/lib/accent-color"
import { genreBadgeSvgDims, buildGenreBarSvg, buildGenrePillSvg, buildGenreTextSvg, buildRankingBarSvg, buildRankingDefaultSvg, buildExtraBarSvg, buildExtraDefaultSvg } from "@/lib/badge-svg-shared"

const POSTER_W = 380
const RANKING_FS_BASE = 23
const GENRE_FS_BASE = 24

function RankingBadgeInline({ rank = "13", label: labelProp, topLight, containerW = 380, badgeStyle, accentColor }: { rank?: number | string; label?: string; topLight?: boolean; containerW?: number; badgeStyle?: string; accentColor?: string }) {
  const p = useP()
  const label = labelProp ?? p.t("ui.today") ?? "Oggi"
  const fullText = `#${rank} ${label}`
  const textLen = String(rank).length + label.length
  const maxBadgeW = containerW - 20
  let finalFs = RANKING_FS_BASE * containerW / POSTER_W
  if (finalFs * (textLen * 0.62 + 2.35) > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / (textLen * 0.62 + 2.35), 10)
  }
  const fs = Math.round(finalFs)

  const isBar = badgeStyle === "bar"
  const isColored = badgeStyle === "colored"
  const tlBg = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const tlFg = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || tlBg
  const fg = isColored ? textColorForBg(accentColor || "") : tlFg

  let result: { svg: string; w: number; h: number }
  if (isBar) {
    result = buildRankingBarSvg(fullText, containerW, fs, fg, bg)
  } else {
    result = buildRankingDefaultSvg(fullText, fs, fg, bg)
  }

  const posStyle: React.CSSProperties = isBar
    ? { position: "absolute", top: 0, left: 0, right: 0 }
    : { position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }

  return (
    <div style={{ ...posStyle, width: isBar ? undefined : result.w, height: result.h, pointerEvents: "none" }} className="animate-fade-scale-in" key={badgeStyle}>
      <div dangerouslySetInnerHTML={{ __html: result.svg }} style={{ width: result.w, height: result.h }} />
    </div>
  )
}

function GenreRatingBadgesInline({ genreName, voteAverage, containerW = 380, containerH = 570, bottomOffset = 0, gradientHeight = 30, blurIntensity = 5, blurFade = 60, blurDarkness = 40, blurEnabled = true, badgeStyle = "shadow", accentColor = "#000000", topLight, releaseDate }: { genreName: string; voteAverage: number; containerW?: number; containerH?: number; bottomOffset?: number; gradientHeight?: number; blurIntensity?: number; blurFade?: number; blurDarkness?: number; blurEnabled?: boolean; badgeStyle?: string; accentColor?: string; topLight?: boolean; releaseDate?: string | null }) {
  const voteStr = voteAverage.toFixed(1)
  const year = releaseDate?.slice(0, 4)
  const yearStr = year || ""
  const maxBadgeW = containerW - 20
  let finalFs = GENRE_FS_BASE * containerW / POSTER_W

  function clientDims(fs: number) {
    const d = genreBadgeSvgDims(fs, genreName, voteStr, yearStr)
    return { totalW: d.totalW }
  }
  let dims = clientDims(finalFs)
  if (dims.totalW > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / dims.totalW * finalFs, 10)
    dims = clientDims(finalFs)
  }
  if (badgeStyle === "pill" || badgeStyle === "colored") {
    const _pillPad = Math.round(finalFs * 0.35)
    if (dims.totalW + _pillPad * 3 > maxBadgeW) {
      finalFs = Math.max(maxBadgeW / (dims.totalW + _pillPad * 3) * finalFs, 10)
      dims = clientDims(finalFs)
    }
  }
  const fs = Math.round(finalFs)
  const barH = fs + Math.round(fs * 0.5) * 2
  const targetCenter = 30 * containerH / 570 + bottomOffset
  const badgeH = (badgeStyle === "pill" || badgeStyle === "colored") ? fs + Math.round(fs * 0.35) * 2 : Math.max(Math.round(fs * 1.6), 24)
  const bottom = badgeStyle === "bar" ? 0 : Math.round(targetCenter - badgeH / 2)
  const minH = Math.round(100 * containerH / 1500)
  const opaquePct = Math.max(100 - blurFade, 0)

  const isPillStyle = badgeStyle === "pill" || badgeStyle === "colored"
  const pillBg = badgeStyle === "colored"
    ? (accentColor !== "#555555" ? accentColor : "rgba(255,255,255,0.80)")
    : "rgba(255,255,255,0.80)"
  const pillFg = badgeStyle === "colored" ? textColorForBg(accentColor) : "rgba(0,0,0,0.80)"

  let badgeSvg: { svg: string; w: number; h: number } | null = null
  if (badgeStyle === "bar") {
    badgeSvg = buildGenreBarSvg(genreName, voteStr, yearStr, containerW, fs, "rgba(0,0,0,0.80)", !!topLight)
  } else if (isPillStyle) {
    badgeSvg = buildGenrePillSvg(genreName, voteStr, yearStr, fs, pillBg, pillFg)
  } else {
    const textColor = badgeStyle === "colored" ? textColorForBg(accentColor || "") : "#e5e7eb"
    badgeSvg = buildGenreTextSvg(genreName, voteStr, yearStr, fs, textColor, badgeStyle)
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
      {badgeSvg && badgeStyle === "bar" ? (
        <div key={badgeStyle} className="animate-fade-scale-in" style={{ animationDuration: "0.25s", position: "absolute", left: 0, right: 0, bottom: 0, height: `${barH}px`, pointerEvents: "none" }}>
          <div dangerouslySetInnerHTML={{ __html: badgeSvg.svg }} style={{ width: badgeSvg.w, height: badgeSvg.h }} />
        </div>
      ) : badgeSvg ? (
        <div key={badgeStyle} className="animate-fade-scale-in" style={{ animationDuration: "0.25s", position: "absolute", width: "100%", bottom: `${bottom}px`, display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10, pointerEvents: "none" }}>
          <div dangerouslySetInnerHTML={{ __html: badgeSvg.svg }} style={{ width: badgeSvg.w, height: badgeSvg.h }} />
        </div>
      ) : null}
    </>
  )
}

function ExtraBadgeInline({ label, topLight, containerW = 380, badgeStyle, accentColor }: { label: string; topLight?: boolean; containerW?: number; badgeStyle?: string; accentColor?: string }) {
  const base = RANKING_FS_BASE * containerW / POSTER_W
  const maxBadgeW = containerW - 20
  let finalFs = base
  if (finalFs * (label.length * 0.62 + 2.0) > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / (label.length * 0.62 + 2.0), 10)
  }
  const fs = Math.round(finalFs)

  const isBar = badgeStyle === "bar"
  const isColored = badgeStyle === "colored"
  const tlBg = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const tlFg = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || tlBg
  const fg = isColored ? textColorForBg(accentColor || "") : tlFg

  let result: { svg: string; w: number; h: number }
  if (isBar) {
    result = buildExtraBarSvg(label, containerW, fs, fg, bg)
  } else {
    result = buildExtraDefaultSvg(label, fs, fg, bg)
  }

  const posStyle: React.CSSProperties = isBar
    ? { position: "absolute", top: 0, left: 0, right: 0 }
    : { position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }

  return (
    <div style={{ ...posStyle, width: isBar ? undefined : result.w, height: result.h, pointerEvents: "none" }} className="animate-fade-scale-in" key={badgeStyle}>
      <div dangerouslySetInnerHTML={{ __html: result.svg }} style={{ width: result.w, height: result.h }} />
    </div>
  )
}

export { RankingBadgeInline as RankingBadge, GenreRatingBadgesInline as GenreRatingBadges, ExtraBadgeInline as ExtraBadge }
