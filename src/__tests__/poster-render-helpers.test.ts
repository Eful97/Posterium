import sharp from "sharp"
import { describe, expect, it } from "vitest"
import {
  STD_H,
  STD_W,
  fitCompositeToCanvas,
  renderCompositeLayers,
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
  it("clips layers that overflow the poster canvas", async () => {
    const input = await solidPng(20, 20, "#ff0000")
    const clipped = await fitCompositeToCanvas({ input, left: -8, top: -5 }, 30, 30)

    if (!clipped) throw new Error("Expected layer to be clipped, not removed")
    const metadata = await sharp(clipped.input).metadata()

    expect(clipped.left).toBe(0)
    expect(clipped.top).toBe(0)
    expect(metadata.width).toBe(12)
    expect(metadata.height).toBe(15)
  })

  it("keeps final poster dimensions stable after manual compositing", async () => {
    const base = await solidPng(STD_W, STD_H, "#000000")
    const overlay = await solidPng(8, 8, "#ff0000")
    const output = await renderCompositeLayers(base, [{ input: overlay, left: 10, top: 20 }], STD_W, STD_H)
    const metadata = await sharp(output).metadata()
    const pixel = await sharp(output).extract({ left: 10, top: 20, width: 1, height: 1 }).raw().toBuffer()

    expect(metadata.width).toBe(STD_W)
    expect(metadata.height).toBe(STD_H)
    expect(pixel[0]).toBeGreaterThan(200)
    expect(pixel[1]).toBeLessThan(20)
    expect(pixel[2]).toBeLessThan(20)
  })

  it("detects whether the top edge is light or dark", async () => {
    const light = await solidPng(STD_W, STD_H, "#ffffff")
    const dark = await solidPng(STD_W, STD_H, "#000000")

    expect(await topLuminance(light)).toBeGreaterThan(0.9)
    expect(await topLuminance(dark)).toBeLessThan(0.1)
  })
})
