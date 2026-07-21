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
  const w = Math.round(96 * scale)
  const h = Math.round(36 * scale)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="330 220 415 250">
    <path fill="#FFFFFF" d="M735.8 365.7 C721.4 369 683.5 370.9 683.5 370.9 L678.7 385.9 C678.7 385.9 697.6 384.3 711.4 385.7 711.4 385.7 715.9 385.2 716.4 390.8 716.6 396 716 401.6 716 401.6 716 401.6 715.7 405 710.9 405.8 705.7 406.7 670.1 408 670.1 408 L664.3 427.5 C664.3 427.5 662.2 432 667 430.7 671.5 429.5 708.8 422.5 713.7 423.5 718.9 424.8 724.7 431.7 723 438.1 721 445.9 683.8 469.7 661.1 468 661.1 468 649.2 468.8 639.1 452.7 629.7 437.4 642.7 408.3 642.7 408.3 642.7 408.3 636.8 394.7 641.1 390.2 641.1 390.2 643.7 387.9 651.1 387.3 L660.2 368.4 C660.2 368.4 649.8 369.1 643.6 361.5 637.8 354.2 637.4 350.9 641.8 348.9 646.5 346.6 689.8 338.7 719.6 339.7 719.6 339.7 730 338.7 738.9 356.7 738.8 356.7 743.2 364 735.8 365.7 Z M623.7 438.3 C619.9 447.3 609.8 456.9 597.3 450.9 584.9 444.9 565.2 404.6 565.2 404.6 565.2 404.6 557.7 389.6 556.3 389.9 556.3 389.9 554.7 387 553.7 403.4 552.7 419.8 553.9 451.7 547.4 456.7 541.2 461.7 533.7 459.7 529.8 453.8 526.3 448 524.8 434.2 526.7 410 529 385.8 534.6 360 541.8 351.9 549 343.9 554.8 349.7 557 351.8 557 351.8 566.6 360.5 582.5 386.1 L585.3 390.8 C585.3 390.8 599.7 415 601.2 414.9 601.2 414.9 602.4 416 603.4 415.2 604.9 414.8 604.3 407 604.3 407 604.3 407 601.3 380.7 588.2 336.1 588.2 336.1 586.2 330.5 587.6 325.3 588.9 320 594.2 322.5 594.2 322.5 594.2 322.5 614.6 332.7 624.4 365.9 634.1 399.4 627.5 429.3 623.7 438.3 Z M523.5 353 C521.8 356.4 520.8 361.3 512.2 362.6 512.2 362.6 429.9 368.2 426 374 426 374 423.1 377.4 427.6 378.4 432.1 379.3 450.7 381.8 459.7 382.3 469.3 382.4 501.7 382.7 513.3 397.2 513.3 397.2 520.2 404.1 519.9 419.7 519.6 435.7 516.8 441.3 510.6 447.1 504.1 452.5 448.3 477.5 412.3 439.1 412.3 439.1 395.7 420.6 418 406.6 418 406.6 434.1 396.9 475 408.3 475 408.3 487.4 412.8 486.8 417.3 486.1 422.1 476.6 427.2 462.8 426.9 449.4 426.5 439.6 420.1 441.5 421.1 443.3 421.8 427.1 413.3 422.1 419.1 417.1 424.4 418.3 427.7 423.2 431 435.7 438.1 484 435.6 498.4 419.6 498.4 419.6 504.1 413.1 495.4 407.8 486.7 402.8 461.8 399.8 452.1 399.3 442.8 398.8 408.2 399.4 403.2 390.2 403.2 390.2 398.2 384 403.7 366.4 409.5 348 449.8 340.9 467.2 339.3 467.2 339.3 515.1 337.6 523.9 347.4 523.8 347.4 525 349.7 523.5 353 Z M387.5 460.9 C381.7 465.2 369.4 463.3 365.9 458.5 362.4 454.2 361.2 437.1 361.9 410.3 362.6 383.2 363.2 349.6 369 344.3 375.2 338.9 379 343.6 381.4 347.3 384 350.9 387.1 354.9 387.8 363.4 388.4 371.9 390.4 416.5 390.4 416.5 390.4 416.5 393 456.7 387.5 460.9 Z M400 317.1 C383.1 322.7 371.5 320.8 361.7 316.6 357.4 324.1 354.9 326.4 351.6 326.9 346.8 327.4 342.5 319.7 341.7 317.2 340.9 315.3 338.6 312.1 341.4 304.5 331.8 295.9 331.1 284.3 332.7 276.5 335.1 267.5 351.3 233.3 400.6 229.3 400.6 229.3 424.7 227.5 428.8 240.4 L429.5 240.4 C429.5 240.4 452.9 240.5 452."/>
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-161.599 -100.544 1000 622.214">
    <path fill="#0064FF" d="M283.887,219.392c-2.459-1.02-6.49-5.543,0.216-18.138l15.578-32.558c0.473-0.984-0.664-2.216-1.374-1.38l-13.621,13.695c-6.445,6.727-17.378,25.635-19.495,29.134L248.643,237.5c1.229-0.039,2.258,0.927,2.297,2.156c0.012,0.405-0.085,0.805-0.283,1.159l-15.125,25.404c-3.693,6.3,2.942,10.704,3.841,9.254c23.773-38.291,37.6-35.234,37.6-35.234l7.936-18.377c0.418-0.921,0.01-2.006-0.911-2.424C283.964,219.421,283.926,219.407,283.887,219.392z M337.935-100.544c-135.92,0-246.104,110.13-246.104,245.983c-0.072,52.591,16.8,103.807,48.115,146.058c10.324-4.456,16.061-11.117,20.159-16.218l45.823-58.576c0.965-1.235,2.225-2.206,3.665-2.825l6.898-2.967l75.345-95.524l10.925-8.549l22.45-31.233c0.58-0.808,1.287-1.519,2.094-2.104l9.795-7.117c2.42-1.758,5.688-1.786,8.136-0.068l11.886,8.339c6.306,4.423,11.417,10.338,14.88,17.217l47.61,83.586c0.777,1.595,2.098,2.86,3.724,3.568c9.337,4.646,15.041,5.467,27.261,18.735c5.702,6.186,30.688,34.117,65.705,77.526c5.089,6.964,11.902,12.484,19.769,16.02c31.22-42.219,48.034-93.359,47.96-145.868C584.031,9.585,473.852-100.544,337.935-100.544z"/>
     <path fill="#FFFFFF" d="M158.201,158.997l-15.957-5.18l-9.857,13.56v-16.758l-15.958-5.181l15.958-5.181v-16.763l9.857,13.563l15.957-5.18l-9.859,13.562L158.201,158.997z"/>
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
