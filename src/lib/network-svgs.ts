import fs from "fs"
import path from "path"

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

// Map networkKey → filename in public/networks/
const NETWORK_FILES: Record<string, string> = {
  netflix: "Netflix_2016_N_logo.png",
  hbo: "HBO_Max_(2025).png",
  disney: "Disney+_logo.png",
  prime: "Amazon_Prime_Video_logo.png",
  apple: "Apple_TV_logo.png",
  paramount: "Paramount_Plus.png",
  rai: "Logo_of_RAI_(2016).png",
  crunchyroll: "Crunchyroll_Logo.png",
}

// Target rendered widths (at pw=380) — height is proportional via sharp
const NETWORK_TARGET_W: Record<string, number> = {
  netflix: 26,
  hbo: 52,
  disney: 72,
  prime: 74,
  apple: 54,
  paramount: 72,
  rai: 44,
  crunchyroll: 28,
}

function getNetworkKey(networkName: string): string | null {
  const lower = networkName.toLowerCase().trim()
  if (lower.includes("netflix")) return "netflix"
  if (lower.includes("hbo") || lower === "max") return "hbo"
  if (lower.includes("disney")) return "disney"
  if (lower.includes("prime") || lower.includes("amazon")) return "prime"
  if (lower.includes("apple")) return "apple"
  if (lower.includes("paramount")) return "paramount"
  if (lower === "rai" || lower.startsWith("rai ")) return "rai"
  if (lower.includes("crunchyroll")) return "crunchyroll"
  return null
}

async function loadNetworkPng(networkKey: string, pw: number): Promise<{ png: Buffer; w: number; h: number } | null> {
  const filename = NETWORK_FILES[networkKey]
  if (!filename) return null
  const filePath = path.join(NETWORKS_DIR, filename)
  if (!fs.existsSync(filePath)) return null
  try {
    const sharp = (await import("sharp")).default
    const targetW = Math.round((NETWORK_TARGET_W[networkKey] ?? 60) * pw / 380)
    const { data, info } = await sharp(filePath)
      .resize(targetW, undefined, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer({ resolveWithObject: true })

    const pad = Math.max(Math.round(4 * pw / 380), 3)
    const off = Math.max(Math.round(2 * pw / 380), 1)

    // Generate soft black drop shadow from logo alpha
    const shadowLayer = await sharp(data)
      .ensureAlpha()
      .linear([0, 0, 0, 0.65], [0, 0, 0, 0])
      .blur(1.8)
      .toBuffer()

    const { data: finalPng, info: finalInfo } = await sharp({
      create: {
        width: info.width + pad * 2,
        height: info.height + pad * 2,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      { input: shadowLayer, top: pad + off, left: pad + off },
      { input: data, top: pad, left: pad }
    ])
    .png()
    .toBuffer({ resolveWithObject: true })

    return { png: finalPng, w: finalInfo.width, h: finalInfo.height }
  } catch (e) {
    console.error(`[network-svgs] Failed to load PNG for ${networkKey}:`, e)
    return null
  }
}

export async function renderFirstMatchingNetworkLogoBadge(
  names: (string | null | undefined)[],
  pw: number = 500
): Promise<{ png: Buffer; w: number; h: number; networkKey: string; matchedName: string } | null> {
  for (const name of names) {
    if (!name) continue
    const networkKey = getNetworkKey(name)
    if (!networkKey) continue
    const result = await loadNetworkPng(networkKey, pw)
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

export async function renderNetworkLogoBadge(networkName?: string | null, pw: number = 500): Promise<{ png: Buffer; w: number; h: number; networkKey: string } | null> {
  if (!networkName) return null
  const networkKey = getNetworkKey(networkName)
  if (!networkKey) return null
  const result = await loadNetworkPng(networkKey, pw)
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
