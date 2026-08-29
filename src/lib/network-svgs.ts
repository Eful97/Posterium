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
  netflix: "Netflix_2015_logo.svg",
  hbo: "HBO_logo.svg",
  disney: "Disney+_logo.svg",
  prime: "Prime_Video_logo_(2024).svg",
  apple: "Apple_TV_logo.svg",
  paramount: "Paramount_Plus.svg",
  rai: "Logo_of_RAI_(2016).svg",
  crunchyroll: "cr_logo_noTagline.svg",
  // Il logo NOW ha sostituito il vecchio Sky Group: entrambi i nomi usano lo stesso file.
  sky: "Now_logo.svg",
  mediaset: "Mediaset_Infinity_logo.svg",
  tubi: "Tubi logo.svg",
  pluto: "Pluto_TV_logo_2024.svg",
  amc: "Amc_logo.svg",
  abc: "American_Broadcasting_Company_Logo.svg",
  cbs: "CBS_logo_(2020).svg",
  fox: "FOX_wordmark.svg",
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
  pixar: "Pixar_logo.svg",
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
  netflix: 60,
  hbo: 48,
  disney: 55,
  prime: 43,
  apple: 55,
  paramount: 52,
  rai: 48,
  crunchyroll: 38,
  sky: 62,
  mediaset: 56,
  tubi: 62,
  pluto: 46,
  amc: 52,
  abc: 40,
  cbs: 62,
  fox: 50,
  fx: 50,
  hulu: 62,
  natgeo: 62,
  nbc: 40,
  showtime: 62,
  warner: 38,
  universal: 52,
  century: 48,
  columbia: 62,
  sony: 62,
  disney_pictures: 62,
  marvel: 62,
  pixar: 62,
  a24: 58,
  legendary: 62,
  lionsgate: 62,
  fandango: 54,
  medusa: 40,
  ghibli: 62,
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
  // Filtro anime: SKY PerfecTV! (sat giapponese) condivide nome con Sky EU ma è servizio diverso.
  if (lower.includes("sky perfec")) return null
  // NOW è lo stesso servizio di Sky (streaming Sky) → stesso logo, alias a sky.
  // Word boundary per evitare falsi positivi tipo "Skydance".
  // NOW matchato solo quando il nome inizia con "now" (NOW / Now TV), non la parola ovunque
  // (evita falsi positivi tipo "Don't Look Now").
  if (/\bsky\b/.test(lower) || lower === "now" || lower.startsWith("now ")) return "sky"
  // Filtro anime: ABC Animation (Asahi, produttore anime) condivide sigla con ABC USA.
  // Escludiamo esplicitamente prima del match ABC per evitare logo ABC USA su poster anime.
  if (lower.includes("abc animation")) return null
  // Word boundary per evitare falsi positivi: "amc" dentro parole composte,
  // "abc" in sigle/parole, "fx" in titoli tipo "The X-Files" spin-off ecc.
  if (/\bamc\+?\b/.test(lower)) return "amc"
  if (/\babc\b/.test(lower) || lower.includes("american broadcasting")) return "abc"
  if (/\bcbs\b/.test(lower)) return "cbs"
  if (lower.includes("20th century") || lower.includes("century studios")) return "century"
  // Filtro anime: White Fox (studio di Re:Zero) contiene "fox" ma non è FOX network USA.
  if (lower.includes("white fox")) return null
  if (/\bfox\b/.test(lower) || lower === "fox network" || lower.startsWith("fox ")) return "fox"
  if (/\bfxx?\b/.test(lower)) return "fx"
  if (lower.includes("hulu")) return "hulu"
  if (lower.includes("national geographic") || /\bnat\s?geo\b/.test(lower)) return "natgeo"
  if (/\bnbc\b/.test(lower)) return "nbc"
  if (/\bshowtime\b/.test(lower)) return "showtime"
  // Filtro anime: Nippon Columbia (etichetta musicale anime) vs Columbia Pictures.
  // Solo "columbia pictures" deve mappare a columbia, per evitare logo Columbia su OST anime.
  if (lower.includes("nippon columbia")) return null
  if (lower.includes("warner bros")) return "warner"
  if (lower.includes("universal pictures")) return "universal"
  if (lower.includes("columbia pictures")) return "columbia"
  if (lower.includes("marvel")) return "marvel"
  if (lower.includes("pixar")) return "pixar"
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
    let svgBuffer: Buffer
    if (networkKey === "marvel") {
      const studiosColor = topLight ? "#ffffff" : "#121216"
      const raw = await fs.promises.readFile(filePath, "utf-8")
      const modified = raw.replace(".studios-fg { fill: #121216; }", `.studios-fg { fill: ${studiosColor}; }`)
      svgBuffer = Buffer.from(modified)
    } else {
      svgBuffer = await fs.promises.readFile(filePath)
    }

    // Uniform area: tutti i loghi stessa area visiva (~3600px² @500), flat ultra-wide ridotti
    let targetW: number
    let maxLogoH: number
    let density = 72
    try {
      const meta = await sharp(svgBuffer).metadata()
      const w = meta.width || 100
      const h = meta.height || 50
      const aspect = w / h
      const isFlatWide = ["lionsgate", "sony", "legendary", "fandango", "pixar"].includes(networkKey)
      const areaScale = isFlatWide ? 0.62 : 1 // Lionsgate, Pixar e simili troppo larghi → area -38%
      const desiredArea = 3600 * areaScale * (pw / 500) * (pw / 500)
      const desiredH = Math.round(Math.sqrt(desiredArea / aspect))
      const desiredW = Math.round(desiredH * aspect)
      targetW = desiredW
      maxLogoH = desiredH
      if (w < targetW) {
        density = Math.min(Math.ceil((72 * targetW) / w), 2400)
      }
    } catch {
      targetW = Math.round(60 * pw / 380)
      maxLogoH = Math.round(26 * pw / 380)
    }
    const { data, info } = await sharp(svgBuffer, { density })
      .resize(targetW, maxLogoH, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer({ resolveWithObject: true })

    // Logo senza pill (richiesta utente): solo logo con ombra a contrasto.
    // Senza pill il colore deve contrastare direttamente il poster: top chiaro
    // → logo scuro, top scuro → logo chiaro. Marvel conserva i colori brand.
    const keepColor = networkKey === "marvel"
    let recolored: Buffer
    if (keepColor) {
      recolored = data // conserva colori brand
    } else {
      const fgBg = topLight
        ? { r: 18, g: 18, b: 22, alpha: 0.88 }
        : { r: 255, g: 255, b: 255, alpha: 0.88 }
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

    // Ombra a contrasto (senza pill)
    const shadowBlur = Math.max(2, Math.round(3 * pw / 380))
    const shadowDy = Math.max(1, Math.round(2 * pw / 380))
    const shadowColor = { r: 0, g: 0, b: 0, alpha: 0.55 as const }
    let shadowBuf: Buffer
    if (keepColor) {
      const shadowSolid = await sharp({
        create: { width: info.width, height: info.height, channels: 4, background: shadowColor },
      })
        .png()
        .toBuffer()
      const masked = await sharp(shadowSolid)
        .composite([{ input: data, blend: "dest-in" }])
        .png()
        .toBuffer()
      shadowBuf = await sharp(masked).blur(shadowBlur).toBuffer()
    } else {
      const shadowSolid = await sharp({
        create: { width: info.width, height: info.height, channels: 4, background: shadowColor },
      })
        .png()
        .toBuffer()
      const masked = await sharp(shadowSolid)
        .composite([{ input: data, blend: "dest-in" }])
        .png()
        .toBuffer()
      shadowBuf = await sharp(masked).blur(shadowBlur).toBuffer()
    }

    const canvasW = info.width + shadowBlur * 2 + 2
    const canvasH = info.height + shadowBlur * 2 + shadowDy + 2
    const shadowLeft = shadowBlur + 1
    const shadowTop = shadowBlur + shadowDy + 1
    const logoLeft = shadowBlur + 1
    const logoTop = shadowBlur + 1

    const finalPng = await sharp({
      create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        { input: shadowBuf, left: shadowLeft, top: shadowTop },
        { input: recolored, left: logoLeft, top: logoTop },
      ])
      .png()
      .toBuffer()

    const result = { png: finalPng, w: canvasW, h: canvasH }
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

/** Logo network raw: colore originale SVG, senza pill e senza ombra (quasi attaccato al logo film). */
async function loadNetworkRawPng(networkKey: string, pw: number, _topLight?: boolean): Promise<{ png: Buffer; w: number; h: number } | null> {
  const cacheKey = `raw:${networkKey}:${pw}`
  const cached = networkLogoCache.get(cacheKey)
  if (cached) return cached
  const filename = NETWORK_FILES[networkKey]
  if (!filename) return null
  const filePath = path.join(NETWORKS_DIR, filename)
  if (!fs.existsSync(filePath)) return null
  try {
    const sharp = (await import("sharp")).default
    const svgBuffer = await fs.promises.readFile(filePath)
    // Uniform area come per loadNetworkPng — flat ridotti
    let targetW: number
    let maxLogoH: number
    let density = 72
    try {
      const meta = await sharp(svgBuffer).metadata()
      const w = meta.width || 100
      const h = meta.height || 50
      const aspect = w / h
      const isFlatWide2 = ["lionsgate", "sony", "legendary", "fandango", "pixar"].includes(networkKey)
      const areaScale2 = isFlatWide2 ? 0.62 : 1
      const desiredArea = 3600 * areaScale2 * (pw / 500) * (pw / 500)
      const desiredH = Math.round(Math.sqrt(desiredArea / aspect))
      const desiredW = Math.round(desiredH * aspect)
      targetW = desiredW
      maxLogoH = desiredH
      if (w < targetW) {
        density = Math.min(Math.ceil((72 * targetW) / w), 2400)
      }
    } catch {
      targetW = Math.round(60 * pw / 380)
      maxLogoH = Math.round(26 * pw / 380)
    }
    const { data, info } = await sharp(svgBuffer, { density })
      .resize(targetW, maxLogoH, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer({ resolveWithObject: true })
    // Senza pill e senza ombra — solo logo originale (quasi attaccato al logo film)
    const result = { png: data, w: info.width, h: info.height }
    networkLogoCache.set(cacheKey, result)
    return result
  } catch (e) {
    log.error(`Failed to load raw PNG for ${networkKey}`, { error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

export async function renderFirstMatchingNetworkRawBadge(
  names: (string | null | undefined)[],
  pw: number = 500,
  topLight: boolean = false
): Promise<{ png: Buffer; w: number; h: number; networkKey: string; matchedName: string } | null> {
  for (const name of names) {
    if (!name) continue
    const networkKey = getNetworkKey(name)
    if (!networkKey) continue
    const result = await loadNetworkRawPng(networkKey, pw, topLight)
    if (result) return { ...result, networkKey, matchedName: name }
  }
  return null
}

export async function renderNetworkRawBadge(networkName?: string | null, pw: number = 500, topLight: boolean = false): Promise<{ png: Buffer; w: number; h: number; networkKey: string } | null> {
  if (!networkName) return null
  const networkKey = getNetworkKey(networkName)
  if (!networkKey) return null
  const result = await loadNetworkRawPng(networkKey, pw, topLight)
  if (!result) return null
  return { ...result, networkKey }
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
