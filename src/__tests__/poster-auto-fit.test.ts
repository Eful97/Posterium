import { describe, expect, it, beforeEach } from "vitest"
import sharp from "sharp"
import { selectBestLogoFitPosterPath, clearAutoFitCache } from "@/lib/poster-auto-fit"

async function solidPoster(color: string, w = 500, h = 750): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: color },
  }).jpeg().toBuffer()
}

async function solidLogo(color: string): Promise<Buffer> {
  return sharp({
    create: { width: 300, height: 120, channels: 4, background: color },
  }).png().toBuffer()
}

async function posterWithTextBlock(bgColor: string, textColor: string, y: number): Promise<Buffer> {
  const svg = `<svg width="500" height="750">
    <rect width="500" height="750" fill="${bgColor}"/>
    <rect x="50" y="${y}" width="400" height="60" fill="${textColor}"/>
    <rect x="50" y="${y + 10}" width="400" height="40" fill="${textColor}" opacity="0.8"/>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg().toBuffer()
}

function makeImages(map: Map<string, Buffer>) {
  return async (path: string) => {
    const img = map.get(path)
    if (!img) throw new Error(`Missing fixture ${path}`)
    return img
  }
}

beforeEach(() => {
  clearAutoFitCache()
})

describe("selectBestLogoFitPosterPath", () => {
  it("selects the clean poster with stronger logo contrast", async () => {
    const darkPoster = await solidPoster("#050505")
    const lightPoster = await solidPoster("#f8f8f8")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/dark.jpg", darkPoster],
      ["/light.jpg", lightPoster],
      ["/logo.png", logo],
    ])

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/light.jpg", iso_639_1: null },
        { file_path: "/dark.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: makeImages(images),
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/dark.jpg")
  })

  it("returns the only clean poster without scoring", async () => {
    let fetchCount = 0

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/single.jpg", iso_639_1: null },
        { file_path: "/it.jpg", iso_639_1: "it" },
      ],
      logoPath: "/logo.png",
      fetchImage: async () => { fetchCount += 1; return Buffer.alloc(0) },
      hasBadges: true,
    })

    expect(selected).toBe("/single.jpg")
    expect(fetchCount).toBe(0)
  })

  it("cache hit avoids new fetches", async () => {
    const darkPoster = await solidPoster("#111111")
    const lightPoster = await solidPoster("#eeeeee")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/dark.jpg", darkPoster],
      ["/light.jpg", lightPoster],
      ["/logo.png", logo],
    ])

    let fetchCount = 0
    const countingFetch = async (path: string) => {
      fetchCount += 1
      const img = images.get(path)
      if (!img) throw new Error(`Missing ${path}`)
      return img
    }

    const input = {
      posters: [
        { file_path: "/light.jpg", iso_639_1: null },
        { file_path: "/dark.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: countingFetch,
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    }

    const first = await selectBestLogoFitPosterPath(input)
    const callsAfterFirst = fetchCount

    const second = await selectBestLogoFitPosterPath(input)

    expect(first).toBe("/dark.jpg")
    expect(second).toBe("/dark.jpg")
    expect(fetchCount).toBe(callsAfterFirst)
  })

  it("returns fallback when logo fetch fails", async () => {
    const poster = await solidPoster("#333333")
    const images = new Map([["/poster.jpg", poster]])

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/poster.jpg", iso_639_1: null },
        { file_path: "/poster2.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: async (path) => {
        const img = images.get(path)
        if (!img) throw new Error("fetch failed")
        return img
      },
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: false,
    })

    expect(selected).toBe("/poster.jpg")
  })

  it("handles partial poster fetch failures gracefully", async () => {
    const poster1 = await solidPoster("#0a0a0a")
    const poster2 = await solidPoster("#1a1a1a")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/poster1.jpg", poster1],
      ["/logo.png", logo],
    ])

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/poster1.jpg", iso_639_1: null },
        { file_path: "/poster2.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: makeImages(images),
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/poster1.jpg")
  })

  it("returns fallback when all poster fetches fail", async () => {
    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/a.jpg", iso_639_1: null },
        { file_path: "/b.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: async () => { throw new Error("nope") },
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/a.jpg")
  })

  it("filters out non-clean posters from candidates", async () => {
    const clean = await solidPoster("#050505")
    const withLang = await solidPoster("#050505")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/clean.jpg", clean],
      ["/lang.jpg", withLang],
      ["/logo.png", logo],
    ])

    let fetchCount = 0
    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/lang.jpg", iso_639_1: "en" },
        { file_path: "/clean.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: async (path) => {
        fetchCount += 1
        const img = images.get(path)
        if (!img) throw new Error(`Missing ${path}`)
        return img
      },
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/clean.jpg")
    expect(fetchCount).toBe(0)
  })

  it("poster with strong horizontal bands (fake text) gets penalized vs clean", async () => {
    const textPoster = await posterWithTextBlock("#222222", "#cccccc", 450)
    const cleanPoster = await solidPoster("#222222")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/text.jpg", textPoster],
      ["/clean.jpg", cleanPoster],
      ["/logo.png", logo],
    ])

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/text.jpg", iso_639_1: null },
        { file_path: "/clean.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: makeImages(images),
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/clean.jpg")
  })
})
