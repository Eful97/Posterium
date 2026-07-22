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
 * Apply a bottom blur with vertical fade and darken using Sharp composite.
 *
 * Replaces the original pixel-by-pixel JS loop over the full image with
 * a small RGBA overlay composited via Sharp's native libvips pipeline.
 *
 * ## Algorithm
 *
 * 1. Extract bottom `gh` rows from the poster → blur via Sharp (C++).
 * 2. Read the blurred region as raw 3-channel pixels (~500 KB).
 * 3. Build an RGBA overlay buffer (gh × STD_W):
 *      RGB = blurred_pixel × shade          (darken per row)
 *      A   = fade × 255                     (opacity per row)
 * 4. Encode the overlay to PNG and composite over the original via
 *    `sharp(). C++ alpha blending.
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
 * Before: 2 full-image raw() reads (~1.5 MB each) + 4.5M JS ops  → ~200 ms
 * After:  1 small raw() read (~500 KB)        + 560K JS ops     → ~10-20 ms
 *
 * The heavy alpha blending moves from JS to libvips C++.
 */
export async function applyBlur(params: BlurParams): Promise<Buffer | null> {
  const { posterBuf, blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness } = params
  if (!blurEnabled) return null

  const gh = Math.min(Math.max(Math.round(STD_H * blurHeight / 100), 100), STD_H)
  const gradTop = STD_H - gh
  const fadedPct = Math.min(Math.max(blurFade, 0), 100)
  const darkAlpha = Math.min(blurDarkness / 100, 1)
  const fadeStop = fadedPct / 100

  // Step 1: extract bottom region, blur it (C++, fast)
  const blurredBuf = await sharp(posterBuf)
    .extract({ left: 0, top: gradTop, width: STD_W, height: gh })
    .resize(STD_W, gh, { fit: "fill" })
    .blur(blurIntensity)
    .toBuffer()

  // Step 2: read blurred pixels as raw 3-channel RGB (~500 KB)
  const { data: blurPx } = await sharp(blurredBuf)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Step 3: build RGBA overlay buffer
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

  // Step 4: encode overlay to PNG (small 500×225 image)
  const overlayPng = await sharp(overlay, { raw: { width: STD_W, height: gh, channels: 4 } })
    .png({ compressionLevel: 1 })
    .toBuffer()

  // Step 5: composite overlay over original poster via Sharp (C++, libvips)
  //   output = overlay OVER base
  //   out_rgb = overlay_rgb × overlay_alpha + base_rgb × (1 - overlay_alpha)
  return await sharp(posterBuf)
    .composite([{ input: overlayPng, top: gradTop, left: 0 }])
    .png({ compressionLevel: 1 })
    .toBuffer()
}
