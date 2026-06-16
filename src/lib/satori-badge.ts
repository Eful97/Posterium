import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import React from "react"
import fs from "fs"
import path from "path"

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
  topLight?: boolean
): Promise<{ png: Buffer; w: number; h: number }> {
  const periodMap: Record<string, string> = { day: "Oggi", week: "Settimana" }
  const periodText = label || periodMap["day"] || "Oggi"
  const fullText = `#${rank} ${periodText}`
  const fontSize = Math.round(23 * pw / 380)
  const px = Math.round(fontSize * 1.0)
  const pt = Math.round(fontSize * 0.5)
  const pb = Math.round(fontSize * 0.5)
  const maxTextW = pw - 40 - px * 2
  let textW = Math.round(String(rank).length * fontSize * 0.58 + fontSize * 0.35 + periodText.length * fontSize * 0.58)
  let finalFontSize = fontSize
  if (textW > maxTextW) {
    finalFontSize = Math.round(maxTextW / ((String(rank).length + periodText.length) * 0.58 + 0.35))
    textW = Math.round(String(rank).length * finalFontSize * 0.58 + finalFontSize * 0.35 + periodText.length * finalFontSize * 0.58)
  }
  const totalW = textW + px * 2
  const svgH = finalFontSize + pt + pb
  const r = Math.round(finalFontSize * 0.7)
  const bg = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const fg = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"
  const shadowBlur = Math.round(finalFontSize * 0.6)
  const shadowOff = Math.round(finalFontSize * 0.2)

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
          fontSize: `${finalFontSize}px`,
          fontFamily: "Inter",
          fontWeight: 600,
          letterSpacing: "0.025em",
        },
      }, fullText)
    ),
  )

  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur
  const png = await render(el, renderW, renderH)
  return { png, w: renderW, h: renderH }
}

export async function renderExtraBadge(
  label: string,
  pw: number,
  topLight?: boolean
): Promise<{ png: Buffer; w: number; h: number }> {
  const fontSize = Math.round(23 * pw / 380)
  const charW = fontSize * 0.58
  const px = Math.round(fontSize * 1.0)
  const pt = Math.round(fontSize * 0.5)
  const pb = Math.round(fontSize * 0.5)
  const maxTextW = pw - 40 - px * 2
  let textW = Math.round(label.length * charW)
  let finalFontSize = fontSize
  if (textW > maxTextW) {
    finalFontSize = Math.round(maxTextW / (label.length * 0.58))
    textW = Math.round(label.length * finalFontSize * 0.58)
  }
  textW = Math.max(textW, finalFontSize)
  const totalW = textW + px * 2
  const svgH = finalFontSize + pt + pb
  const r = Math.round(finalFontSize * 0.7)
  const bg = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const fg = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"
  const shadowBlur = Math.round(finalFontSize * 0.6)
  const shadowOff = Math.round(finalFontSize * 0.2)

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
          fontSize: `${finalFontSize}px`,
          fontFamily: "Inter",
          fontWeight: 600,
          letterSpacing: "0.025em",
        },
      }, label)
    ),
  )

  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur
  const png = await render(el, renderW, renderH)
  return { png, w: renderW, h: renderH }
}

export async function renderGenreBadge(
  genreName: string,
  voteAverage: number,
  pw: number,
): Promise<{ png: Buffer; w: number; h: number }> {
  const voteStr = voteAverage.toFixed(1)
  const fontSize = Math.round(24 * pw / 380)
  const gap = Math.round(fontSize * 0.33)
  const gapStar = Math.round(fontSize * 0.17)
  const pad = Math.round(fontSize * 0.35)
  const bulletW = Math.round(fontSize * 0.35)
  const starW = Math.round(fontSize * 0.55)
  const maxGenreW = pw - 40 - pad * 2 - bulletW - gap * 2 - starW - gapStar - voteStr.length * fontSize * 0.58
  let finalFontSize = fontSize
  let genreW = Math.round(genreName.length * finalFontSize * 0.58)
  let voteW = Math.round(voteStr.length * finalFontSize * 0.58)
  if (genreW > maxGenreW) {
    finalFontSize = Math.round(maxGenreW / (genreName.length * 0.58))
    genreW = Math.round(genreName.length * finalFontSize * 0.58)
    voteW = Math.round(voteStr.length * finalFontSize * 0.58)
  }
  const totalW = genreW + gap + bulletW + gap + starW + gapStar + voteW + pad * 2
  const svgH = Math.round(finalFontSize * 1.6)
  const m = Math.round(finalFontSize * 0.17)

  const el = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: `${gap}px`,
        width: `${totalW}px`,
        height: `${svgH}px`,
        color: "#e5e7eb",
        fontSize: `${finalFontSize}px`,
        fontFamily: "Inter",
        fontWeight: 700,
        textShadow: "0 4px 6px rgba(0,0,0,0.5)",
      },
    },
    React.createElement("span", null, genreName),
    React.createElement("span", {
      style: { transform: "translateY(5px)" },
    }, "\u2022"),
    React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
      },
    },
      React.createElement("span", {
        style: { marginRight: `${gapStar}px`, transform: `translateY(${Math.round(finalFontSize * 0.23)}px)` },
      }, "\u2605"),
      React.createElement("span", {
        style: { transform: "translateY(5px)" },
      }, voteStr),
    ),
  )

  const png = await render(el, totalW, svgH)
  return { png, w: totalW, h: svgH }
}
