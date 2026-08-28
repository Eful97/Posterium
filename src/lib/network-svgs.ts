import fs from "fs"
import path from "path"
import { createLogger } from "@/lib/logger"

const log = createLogger("network-svgs")

/** Cache for pre-rendered network logos — keyed by networkKey:pw */
const networkLogoCache = new Map<string, { png: Buffer; w: number; h: number }>()

export interface NetworkSvgResult {
  svg: string
  w: number
  h: number
  networkKey: string
}

export interface NetworkPngResult {
  png: Buffer
  w: number
  h: number
  networkKey: string
  matchedName: string
}

const NETWORKS_DIR = path.join(process.cwd(), "public", "networks")

/** Svuota la cache dei logo pre-renderizzati (per /api/cache/clear e test). */
export function __resetNetworkLogoCache(): void {
  networkLogoCache.clear()
}

// Map networkKey → filename in public/networks/
const NETWORK_FILES: Record<string, string> = {
  netflix: "Netflix_2016_N_logo.svg",
  hbo: "HBO_Max_(2025).svg",
  disney: "Disney+_logo.svg",
  prime: "Amazon_Prime_Video_logo_(2024).svg",
  apple: "Apple_TV_logo.svg",
  paramount: "Paramount_Plus.svg",
  rai: "Logo_of_RAI_(2016).svg",
  crunchyroll: "Crunchyroll_Logo.svg",
  // Il logo NOW ha sostituito il vecchio Sky Group: entrambi i nomi usano lo stesso file.
  sky: "Now_logo.svg",
  mediaset: "Mediaset_Infinity_logo.svg",
  tubi: "Tubi logo.svg",
  pluto: "Pluto_TV_logo_2024.svg",
  amc: "Amc_logo.svg",
  abc: "American_Broadcasting_Company_Logo.svg",
  cbs: "CBS_logo_(2020).svg",
  fx: "FX_International_logo.svg",
  hulu: "Hulu_logo_(2018).svg",
  natgeo: "National-Geographic-Logo.svg",
  nbc: "NBC_logo.svg", // peacock colors updated 2026-08-28
  showtime: "Showtime_logo.svg",
  warner: "Warner_Bros_logo.svg",
  universal: "Universal_Pictures_logo.svg",
  century: "20th_Century_Studios_(2020) [Recuperato].svg",
  columbia: "Columbia_Pictures.svg",
  sony: "Sony_logo.svg",
  disney_pictures: "Walt_Disney_Pictures_text_logo.svg",
  marvel: "Marvel_Studios_2016_logo.svg",
  a24: "A24_logo.svg",
  legendary: "Legendary_Entertainment_logo.svg",
  lionsgate: "Lionsgate_Logo.svg",
  fandango: "Fandango_2014.svg",
  medusa: "Medusa_Film_-_logo_(Italy,_2017-).svg",
  ghibli: "Studio_Ghibli.svg",
}

// Target rendered widths (at pw=380) — normalizzati per area visiva ~3200px² a pw=500 (senza pill, logo diretto su poster)
// flat ultra-wide (sony/legendary/lionsgate) al max 72 per non sovrapporre badge; square grandi (warner/medusa) ridotti
const NETWORK_TARGET_W: Record<string, number> = {
  netflix: 32,
  hbo: 51,
  disney: 59,
  prime: 43,
  apple: 61,
  paramount: 55,
  rai: 43,
  crunchyroll: 41,
  sky: 72,
  mediaset: 62,
  tubi: 72,
  pluto: 49,
  amc: 57,
  abc: 43,
  cbs: 72,
  fx: 55,
  hulu: 72,
  natgeo: 72,
  nbc: 43,
  showtime: 71,
  warner: 42,
  universal: 59,
  century: 47,
  columbia: 72,
  sony: 72,
  disney_pictures: 72,
  marvel: 72,
  a24: 67,
  legendary: 72,
  lionsgate: 72,
  fandango: 61,
  medusa: 43,
  ghibli: 72,
}

function getNetworkKey(networkName: string): string | null {
  const lower = networkName.toLowerCase().trim()
  if (lower.includes("netflix")) return "netflix"
  if (lower.includes("hbo") || lower === "max") return "hbo"
  // Walt Disney Pictures va prima di Disney generico per non clashare con Disney+
  if (lower.includes("walt disney")) return "disney_pictures"
  if (lower.includes("disney")) return "disney"
  if (lower.includes("prime") || lower.includes("amazon")) return "prime"
  if (lower.includes("apple")) return "apple"
  if (lower.includes("paramount")) return "paramount"
  if (lower === "rai" || lower.startsWith("rai ")) return "rai"
  if (lower.includes("crunchyroll")) return "crunchyroll"
  if (lower.includes("mediaset")) return "mediaset"
  if (lower.includes("tubi")) return "tubi"
  if (lower.includes("pluto")) return "pluto"
  // NOW è lo stesso servizio di Sky (streaming Sky) → stesso logo, alias a sky.
  // Word boundary per evitare falsi positivi tipo "Skydance".
  // NOW matchato solo quando il nome inizia con "now" (NOW / Now TV), non la parola ovunque
  // (evita falsi positivi tipo "Don't Look Now").
  if (/\bsky\b/.test(lower) || lower === "now" || lower.startsWith("now ")) return "sky"
  // Word boundary per evitare falsi positivi: "amc" dentro parole composte,
  // "abc" in sigle/parole, "fx" in titoli tipo "The X-Files" spin-off ecc.
  if (/\bamc\+?\b/.test(lower)) return "amc"
  if (/\babc\b/.test(lower) || lower.includes("american broadcasting")) return "abc"
  if (/\bcbs\b/.test(lower)) return "cbs"
  if (/\bfxx?\b/.test(lower)) return "fx"
  if (lower.includes("hulu")) return "hulu"
  if (lower.includes("national geographic") || /\bnat\s?geo\b/.test(lower)) return "natgeo"
  if (/\bnbc\b/.test(lower)) return "nbc"
  if (/\bshowtime\b/.test(lower)) return "showtime"
  if (lower.includes("warner")) return "warner"
  if (lower.includes("universal")) return "universal"
  if (lower.includes("20th century") || lower.includes("20th century studios") || lower.includes("century studios")) return "century"
  if (lower.includes("columbia")) return "columbia"
  if (lower.includes("marvel")) return "marvel"
  if (/\bsony\b/.test(lower)) return "sony"
  if (lower === "a24" || lower.includes("a24")) return "a24"
  if (lower.includes("legendary")) return "legendary"
  if (lower.includes("lionsgate")) return "lionsgate"
  if (lower.includes("fandango")) return "fandango"
  if (lower.includes("medusa")) return "medusa"
  if (lower.includes("ghibli") || lower.includes("studio ghibli")) return "ghibli"
  return null
}

async function loadNetworkPng(networkKey: string, pw: number, topLight: boolean = false): Promise<{ png: Buffer; w: number; h: number } | null> {
  const cacheKey = `${networkKey}:${pw}:${topLight ? 1 : 0}`
  const cached = networkLogoCache.get(cacheKey)
  if (cached) return cached

  const filename = NETWORK_FILES[networkKey]
  if (!filename) return null
  const filePath = path.join(NETWORKS_DIR, filename)
  if (!fs.existsSync(filePath)) return null
  try {
    const sharp = (await import("sharp")).default
    const targetW = Math.round((NETWORK_TARGET_W[networkKey] ?? 60) * pw / 380)
    // Gli SVG senza width/height intrinseci vengono rasterizzati da libvips a
    // 72dpi sulla base del viewBox: per logo con viewBox piccolo (es. Apple TV
    // 53px) servirebbe un upscale del raster già sfocato. Calcoliamo quindi la
    // densità in modo che il rendering vettoriale copra la larghezza target.
    let density = 72
    try {
      const meta = await sharp(filePath).metadata()
      if (meta.width && meta.width > 0 && meta.width < targetW) {
        density = Math.min(Math.ceil((72 * targetW) / meta.width), 2400)
      }
    } catch {}
    const { data, info } = await sharp(filePath, { density })
      .resize(targetW, undefined, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer({ resolveWithObject: true })

    const pad = Math.max(Math.round(4 * pw / 380), 3)
    const off = Math.max(Math.round(2 * pw / 380), 1)

    // Logo monocromatico allineato al badge trend SENZA pill: stesso colore del bg badge (non del testo) per contrasto diretto sul poster
    // svg-badge.ts: bg = topLight ? nero : bianco → logo = bg (topLight→nero, altrimenti bianco)
    // Eccezioni: netflix, marvel, 20th century restano a colori originali
    const keepColor = networkKey === "netflix" || networkKey === "marvel" || networkKey === "century"
    let recolored: Buffer
    if (keepColor) {
      recolored = data // conserva colori brand
    } else {
      const fgBg = topLight
        ? { r: 0, g: 0, b: 0, alpha: 0.8 }
        : { r: 255, g: 255, b: 255, alpha: 0.8 }
      const fgSolid = await sharp({
        create: { width: info.width, height: info.height, channels: 4, background: fgBg },
      })
        .png()
        .toBuffer()
      recolored = await sharp(fgSolid)
        .composite([{ input: data, blend: "dest-in" }])
        .png()
        .toBuffer()
    }

    // Ombra del solo logo: nera su logo bianco, bianca su logo nero — invertita rispetto al logo; keepColor sempre ombra nera
    let shadowLayer: Buffer
    if (keepColor) {
      shadowLayer = await sharp(data)
        .ensureAlpha()
        .linear([0, 0, 0, 0.65], [0, 0, 0, 0])
        .blur(1.8)
        .toBuffer()
    } else if (topLight) {
      // logo nero → ombra bianca
      const whiteSolid = await sharp({
        create: { width: info.width, height: info.height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0.52 } },
      })
        .png()
        .toBuffer()
      shadowLayer = await sharp(whiteSolid)
        .composite([{ input: data, blend: "dest-in" }])
        .blur(1.8)
        .toBuffer()
    } else {
      // logo bianco → ombra nera
      shadowLayer = await sharp(data)
        .ensureAlpha()
        .linear([0, 0, 0, 0.65], [0, 0, 0, 0])
        .blur(1.8)
        .toBuffer()
    }

    const finalW = info.width + pad * 2 + off
    const finalH = info.height + pad * 2 + off
    const { data: finalPng, info: finalInfo } = await sharp({
      create: {
        width: finalW,
        height: finalH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: shadowLayer, top: pad + off, left: pad + off },
        { input: recolored, top: pad, left: pad },
      ])
      .png()
      .toBuffer({ resolveWithObject: true })

    const result = { png: finalPng, w: finalInfo.width, h: finalInfo.height }
    networkLogoCache.set(cacheKey, result)
    return result
  } catch (e) {
    log.error(`Failed to load PNG for ${networkKey}`, { error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

export async function renderFirstMatchingNetworkLogoBadge(
  names: (string | null | undefined)[],
  pw: number = 500,
  topLight: boolean = false
): Promise<{ png: Buffer; w: number; h: number; networkKey: string; matchedName: string } | null> {
  for (const name of names) {
    if (!name) continue
    const networkKey = getNetworkKey(name)
    if (!networkKey) continue
    const result = await loadNetworkPng(networkKey, pw, topLight)
    if (result) {
      return { ...result, networkKey, matchedName: name }
    }
  }
  return null
}

// Legacy SVG-based exports kept for unit tests compatibility
export interface NetworkSvgResult_Legacy {
  svg: string
  w: number
  h: number
  networkKey: string
}

export function getNetworkSvgResult(networkName?: string | null, pw: number = 500): NetworkSvgResult_Legacy | null {
  if (!networkName) return null
  const networkKey = getNetworkKey(networkName)
  if (!networkKey) return null
  const w = Math.round((NETWORK_TARGET_W[networkKey] ?? 60) * pw / 380)
  const h = Math.round(w * 0.5)
  // Return a minimal SVG stub — actual rendering now uses PNG via renderFirstMatchingNetworkLogoBadge
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"></svg>`, w, h, networkKey }
}

export async function renderNetworkLogoBadge(networkName?: string | null, pw: number = 500, topLight: boolean = false): Promise<{ png: Buffer; w: number; h: number; networkKey: string } | null> {
  if (!networkName) return null
  const networkKey = getNetworkKey(networkName)
  if (!networkKey) return null
  const result = await loadNetworkPng(networkKey, pw, topLight)
  if (!result) return null
  return { ...result, networkKey }
}

export function findMatchingNetworkSvg(names: (string | null | undefined)[], pw: number = 500): { res: NetworkSvgResult_Legacy; matchedName: string } | null {
  for (const name of names) {
    if (!name) continue
    const res = getNetworkSvgResult(name, pw)
    if (res) return { res, matchedName: name }
  }
  return null
}
