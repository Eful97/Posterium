import sharp from "sharp"
import { describe, expect, it } from "vitest"
import {
  STD_H,
  STD_W,
  fitCompositeToCanvas,
  topLuminance,
} from "@/lib/poster-render-helpers"

function solidPng(width: number, height: number, color: string): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color,
    },
  }).png().toBuffer()
}

describe("poster render helpers", () => {
  it("passes layer through unchanged when within canvas bounds", async () => {
    const input = await solidPng(20, 20, "#ff0000")
    const result = await fitCompositeToCanvas({ input, left: 0, top: 0 }, 30, 30)

    expect(result).not.toBeNull()
    expect(result!.left).toBe(0)
    expect(result!.top).toBe(0)
    // Sharp's native .composite() handles overflow clipping — the helper just validates
  })

  it("returns null for zero-size layer", async () => {
    const input = Buffer.from([])
    const result = await fitCompositeToCanvas({ input, left: 0, top: 0 }, 30, 30)
    expect(result).toBeNull()
  })

  it("composites overlay over base using sharp native pipeline", async () => {
    const base = await solidPng(STD_W, STD_H, "#000000")
    const overlay = await solidPng(8, 8, "#ff0000")
    // Use PNG output to avoid JPEG compression altering pixel values
    const output = await sharp(base)
      .composite([{ input: overlay, top: 20, left: 10 }])
      .png()
      .toBuffer()
    const metadata = await sharp(output).metadata()
    const pixel = await sharp(output).extract({ left: 10, top: 20, width: 1, height: 1 }).raw().toBuffer()

    expect(metadata.width).toBe(STD_W)
    expect(metadata.height).toBe(STD_H)
    // Red overlay on black background at full alpha
    expect(pixel[0]).toBe(255)
    expect(pixel[1]).toBe(0)
    expect(pixel[2]).toBe(0)
  })

  it("detects whether the top edge is light or dark", async () => {
    const light = await solidPng(STD_W, STD_H, "#ffffff")
    const dark = await solidPng(STD_W, STD_H, "#000000")

    expect(await topLuminance(light)).toBeGreaterThan(0.9)
    expect(await topLuminance(dark)).toBeLessThan(0.1)
  })
})
