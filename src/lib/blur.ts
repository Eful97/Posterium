import sharp from "sharp"
import { STD_W, STD_H } from "./poster-render-helpers"

export interface BlurParams {
  posterBuf: Buffer
  blurEnabled: boolean
  blurHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number
}

/**
 * Build the bottom-blur RGBA overlay (with vertical fade + darken).
 *
 * Replaces the original pixel-by-pixel JS loop over the full image with
 * a small RGBA overlay composited via Sharp's native libvips pipeline.
 *
 * ## Contract
 *
 * This returns the RAW overlay buffer, not a composited base image: the caller
 * (poster-service) lo aggiunge come primo layer del composite finale, così il
 * blur non genera un PNG intermedio che il modulate successivo deve ri-decodare.
 *
 * ## Algorithm
 *
 * 1. Extract bottom `gh` rows from the poster → blur via Sharp (C++)
 *    and read raw pixels directly (no PNG intermediate).
 * 2. Build an RGBA overlay buffer (gh × STD_W):
 *      RGB = blurred_pixel × shade          (darken per row)
 *      A   = fade × 255                     (opacity per row)
 *
 * ## Math equivalence
 *
 * Original:  out = base × (1 - fade) + (blur × shade) × fade
 * New:       overlay_rgba = {rgb: blur × shade, a: fade}
 *            out = composite(overlay OVER base)
 *            out = overlay_rgb × fade + base × (1 - fade)
 *
 * ## Performance
 *
 * Before: 2× PNG encode + 2× PNG decode + 4.5M JS ops  → ~200 ms
 * After:  1 raw() read (~500 KB)        + 560K JS ops  → ~8-15 ms
 */
export interface BlurOverlay {
  /** Raw RGBA pixels (STD_W × height), da passare a `composite()` con raw. */
  readonly overlay: Buffer
  readonly top: number
  readonly height: number
}

export async function applyBlur(params: BlurParams): Promise<BlurOverlay | null> {
  const { posterBuf, blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness } = params
  if (!blurEnabled) return null

  const gh = Math.min(Math.max(Math.round(STD_H * blurHeight / 100), 100), STD_H)
  const gradTop = STD_H - gh
  const fadedPct = Math.min(Math.max(blurFade, 0), 100)
  const darkAlpha = Math.min(blurDarkness / 100, 1)
  const fadeStop = fadedPct / 100

  // Step 1: extract bottom region, blur it, read raw pixels directly (C++, no PNG intermediate)
  const { data: blurPx } = await sharp(posterBuf)
    .extract({ left: 0, top: gradTop, width: STD_W, height: gh })
    .resize(STD_W, gh, { fit: "fill" })
    .blur(blurIntensity)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Step 2: build RGBA overlay buffer
  //   RGB = blur × shade (darken by y), A = fade × 255 (opacity by y)
  const overlay = Buffer.alloc(gh * STD_W * 4)
  for (let y = 0; y < gh; y++) {
    const yPct = gh <= 1 ? 1 : y / (gh - 1)
    const fade = fadeStop <= 0 ? 1 : Math.min(yPct / fadeStop, 1)
    const shade = 1 - darkAlpha * fade
    const alpha = Math.round(fade * 255)
    for (let x = 0; x < STD_W; x++) {
      const si = (y * STD_W + x) * 3
      const di = (y * STD_W + x) * 4
      overlay[di] = Math.round(blurPx[si] * shade)
      overlay[di + 1] = Math.round(blurPx[si + 1] * shade)
      overlay[di + 2] = Math.round(blurPx[si + 2] * shade)
      overlay[di + 3] = alpha
    }
  }

  return { overlay, top: gradTop, height: gh }
}
