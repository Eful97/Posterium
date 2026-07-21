import { renderSVG } from "@/lib/svg-badge"

export interface NetworkSvgResult {
  svg: string
  w: number
  h: number
  networkKey: string
}

function buildNetflixNSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(36 * scale)
  const h = Math.round(58 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 36 58">
    <path d="M 3 0 H 13 V 58 H 3 Z" fill="#B81D24"/>
    <path d="M 23 0 H 33 V 58 H 23 Z" fill="#B81D24"/>
    <path d="M 3 0 H 13 L 33 58 H 23 Z" fill="#E50914"/>
  </svg>`
  return { svg, w, h, networkKey: "netflix" }
}

function buildHboSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(65 * scale)
  const h = Math.round(30 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 65 30">
    <text x="0" y="24" fill="#FFFFFF" font-family="Inter" font-weight="900" font-size="24" letter-spacing="-1">HBO</text>
  </svg>`
  return { svg, w, h, networkKey: "hbo" }
}

function buildDisneySvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(88 * scale)
  const h = Math.round(32 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 88 32">
    <text x="0" y="24" fill="#FFFFFF" font-family="Inter" font-weight="900" font-size="20" letter-spacing="-0.5">Disney<tspan fill="#1175E8" font-weight="800">+</tspan></text>
  </svg>`
  return { svg, w, h, networkKey: "disney" }
}

function buildPrimeVideoSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(92 * scale)
  const h = Math.round(32 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 92 32">
    <text x="0" y="20" fill="#FFFFFF" font-family="Inter" font-weight="800" font-size="15">prime video</text>
    <path d="M 4 25 Q 44 33 84 25 L 79 22 M 84 25 L 80 29" stroke="#00A8E1" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </svg>`
  return { svg, w, h, networkKey: "prime" }
}

function buildAppleTvSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(72 * scale)
  const h = Math.round(30 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 72 30">
    <text x="0" y="22" fill="#FFFFFF" font-family="Inter" font-weight="700" font-size="18">tv+</text>
  </svg>`
  return { svg, w, h, networkKey: "apple" }
}

function buildParamountSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(95 * scale)
  const h = Math.round(32 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 95 32">
    <text x="0" y="22" fill="#FFFFFF" font-family="Inter" font-weight="900" font-size="15">Paramount<tspan fill="#0064FF">+</tspan></text>
  </svg>`
  return { svg, w, h, networkKey: "paramount" }
}

function buildRaiSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(58 * scale)
  const h = Math.round(30 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 58 30">
    <rect x="0" y="2" width="56" height="26" rx="5" fill="#003399"/>
    <text x="28" y="20" fill="#FFFFFF" font-family="Inter" font-weight="900" font-size="16" text-anchor="middle">Rai</text>
  </svg>`
  return { svg, w, h, networkKey: "rai" }
}

function buildMediasetSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(88 * scale)
  const h = Math.round(30 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 88 30">
    <text x="0" y="22" fill="#FFFFFF" font-family="Inter" font-weight="800" font-size="14">MEDIASET</text>
  </svg>`
  return { svg, w, h, networkKey: "mediaset" }
}

function buildCrunchyrollSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(34 * scale)
  const h = Math.round(34 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="14" fill="#F47521"/>
    <circle cx="21" cy="17" r="8" fill="#FFFFFF"/>
    <circle cx="23" cy="17" r="5" fill="#F47521"/>
  </svg>`
  return { svg, w, h, networkKey: "crunchyroll" }
}

function buildHuluSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(60 * scale)
  const h = Math.round(30 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 60 30">
    <text x="0" y="22" fill="#1CE783" font-family="Inter" font-weight="900" font-size="20" letter-spacing="-1">hulu</text>
  </svg>`
  return { svg, w, h, networkKey: "hulu" }
}

function buildPeacockSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(80 * scale)
  const h = Math.round(30 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 80 30">
    <text x="0" y="22" fill="#FFFFFF" font-family="Inter" font-weight="800" font-size="15">peacock</text>
  </svg>`
  return { svg, w, h, networkKey: "peacock" }
}

export function getNetworkSvgResult(networkName?: string | null, pw: number = 500): NetworkSvgResult | null {
  if (!networkName) return null
  const lower = networkName.toLowerCase().trim()
  if (lower.includes("netflix")) return buildNetflixNSvg(pw)
  if (lower.includes("hbo") || lower === "max") return buildHboSvg(pw)
  if (lower.includes("disney")) return buildDisneySvg(pw)
  if (lower.includes("prime") || lower.includes("amazon")) return buildPrimeVideoSvg(pw)
  if (lower.includes("apple")) return buildAppleTvSvg(pw)
  if (lower.includes("paramount")) return buildParamountSvg(pw)
  if (lower === "rai" || lower.startsWith("rai ")) return buildRaiSvg(pw)
  if (lower.includes("mediaset") || lower.includes("canale 5") || lower.includes("italia 1")) return buildMediasetSvg(pw)
  if (lower.includes("crunchyroll")) return buildCrunchyrollSvg(pw)
  if (lower.includes("hulu")) return buildHuluSvg(pw)
  if (lower.includes("peacock")) return buildPeacockSvg(pw)
  return null
}

export async function renderNetworkLogoBadge(networkName?: string | null, pw: number = 500): Promise<{ png: Buffer; w: number; h: number; networkKey: string } | null> {
  const res = getNetworkSvgResult(networkName, pw)
  if (!res) return null
  const png = await renderSVG(res.svg, res.w)
  return { png, w: res.w, h: res.h, networkKey: res.networkKey }
}
