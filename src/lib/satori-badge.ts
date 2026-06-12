import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import React from "react"
import fs from "fs"
import path from "path"

let _regular: Buffer | null = null
let _bold: Buffer | null = null
let _symbols: Buffer | null = null

function fontRegular(): Buffer {
  if (!_regular)
    _regular = fs.readFileSync(
      path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-400-normal.woff")
    )
  return _regular
}

function fontBold(): Buffer {
  if (!_bold)
    _bold = fs.readFileSync(
      path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-700-normal.woff")
    )
  return _bold
}

function fontSymbols(): Buffer {
  if (!_symbols)
    _symbols = fs.readFileSync(
      path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans-symbols-2", "files", "noto-sans-symbols-2-symbols-400-normal.woff")
    )
  return _symbols
}

function fonts() {
  return [
    { name: "Inter", data: fontRegular(), weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: fontBold(), weight: 700 as const, style: "normal" as const },
    { name: "Noto Sans Symbols 2", data: fontSymbols(), weight: 400 as const, style: "normal" as const },
  ]
}

export async function renderRankingBadge(
  rank: number,
  pw: number,
  label?: string
): Promise<{ png: Buffer; w: number; h: number }> {
  const periodMap: Record<string, string> = { day: "Oggi", week: "Settimana" }
  const periodText = label || periodMap["day"] || "Oggi"
  const fullText = `#${rank} ${periodText}`
  const fontSize = Math.round(20 * pw / 380)
  const charW = fontSize * 0.58
  const textW = Math.round(String(rank).length * charW + fontSize * 0.35 + periodText.length * charW)
  const px = Math.round(fontSize * 1.2)
  const pt = Math.round(fontSize * 0.25)
  const pb = Math.round(fontSize * 0.25)
  const totalW = textW + px * 2
  const svgH = fontSize + pt + pb
  const r = Math.round(fontSize * 0.67)

  const el = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${totalW}px`,
        height: `${svgH}px`,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderBottomLeftRadius: `${r}px`,
        borderBottomRightRadius: `${r}px`,
      },
    },
    React.createElement("span", {
      style: {
        color: "rgba(255,255,255,0.9)",
        fontSize: `${fontSize}px`,
        fontFamily: "Inter",
        fontWeight: 600,
        letterSpacing: "0.025em",
      },
    }, fullText)
  )

  const svg = await satori(el, { width: totalW, height: svgH, fonts: fonts() })
  const resvg = new Resvg(svg)
  const png = Buffer.from(resvg.render().asPng())
  return { png, w: totalW, h: svgH }
}

export async function renderExtraBadge(
  label: string,
  pw: number,
): Promise<{ png: Buffer; w: number; h: number }> {
  const fontSize = Math.round(20 * pw / 380)
  const charW = fontSize * 0.58
  const textW = Math.max(Math.round(label.length * charW), fontSize)
  const px = Math.round(fontSize * 1.2)
  const pt = Math.round(fontSize * 0.25)
  const pb = Math.round(fontSize * 0.25)
  const totalW = textW + px * 2
  const svgH = fontSize + pt + pb
  const r = Math.round(fontSize * 0.67)

  const el = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${totalW}px`,
        height: `${svgH}px`,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderBottomLeftRadius: `${r}px`,
        borderBottomRightRadius: `${r}px`,
      },
    },
    React.createElement("span", {
      style: {
        color: "rgba(255,255,255,0.9)",
        fontSize: `${fontSize}px`,
        fontFamily: "Inter",
        fontWeight: 600,
        letterSpacing: "0.025em",
      },
    }, label)
  )

  const svg = await satori(el, { width: totalW, height: svgH, fonts: fonts() })
  const resvg = new Resvg(svg)
  const png = Buffer.from(resvg.render().asPng())
  return { png, w: totalW, h: svgH }
}

export async function renderGenreBadge(
  genreName: string,
  voteAverage: number,
  pw: number,
): Promise<{ png: Buffer; w: number; h: number }> {
  const voteStr = voteAverage.toFixed(1)
  const fontSize = Math.round(24 * pw / 380)
  const starFontSize = Math.round(20 * pw / 380)
  const charW = fontSize * 0.58
  const genreW = Math.round(genreName.length * charW)
  const bulletW = Math.round(fontSize * 0.35)
  const starW = Math.round(starFontSize * 0.55)
  const voteW = Math.round(voteStr.length * charW)
  const gap = Math.round(fontSize * 0.25)
  const gapStar = Math.round(fontSize * 0.12)
  const starPb = Math.round(Math.max(2 * pw / 380, 1))
  const pad = Math.round(fontSize * 0.35)
  const totalW = genreW + gap + bulletW + gap + starW + gapStar + voteW + pad * 2
  const svgH = Math.round(fontSize * 1.6)

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
        fontSize: `${fontSize}px`,
        fontFamily: "Inter",
        fontWeight: 700,
        textShadow: "0 4px 6px rgba(0,0,0,0.5)",
      },
    },
    React.createElement("span", null, genreName),
    React.createElement("span", null, "•"),
    React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: `${gapStar}px`,
      },
    },
      React.createElement("span", {
        style: {
          fontSize: `${starFontSize}px`,
          paddingBottom: `${starPb}px`,
        },
      }, "★"),
      React.createElement("span", null, voteStr),
    ),
  )

  const svg = await satori(el, { width: totalW, height: svgH, fonts: fonts() })
  const resvg = new Resvg(svg)
  const png = Buffer.from(resvg.render().asPng())
  return { png, w: totalW, h: svgH }
}
