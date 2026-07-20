import crypto from "node:crypto"
import sharp from "sharp"
import { findAccentColor } from "@/lib/accent-color"
import { GENRE_FALLBACK } from "@/lib/badges"

const IMG_BASE = "https://image.tmdb.org/t/p"
const MAX_IMG_SIZE = 10 * 1024 * 1024

export const STD_W = 500
export const STD_H = 750
export const OUTPUT_W = 500
export const OUTPUT_H = 750

export type BadgeRender = { png: Buffer; w: number; h: number; isRank?: boolean }
export type PosterComposite = { input: Buffer; top: number; left: number }

export function hashKey(key: string): string {
  return crypto.createHash("md5").update(key).digest("hex").slice(0, 16)
}

export async function fetchImg(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  const cl = res.headers.get("content-length")
  if (cl && Number(cl) > MAX_IMG_SIZE) throw new Error("image too large")
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_IMG_SIZE) throw new Error("image too large")
  return buf
}

export function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color)
}

export function imgSrc(path: string): string {
  if (path.startsWith("http")) return path
  return `${IMG_BASE}/w500${path}`
}

export async function fitBadgeToCanvas<T extends BadgeRender>(badge: T, maxW: number, maxH: number): Promise<T> {
  if (badge.w <= maxW && badge.h <= maxH) return badge
  const scale = Math.min(maxW / badge.w, maxH / badge.h)
  const w = Math.max(Math.floor(badge.w * scale), 1)
  const h = Math.max(Math.floor(badge.h * scale), 1)
  const png = await sharp(badge.png)
    .resize(w, h, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 1 })
    .toBuffer()
  return { ...badge, png, w, h }
}

export async function fitCompositeToCanvas(
  layer: PosterComposite,
  maxW: number,
  maxH: number,
): Promise<PosterComposite | null> {
  const meta = await sharp(layer.input).metadata()
  const layerW = meta.width || 0
  const layerH = meta.height || 0
  if (layerW <= 0 || layerH <= 0) return null

  const left = Math.max(layer.left, 0)
  const top = Math.max(layer.top, 0)
  const trimLeft = Math.max(-layer.left, 0)
  const trimTop = Math.max(-layer.top, 0)
  const width = Math.min(layerW - trimLeft, maxW - left)
  const height = Math.min(layerH - trimTop, maxH - top)

  if (width <= 0 || height <= 0) return null
  const needsExtract = left !== layer.left || top !== layer.top || width !== layerW || height !== layerH
  if (!needsExtract) return { ...layer, top, left }

  const input = await sharp(layer.input)
    .extract({ left: trimLeft, top: trimTop, width, height })
    .png({ compressionLevel: 1 })
    .toBuffer()
  return { input, top, left }
}

export async function renderCompositeLayers(
  base: Buffer,
  layers: PosterComposite[],
  width: number,
  height: number,
): Promise<Buffer> {
  const { data: basePixels } = await sharp(base)
    .resize(width, height, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (const layer of layers) {
    const { data: layerPixels, info } = await sharp(layer.input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const layerW = info.width
    const layerH = info.height
    const startX = Math.max(layer.left, 0)
    const startY = Math.max(layer.top, 0)
    const endX = Math.min(layer.left + layerW, width)
    const endY = Math.min(layer.top + layerH, height)

    for (let y = startY; y < endY; y += 1) {
      const layerY = y - layer.top
      for (let x = startX; x < endX; x += 1) {
        const layerX = x - layer.left
        const src = (layerY * layerW + layerX) * 4
        const dst = (y * width + x) * 4
        const alpha = (layerPixels[src + 3] ?? 255) / 255
        if (alpha <= 0) continue
        const invAlpha = 1 - alpha
        basePixels[dst] = Math.round((layerPixels[src] ?? 0) * alpha + (basePixels[dst] ?? 0) * invAlpha)
        basePixels[dst + 1] = Math.round((layerPixels[src + 1] ?? 0) * alpha + (basePixels[dst + 1] ?? 0) * invAlpha)
        basePixels[dst + 2] = Math.round((layerPixels[src + 2] ?? 0) * alpha + (basePixels[dst + 2] ?? 0) * invAlpha)
        basePixels[dst + 3] = 255
      }
    }
  }

  return sharp(basePixels, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 1 })
    .toBuffer()
}

export async function topLuminance(buf: Buffer): Promise<number> {
  const stripH = Math.max(Math.round(STD_H * 0.08), 3)
  const extracted = await sharp(buf)
    .extract({ left: 0, top: 0, width: STD_W, height: stripH })
    .raw()
    .toBuffer()
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < extracted.length; i += 4) {
    r += extracted[i] ?? 0
    g += extracted[i + 1] ?? 0
    b += extracted[i + 2] ?? 0
    n += 1
  }
  r = Math.round(r / n)
  g = Math.round(g / n)
  b = Math.round(b / n)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

export async function extractBadgeColor(
  posterBuf: Buffer,
  logoBuf?: Buffer | null,
  fallbackGenre?: string | null,
  region?: 'bottom' | 'top',
): Promise<string> {
  async function extractFrom(buf: Buffer, w: number, h: number, genre: string): Promise<string> {
    const pixels = await sharp(buf).ensureAlpha().raw().toBuffer()
    const result = findAccentColor(pixels, w, h, genre)
    return `#${result.r.toString(16).padStart(2, "0")}${result.g.toString(16).padStart(2, "0")}${result.b.toString(16).padStart(2, "0")}`
  }

  const thumbBuf = await sharp(posterBuf).resize(200, 300, { fit: "cover" }).toBuffer()

  // Crop to target region for more focused color extraction
  let posterAnalysisBuf = thumbBuf
  let posterW = 200
  let posterH = 300
  if (region === 'bottom') {
    posterH = 120  // bottom 40%
    posterAnalysisBuf = await sharp(thumbBuf)
      .extract({ left: 0, top: 180, width: 200, height: posterH })
      .toBuffer()
  } else if (region === 'top') {
    posterH = 120  // top 40%
    posterAnalysisBuf = await sharp(thumbBuf)
      .extract({ left: 0, top: 0, width: 200, height: posterH })
      .toBuffer()
  }

  const [posterColor, logoColor] = await Promise.all([
    extractFrom(posterAnalysisBuf, posterW, posterH, fallbackGenre || ""),
    logoBuf ? (async () => {
      const meta = await sharp(logoBuf).metadata()
      return extractFrom(logoBuf, meta.width || 200, meta.height || 100, "")
    })() : Promise.resolve(""),
  ])

  if (posterColor && logoColor) {
    const pr = parseInt(posterColor.slice(1, 3), 16)
    const pg = parseInt(posterColor.slice(3, 5), 16)
    const pb = parseInt(posterColor.slice(5, 7), 16)
    const lr = parseInt(logoColor.slice(1, 3), 16)
    const lg = parseInt(logoColor.slice(3, 5), 16)
    const lb = parseInt(logoColor.slice(5, 7), 16)
    return `#${Math.round((pr + lr) / 2).toString(16).padStart(2, "0")}${Math.round((pg + lg) / 2).toString(16).padStart(2, "0")}${Math.round((pb + lb) / 2).toString(16).padStart(2, "0")}`
  }

  return posterColor || logoColor || (fallbackGenre ? (GENRE_FALLBACK[fallbackGenre] || "#555555") : "#555555")
}
