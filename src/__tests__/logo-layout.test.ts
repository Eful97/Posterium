import { describe, expect, it } from "vitest"
import { computeLogoBox, computeLogoOffsetBounds } from "@/lib/logo-layout"

describe("logo layout", () => {
  it("keeps growing wide logos past the old 25 percent height cap", () => {
    const box = computeLogoBox({
      posterW: 1000,
      posterH: 1500,
      logoW: 1000,
      logoH: 500,
      logoScale: 100,
    })

    expect(box).toEqual({ width: 1000, height: 500 })
  })

  it("uses the same uncapped logo size for movement bounds", () => {
    const bounds = computeLogoOffsetBounds({
      posterW: 1000,
      posterH: 1500,
      logoW: 1000,
      logoH: 500,
      logoScale: 100,
      hasBadges: true,
    })

    expect(bounds.minX).toBe(0)
    expect(bounds.maxX).toBe(0)
    expect(bounds.minY).toBe(-850)
    expect(bounds.maxY).toBe(150)
  })
})
