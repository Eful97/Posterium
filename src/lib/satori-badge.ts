import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import React from "react"
import fs from "fs"
import path from "path"
import { textColorForBg } from "./accent-color"

let _regular: Buffer | null = null
let _bold: Buffer | null = null
let _symbols: Buffer | null = null

const N = (s: string) => path.join(process.cwd(), "node_modules", "@fontsource", s)

function fontRegular(): Buffer {
  if (!_regular) _regular = fs.readFileSync(N("inter/files/inter-latin-400-normal.woff"))
  return _regular
}

function fontBold(): Buffer {
  if (!_bold) _bold = fs.readFileSync(N("inter/files/inter-latin-700-normal.woff"))
  return _bold
}

function fontSymbols(): Buffer {
  if (!_symbols) _symbols = fs.readFileSync(N("noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff"))
  return _symbols
}

function fonts() {
  return [
    { name: "Inter", data: fontRegular(), weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: fontBold(), weight: 700 as const, style: "normal" as const },
    { name: "Noto Sans Symbols 2", data: fontSymbols(), weight: 400 as const, style: "normal" as const },
  ]
}

async function render(el: ReturnType<typeof React.createElement>, w: number, h: number): Promise<Buffer> {
  const svg = await satori(el, { width: w, height: h, fonts: fonts() })
  const b64 = (buf: Buffer) => buf.toString("base64")
  const style = `<style>@font-face{font-family:'Inter';src:url(data:application/font-woff;base64,${b64(fontRegular())});font-weight:400;font-style:normal}@font-face{font-family:'Inter';src:url(data:application/font-woff;base64,${b64(fontBold())});font-weight:700;font-style:normal}@font-face{font-family:'Noto Sans Symbols 2';src:url(data:application/font-woff;base64,${b64(fontSymbols())});font-weight:400;font-style:normal}</style>`
  const styledSvg = svg.replace(">", `>${style}`)
  return Buffer.from(new Resvg(styledSvg).render().asPng())
}

export async function renderRankingBadge(
  rank: number,
  pw: number,
  label?: string,
  topLight?: boolean,
  badgeStyle?: string,
  accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number }> {
  const periodText = label || "Oggi"
  const fullText = `#${rank} ${periodText}`
  const textLen = String(rank).length + periodText.length
  let finalFontSize = Math.round(23 * pw / 380)
  const maxBadgeW = pw - 20
  if (finalFontSize * (textLen * 0.58 + 3.55) > maxBadgeW) {
    finalFontSize = Math.round(maxBadgeW / (textLen * 0.58 + 3.55))
  }
  finalFontSize = Math.max(finalFontSize, 10)

  const displayFs = finalFontSize
  const px = Math.round(displayFs * 1.0)
  const isBar = badgeStyle === "bar" || badgeStyle === "glass"
  const isColored = badgeStyle === "colored"
  const pt = isBar ? Math.round(displayFs * 0.25) : Math.round(displayFs * 0.5)
  const pb = pt
  const textW = Math.round(String(rank).length * displayFs * 0.58 + displayFs * 0.35 + periodText.length * displayFs * 0.58)
  const totalW = textW + px * 2
  const svgH = displayFs + pt + pb
  const r = Math.round(displayFs * 0.7)
  const glassBg = "rgba(255,255,255,0.15)"
  const glassFg = "#e5e7eb"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (badgeStyle === "glass" ? glassBg : (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"))
  const fg = isColored ? textColorForBg(accentColor || "") : (badgeStyle === "glass" ? glassFg : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"))
  const shadowBlur = Math.round(displayFs * 0.6)
  const shadowOff = Math.round(displayFs * 0.2)

  const textEl = React.createElement("span", {
    style: {
      color: fg,
      fontSize: `${displayFs}px`,
      fontFamily: "Inter",
      fontWeight: 700,
      letterSpacing: "0.025em",
      lineHeight: 1,
    },
  }, fullText)

  if (isBar) {
    const barContent = React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: `${pw}px`,
        height: `${svgH}px`,
        backgroundColor: bg,
        border: badgeStyle === "glass" ? "1px solid rgba(255,255,255,0.20)" : undefined,
        borderRadius: `0 0 ${r}px ${r}px`,
        boxShadow: `0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)`,
      },
    }, textEl)
    if (badgeStyle === "glass") {
      const png = await render(barContent, pw, svgH)
      return { png, w: pw, h: svgH }
    }
    const png = await render(barContent, pw, svgH)
    return { png, w: pw, h: svgH }
  }

  // default
  const el = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "center",
        paddingLeft: `${shadowBlur}px`,
        paddingRight: `${shadowBlur}px`,
        paddingBottom: `${shadowOff + shadowBlur}px`,
      },
    },
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${totalW}px`,
        height: `${svgH}px`,
        backgroundColor: bg,
        borderBottomLeftRadius: `${r}px`,
        borderBottomRightRadius: `${r}px`,
        boxShadow: `0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)`,
      },
    }, textEl),
  )

  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur
  const png = await render(el, renderW, renderH)
  return { png, w: renderW, h: renderH }
}

export async function renderExtraBadge(
  label: string,
  pw: number,
  topLight?: boolean,
  badgeStyle?: string,
  accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number }> {
  let finalFontSize = Math.round(23 * pw / 380)
  const maxBadgeW = pw - 20
  if (finalFontSize * (label.length * 0.58 + 3.2) > maxBadgeW) {
    finalFontSize = Math.round(maxBadgeW / (label.length * 0.58 + 3.2))
  }
  finalFontSize = Math.max(finalFontSize, 10)

  const displayFs = finalFontSize
  const px = Math.round(displayFs * 1.0)
  const isBar = badgeStyle === "bar" || badgeStyle === "glass"
  const isColored = badgeStyle === "colored"
  const pt = isBar ? Math.round(displayFs * 0.25) : Math.round(displayFs * 0.5)
  const pb = pt
  const textW = Math.max(Math.round(label.length * displayFs * 0.58), displayFs)
  const totalW = textW + px * 2
  const svgH = displayFs + pt + pb
  const r = Math.round(displayFs * 0.7)
  const glassBg = "rgba(255,255,255,0.15)"
  const glassFg = "#e5e7eb"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (badgeStyle === "glass" ? glassBg : (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"))
  const fg = isColored ? textColorForBg(accentColor || "") : (badgeStyle === "glass" ? glassFg : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"))
  const shadowBlur = Math.round(displayFs * 0.6)
  const shadowOff = Math.round(displayFs * 0.2)

  if (isBar) {
    const barContent = React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: `${pw}px`,
        height: `${svgH}px`,
        backgroundColor: bg,
        border: badgeStyle === "glass" ? "1px solid rgba(255,255,255,0.20)" : undefined,
        borderRadius: `0 0 ${r}px ${r}px`,
        boxShadow: `0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)`,
      },
    },
      React.createElement("span", {
        style: {
          color: fg,
          fontSize: `${displayFs}px`,
          fontFamily: "Inter",
          fontWeight: 700,
          letterSpacing: "0.025em",
          lineHeight: 1,
        },
      }, label)
    )
    if (badgeStyle === "glass") {
      const png = await render(barContent, pw, svgH)
      return { png, w: pw, h: svgH }
    }
    const png = await render(barContent, pw, svgH)
    return { png, w: pw, h: svgH }
  }

  // default
  const el = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "center",
        paddingLeft: `${shadowBlur}px`,
        paddingRight: `${shadowBlur}px`,
        paddingBottom: `${shadowOff + shadowBlur}px`,
      },
    },
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${totalW}px`,
        height: `${svgH}px`,
        backgroundColor: bg,
        borderBottomLeftRadius: `${r}px`,
        borderBottomRightRadius: `${r}px`,
        boxShadow: `0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)`,
      },
    },
      React.createElement("span", {
        style: {
          color: fg,
          fontSize: `${displayFs}px`,
          fontFamily: "Inter",
          fontWeight: 700,
          letterSpacing: "0.025em",
          lineHeight: 1,
        },
      }, label)
    ),
  )

  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur
  const png = await render(el, renderW, renderH)
  return { png, w: renderW, h: renderH }
}

function genreBadgeDims(fs: number, genreName: string, voteStr: string, yearStr: string) {
  const gap = Math.round(fs * 0.33)
  const gapStar = Math.round(fs * 0.17)
  const pad = Math.round(fs * 0.35)
  const bulletW = Math.round(fs * 0.35)
  const starW = Math.round(fs * 0.92)
  const genreW = Math.round(genreName.length * fs * 0.58)
  const voteW = Math.round(voteStr.length * fs * 0.58)
  const yearW = yearStr ? Math.round(yearStr.length * fs * 0.58) : 0
  const buf = Math.round(fs * 0.25)
  const totalW = genreW + gap + bulletW + gap + starW + gapStar + voteW + (yearStr ? gap + bulletW + gap + yearW : 0) + pad * 2 + buf
  const svgH = Math.max(Math.round(fs * 1.6), 24)
  return { starW, gap, gapStar, pad, totalW, svgH }
}

export async function renderGenreBadge(
  genreName: string,
  voteAverage: number,
  pw: number,
  year?: string,
  style?: string,
  accentColor?: string,
  barHeight?: number,
  topLight?: boolean,
): Promise<{ png: Buffer; w: number; h: number }> {
  const voteStr = voteAverage.toFixed(1)
  const yearStr = year || ""
  let finalFontSize = Math.round(24 * pw / 380)
  const maxBadgeW = pw - 20
  let dims = genreBadgeDims(finalFontSize, genreName, voteStr, yearStr)
  if (dims.totalW > maxBadgeW) {
    const ratio = maxBadgeW / dims.totalW
    finalFontSize = Math.max(Math.round(finalFontSize * ratio), 10)
    dims = genreBadgeDims(finalFontSize, genreName, voteStr, yearStr)
  }
  const s = style || "shadow"
  const pillPad = Math.round(finalFontSize * 0.35)
  const pillR = Math.round(finalFontSize * 0.8)
  const isPillStyle = s === "pill" || s === "colored"
  const isBarStyle = s === "bar"
  const pillExtra = isPillStyle ? pillPad * 3 - dims.pad * 2 : 0
  if (isPillStyle && dims.totalW + pillExtra > maxBadgeW) {
    const ratio = maxBadgeW / (dims.totalW + pillExtra)
    finalFontSize = Math.max(finalFontSize * ratio, 10)
    dims = genreBadgeDims(finalFontSize, genreName, voteStr, yearStr)
  }
  const { starW, gap, gapStar, pad, totalW, svgH } = dims
  const m = Math.round(finalFontSize * 0.17)
  let textShadow = "0 5px 8px rgba(0,0,0,0.6)"
  if (s === "outline") {
    textShadow = "1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9)"
  } else if (s !== "shadow") {
    textShadow = "none"
  }
  const bulletY = "5px"
  const starY = `${Math.round(finalFontSize * 0.23)}px`
  const bulletOpacity = 0.6
  const children: any[] = [
    React.createElement("span", null, genreName),
    React.createElement("span", { style: { transform: `translateY(${bulletY})`, opacity: bulletOpacity } }, "\u2022"),
    React.createElement("span", { style: { display: "flex", alignItems: "center" } },
      React.createElement("span", { style: { marginRight: `${gapStar}px`, transform: `translateY(${starY})` } }, "\u2605"),
      React.createElement("span", { style: { transform: `translateY(${bulletY})` } }, voteStr),
    ),
  ]
  if (yearStr) {
    children.push(React.createElement("span", { style: { transform: `translateY(${bulletY})`, opacity: bulletOpacity } }, "\u2022"))
    children.push(React.createElement("span", { style: { transform: `translateY(${bulletY})` } }, yearStr))
  }

  const sharedTextStyle: Record<string, any> = {
    display: "flex",
    alignItems: "center",
    gap: `${gap}px`,
    color: "#e5e7eb",
    fontSize: `${finalFontSize}px`,
    fontFamily: "Inter",
    fontWeight: 700,
    lineHeight: 1,
    textShadow,
  }

  let el: any

  if (s === "bar" || s === "glass") {
    const barTextStyle = { ...sharedTextStyle, color: s === "glass" ? "#e5e7eb" : "rgba(0,0,0,0.80)" }
    const barPad = Math.round(finalFontSize * 0.5)
    const barH = Math.max(barHeight || 0, finalFontSize + barPad * 2)
    const barShadowOff = Math.max(Math.round(barH * 0.2), 3)
    const barShadowBlur = Math.max(Math.round(barH * 0.5), 8)
    const barContent = React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: `${pw}px`,
          height: `${barH}px`,
          backgroundColor: s === "glass" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.80)",
          borderTop: `1px solid ${s === "glass" ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.10)"}`,
          borderRadius: `${Math.round(finalFontSize * 0.7)}px ${Math.round(finalFontSize * 0.7)}px 0 0`,
          boxShadow: `0 -${barShadowOff}px ${barShadowBlur}px rgba(0,0,0,0.3)`,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: `${gap}px`,
            ...barTextStyle,
          },
        },
        ...children,
      ),
    )
    if (s === "glass") {
      el = React.createElement("div", { style: { display: "flex", width: `${pw}px`, height: `${barH}px`, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: `${Math.round(finalFontSize * 0.7)}px ${Math.round(finalFontSize * 0.7)}px 0 0`, overflow: "hidden" } },
        barContent,
      )
    } else {
      el = barContent
    }
    const png = await render(el, pw, barH)
    return { png, w: pw, h: barH }
  } else if (s === "pill" || s === "colored") {
    const borderStyle = {}
    const pillTextStyle = { ...sharedTextStyle, color: s === "colored" ? textColorForBg(accentColor || "") : "rgba(0,0,0,0.80)" }
    const pillH = finalFontSize + pillPad * 2
    const pillW = totalW - pad * 2 + pillPad * 3
    const coloredBg = s === "colored" && accentColor && accentColor !== "#555555" ? accentColor : "rgba(255,255,255,0.80)"
    el = React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: `${gap}px`,
          padding: `${pillPad}px ${pillPad * 1.5}px`,
          borderRadius: `${pillR}px`,
          backgroundColor: coloredBg,
          width: `${pillW}px`,
          height: `${pillH}px`,
          ...borderStyle,
          ...pillTextStyle,
        },
      },
      ...children,
    )
  } else {
    el = React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: `${gap}px`,
          width: `${totalW}px`,
          height: `${svgH}px`,
          ...sharedTextStyle,
        },
      },
      ...children,
    )
  }

  const renderW = totalW + (isPillStyle ? pillPad * 3 - pad * 2 : 0)
  const renderH = isPillStyle ? finalFontSize + pillPad * 2 : svgH
  const png = await render(el, renderW, renderH)
  return { png, w: renderW, h: renderH }
}
