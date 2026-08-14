import sharp from "sharp"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cacheClear } from "@/lib/cache"

// Mock solo extractBadgeColor: gli altri export di poster-render-helpers restano
// reali (STD_W/STD_H, isValidHex, fitBadgeToCanvas, ...).
vi.mock("@/lib/poster-render-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/poster-render-helpers")>()
  return {
    ...actual,
    extractBadgeColor: vi.fn(async () => "#123456"),
  }
})

import { extractBadgeColor } from "@/lib/poster-render-helpers"
import {
  backdropMetaCached,
  resizeBackdropCached,
  resizeLogoCached,
  resolveBadgeColors,
} from "@/lib/poster-service"

const mockedExtract = vi.mocked(extractBadgeColor)

function solidPng(width: number, height: number, color = "#102030"): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color },
  }).png().toBuffer()
}

beforeEach(() => {
  cacheClear()
  mockedExtract.mockClear()
  mockedExtract.mockResolvedValue("#123456")
})

describe("resolveBadgeColors (cache colori accent)", () => {
  it("computes once and reuses the cached pair for the same srcs", async () => {
    const poster = await solidPng(100, 150)
    const logo = await solidPng(40, 20, "#ff0000")

    const first = await resolveBadgeColors(poster, logo, "Action", "/p1.jpg", "/l1.png")
    const second = await resolveBadgeColors(poster, logo, "Action", "/p1.jpg", "/l1.png")

    expect(first).toEqual({ genreColor: "#123456", rankColor: "#123456" })
    expect(second).toEqual(first)
    // Una sola computazione (bottom + top), la seconda chiamata è cache hit
    expect(mockedExtract).toHaveBeenCalledTimes(2)
  })

  it("separates entries by poster src, logo src and genre", async () => {
    const poster = await solidPng(100, 150)

    await resolveBadgeColors(poster, null, "Action", "/p1.jpg", null)
    await resolveBadgeColors(poster, null, "Action", "/p2.jpg", null)
    await resolveBadgeColors(poster, null, "Action", "/p1.jpg", "/l.png")
    await resolveBadgeColors(poster, null, "Drama", "/p1.jpg", null)

    expect(mockedExtract).toHaveBeenCalledTimes(8)
  })

  it("does not cache when posterSrc is missing", async () => {
    const poster = await solidPng(100, 150)

    await resolveBadgeColors(poster, null, "Action", null, null)
    await resolveBadgeColors(poster, null, "Action", null, null)

    expect(mockedExtract).toHaveBeenCalledTimes(4)
  })

  it("applies the genre fallback when extraction returns an invalid color", async () => {
    mockedExtract.mockResolvedValue("not-a-color")
    const poster = await solidPng(100, 150)

    const colors = await resolveBadgeColors(poster, null, "UnknownGenre", "/p1.jpg", null)

    expect(colors).toEqual({ genreColor: "#555555", rankColor: "#555555" })
  })
})

describe("resizeLogoCached (cache resize logo)", () => {
  it("returns the same cached buffer for the same src + target size", async () => {
    const logo = await solidPng(100, 50, "#ff0000")

    const first = await resizeLogoCached(logo, 60, 30, "/l.png")
    const second = await resizeLogoCached(logo, 60, 30, "/l.png")

    // Identità di riferimento: la seconda chiamata è un cache hit
    expect(second.input).toBe(first.input)
    expect(first.w).toBeLessThanOrEqual(60)
    expect(first.h).toBeLessThanOrEqual(30)
    const meta = await sharp(first.input).metadata()
    expect(meta.width).toBe(first.w)
    expect(meta.height).toBe(first.h)
  })

  it("separates entries by target size", async () => {
    const logo = await solidPng(100, 50, "#ff0000")

    const small = await resizeLogoCached(logo, 30, 15, "/l.png")
    const large = await resizeLogoCached(logo, 60, 30, "/l.png")

    expect(large.input).not.toBe(small.input)
    const smallMeta = await sharp(small.input).metadata()
    expect(smallMeta.width).toBe(30)
  })

  it("does not cache when logoSrc is missing", async () => {
    const logo = await solidPng(100, 50, "#ff0000")

    const first = await resizeLogoCached(logo, 60, 30, null)
    const second = await resizeLogoCached(logo, 60, 30, null)

    expect(second.input).not.toBe(first.input)
  })
})

describe("resizeBackdropCached (cache resize backdrop)", () => {
  it("returns the same cached buffer for the same src + target size", async () => {
    const backdrop = await solidPng(200, 100, "#00ff00")

    const first = await resizeBackdropCached(backdrop, 500, 250, "/b.jpg")
    const second = await resizeBackdropCached(backdrop, 500, 250, "/b.jpg")

    expect(second.input).toBe(first.input)
    const meta = await sharp(first.input).metadata()
    expect(meta.width).toBe(500)
    expect(meta.height).toBe(250)
  })
})

describe("backdropMetaCached (cache metadata backdrop)", () => {
  it("caches metadata by src", async () => {
    const backdrop = await solidPng(320, 180, "#00ff00")

    const first = await backdropMetaCached(backdrop, "/b.jpg")
    const second = await backdropMetaCached(backdrop, "/b.jpg")

    expect(first).toEqual({ width: 320, height: 180 })
    expect(second).toBe(first)
  })

  it("rejects on invalid image data (same as the previous direct sharp call)", async () => {
    const backdrop = Buffer.from("not-an-image")

    await expect(backdropMetaCached(backdrop, "/b.jpg")).rejects.toThrow()
  })
})
