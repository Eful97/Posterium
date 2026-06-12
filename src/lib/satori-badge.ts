import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import React from "react"
import fs from "fs"
import path from "path"

let _regular: Buffer | null = null
let _bold: Buffer | null = null
let _symbols: Buffer | null = null

function fontPath(weight: 400 | 700): string {
  const file = weight === 400 ? "inter-latin-400-normal.woff" : "inter-latin-700-normal.woff"
  return path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files", file)
}

function fontRegular(): Buffer {
  if (!_regular) _regular = fs.readFileSync(fontPath(400))
  return _regular
}

function fontBold(): Buffer {
  if (!_bold) _bold = fs.readFileSync(fontPath(700))
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

function embedFonts(svg: string): string {
  const b64 = (buf: Buffer) => buf.toString("base64")
  const css = `<style>
@font-face{font-family:'Inter';src:url(data:font/woff;base64,${b64(fontRegular())});font-weight:400;font-style:normal}
@font-face{font-family:'Inter';src:url(data:font/woff;base64,${b64(fontBold())});font-weight:700;font-style:normal}
@font-face{font-family:'Noto Sans Symbols 2';src:url(data:font/woff;base64,${b64(fontSymbols())});font-weight:400;font-style:normal}
</style>`
  return svg.replace(">", `>${css}`)
}

async function render(el: ReturnType<typeof React.createElement>, w: number, h: number): Promise<Buffer> {
  const svg = embedFonts(await satori(el, { width: w, height: h, fonts: fonts() }))
  return Buffer.from(new Resvg(svg).render().asPng())
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

  const png = await render(el, totalW, svgH)
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

  const png = await render(el, totalW, svgH)
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
  const gap = Math.round(fontSize * 0.33)
  const gapStar = Math.round(fontSize * 0.17)
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
    React.createElement("span", null, "\u00A0\u2022\u00A0"),
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

  const png = await render(el, totalW, svgH)
  return { png, w: totalW, h: svgH }
}
