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
  const w = Math.round(92 * scale)
  const h = Math.round(34 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1041 565">
    <text x="30" y="440" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="900" font-size="340" letter-spacing="-10">Disney<tspan fill="#1175E8" font-weight="900">+</tspan></text>
  </svg>`
  return { svg, w, h, networkKey: "disney" }
}

function buildPrimeVideoSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(98 * scale)
  const h = Math.round(30 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 800 246">
    <g fill="#00A8E1">
      <path d="M408.5,245.9c-4-0.1-8-0.1-12,0c-5.5-0.3-11-0.5-16.5-0.9c-14.6-1.1-29.1-3.3-43.3-6.6c-49.1-11.4-92.2-34.3-129.8-67.6c-3.5-3.1-6.8-6.3-10.2-9.5c-0.8-0.7-1.5-1.7-1.9-2.7c-0.6-1.4-0.3-2.9,0.7-4c1-1.1,2.6-1.5,4-0.9c0.9,0.4,1.8,0.8,2.6,1.3c35.9,22.2,75.1,38.4,116.2,48c13.8,3.2,27.7,5.7,41.7,7.5c20.1,2.5,40.4,3.4,60.6,2.7c10.9-0.3,21.7-1.3,32.5-2.7c25.2-3.2,50.1-8.9,74.2-16.9c12.7-4.2,25.1-9,37.2-14.6c1.8-1,4-1.3,6-0.8c3.3,0.8,5.3,4.2,4.5,7.5c-0.1,0.4-0.3,0.9-0.5,1.3c-0.8,1.5-1.9,2.8-3.3,3.8c-11.5,9-23.9,16.9-37,23.5c-24.7,12.5-51.1,21.4-78.3,26.5C440.2,243.6,424.4,245.3,408.5,245.9z"/>
      <path d="M580.4,148.4c6.6,0.2,13.1,0.6,19.5,2.3c1.8,0.5,3.5,1.1,5.2,1.9c2.3,0.9,3.8,3.1,4.1,5.5c0.4,2.8,0.5,5.7,0.3,8.6c-1.3,17.1-6.6,33.6-15.4,48.3c-3.2,5.3-7.1,10.1-11.6,14.3c-0.9,0.9-2,1.6-3.2,2c-1.9,0.5-3.1-0.5-3.2-2.4c0.1-1,0.3-2,0.7-3c3.5-9.4,6.9-18.7,9.6-28.4c1.6-5.3,2.7-10.7,3.4-16.2c0.2-2,0.3-4,0.1-6c-0.1-3.4-2.3-6.3-5.6-7.3c-3.1-1-6.3-1.6-9.6-1.8c-9.2-0.4-18.4,0-27.5,1.2l-12.1,1.5"/>
    </g>
    <text x="5" y="125" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="900" font-size="110" letter-spacing="-2">prime video</text>
  </svg>`
  return { svg, w, h, networkKey: "prime" }
}

function buildAppleTvSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(72 * scale)
  const h = Math.round(34 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 54 27">
    <g fill="#FFFFFF">
      <path d="M14.89 4.31C15.82 3.15 16.45 1.59 16.28 0c-1.35.07-3.01.89-3.97 2.06-.86.99-1.62 2.62-1.43 4.14 1.53.13 3.05-.76 4.01-1.89"/>
      <path d="M16.26 6.5c-2.21-.13-4.1 1.26-5.15 1.26-1.06 0-2.68-1.19-4.43-1.16-2.28.03-4.39 1.32-5.55 3.37-2.38 4.1-.63 10.18 1.68 13.51 1.12 1.65 2.48 3.47 4.26 3.4 1.68-.07 2.35-1.09 4.39-1.09 2.05 0 2.64 1.09 4.42 1.06 1.85-.03 3.01-1.6 4.14-3.25 1.3-1.89 1.83-3.72 1.86-3.82-.04-.02-3.57-1.37-3.61-5.46-.03-3.42 2.79-5.06 2.92-5.15-1.6-2.34-4.08-2.6-4.94-2.67zM30.63 8.35h3.69v13.57h-3.69zM26.24 11.23h12.47v2.86H26.24zM40.94 8.35h3.81l3.52 10.27 3.52-10.27h3.81l-5.63 15.01h-3.41z"/>
    </g>
  </svg>`
  return { svg, w, h, networkKey: "apple" }
}

function buildParamountSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(95 * scale)
  const h = Math.round(34 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1000 622">
    <g fill="#0064FF">
      <path d="M283.89,219.39c-2.46-1.02-6.49-5.54,0.22-18.14l15.58-32.56c0.47-0.98-0.66-2.22-1.37-1.38l-13.62,13.7c-6.45,6.73-17.38,25.64-19.5,29.13L248.64,237.5c1.23-0.04,2.26,0.93,2.3,2.16c0.01,0.4-0.09,0.8-0.28,1.16l-15.13,25.4c-3.69,6.3,2.94,10.7,3.84,9.25c23.77-38.29,37.6-35.23,37.6-35.23l7.94-18.38c0.42-0.92,0.01-2.01-0.91-2.42z"/>
    </g>
    <text x="350" y="380" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="900" font-size="280" letter-spacing="-8">Paramount<tspan fill="#0064FF">+</tspan></text>
  </svg>`
  return { svg, w, h, networkKey: "paramount" }
}

function buildRaiSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(58 * scale)
  const h = Math.round(30 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 58 30">
    <rect x="0" y="2" width="56" height="26" rx="5" fill="#003399"/>
    <text x="28" y="20" fill="#FFFFFF" font-family="Inter, sans-serif" font-weight="900" font-size="16" text-anchor="middle">Rai</text>
  </svg>`
  return { svg, w, h, networkKey: "rai" }
}

function buildCrunchyrollSvg(pw: number): NetworkSvgResult {
  const scale = pw / 380
  const w = Math.round(36 * scale)
  const h = Math.round(36 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="#F47521"/>
    <circle cx="22" cy="18" r="9" fill="#FFFFFF"/>
    <circle cx="24" cy="18" r="5" fill="#F47521"/>
  </svg>`
  return { svg, w, h, networkKey: "crunchyroll" }
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
  if (lower.includes("crunchyroll")) return buildCrunchyrollSvg(pw)
  return null
}

export async function renderNetworkLogoBadge(networkName?: string | null, pw: number = 500): Promise<{ png: Buffer; w: number; h: number; networkKey: string } | null> {
  const res = getNetworkSvgResult(networkName, pw)
  if (!res) return null
  const png = await renderSVG(res.svg, res.w)
  return { png, w: res.w, h: res.h, networkKey: res.networkKey }
}

export function findMatchingNetworkSvg(names: (string | null | undefined)[], pw: number = 500): { res: NetworkSvgResult; matchedName: string } | null {
  for (const name of names) {
    if (!name) continue
    const res = getNetworkSvgResult(name, pw)
    if (res) return { res, matchedName: name }
  }
  return null
}

export async function renderFirstMatchingNetworkLogoBadge(names: (string | null | undefined)[], pw: number = 500): Promise<{ png: Buffer; w: number; h: number; networkKey: string; matchedName: string } | null> {
  const match = findMatchingNetworkSvg(names, pw)
  if (!match) return null
  const png = await renderSVG(match.res.svg, match.res.w)
  return { png, w: match.res.w, h: match.res.h, networkKey: match.res.networkKey, matchedName: match.matchedName }
}
