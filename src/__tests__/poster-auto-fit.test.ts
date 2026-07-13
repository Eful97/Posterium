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

  it("prefers poster without bottom text when base scores are similar", async () => {
    const cleanPoster = await solidPoster("#1a1a2e")
    const textPoster = await posterWithTextBlock("#1a1a2e", "#e0e0e0", 460)
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/clean.jpg", cleanPoster],
      ["/text.jpg", textPoster],
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

  it("does not penalize poster with light texture below threshold", async () => {
    const subtleTexture = await sharp({
      create: { width: 500, height: 750, channels: 3, background: "#2a2a3e" },
    })
      .composite([{
        input: Buffer.from(`<svg width="500" height="750">
          <rect x="50" y="420" width="400" height="100" fill="#333355" opacity="0.15"/>
        </svg>`),
        top: 0, left: 0,
      }])
      .jpeg().toBuffer()

    const cleanPoster = await solidPoster("#2a2a3e")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/subtle.jpg", subtleTexture],
      ["/clean.jpg", cleanPoster],
      ["/logo.png", logo],
    ])

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/subtle.jpg", iso_639_1: null },
        { file_path: "/clean.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: makeImages(images),
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/subtle.jpg")
  })

  it("cache does not collide between different poster lists with same logo", async () => {
    const posterA1 = await solidPoster("#111111")
    const posterA2 = await solidPoster("#222222")
    const posterB1 = await solidPoster("#333333")
    const posterB2 = await solidPoster("#444444")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/a1.jpg", posterA1],
      ["/a2.jpg", posterA2],
      ["/b1.jpg", posterB1],
      ["/b2.jpg", posterB2],
      ["/logo.png", logo],
    ])

    const inputA = {
      posters: [
        { file_path: "/a1.jpg", iso_639_1: null },
        { file_path: "/a2.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: makeImages(images),
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    }

    const inputB = {
      posters: [
        { file_path: "/b1.jpg", iso_639_1: null },
        { file_path: "/b2.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: makeImages(images),
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    }

    const resultA = await selectBestLogoFitPosterPath(inputA)
    const resultB = await selectBestLogoFitPosterPath(inputB)

    expect(resultA).toBe("/a1.jpg")
    expect(resultB).toBe("/b1.jpg")
  })

  it("includes first 8 TMDB posters even if metadata is worse", async () => {
    const darkPoster = await solidPoster("#050505")
    const lightPoster = await solidPoster("#f5f5f5")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/logo.png", logo],
    ])
    for (let i = 0; i < 12; i++) {
      images.set(`/p${i}.jpg`, i === 7 ? darkPoster : lightPoster)
    }

    const selected = await selectBestLogoFitPosterPath({
      posters: Array.from({ length: 12 }, (_, i) => ({
        file_path: `/p${i}.jpg`,
        iso_639_1: null,
        vote_average: i === 7 ? 1 : 9,
        width: i === 7 ? 200 : 1000,
        height: i === 7 ? 300 : 1500,
      })),
      logoPath: "/logo.png",
      fetchImage: makeImages(images),
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/p7.jpg")
  })

  it("only analyzes the first 8 valid TMDB clean posters", async () => {
    const poster = await solidPoster("#050505")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/logo.png", logo],
    ])
    for (let i = 0; i < 30; i++) images.set(`/p${i}.jpg`, poster)

    const posters = Array.from({ length: 30 }, (_, i) => ({
      file_path: `/p${i}.jpg`,
      iso_639_1: null as string | null,
      vote_average: i % 10,
      width: 500,
      height: 750,
    }))

    let fetchCount = 0
    const selected = await selectBestLogoFitPosterPath({
      posters,
      logoPath: "/logo.png",
      fetchImage: async (path) => {
        fetchCount += 1
        return makeImages(images)(path)
      },
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBeDefined()
    expect(fetchCount).toBeLessThanOrEqual(9)
  })

  it("avoids duplicates in candidate pool", async () => {
    const posterA = await solidPoster("#050505")
    const posterB = await solidPoster("#0a0a0a")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/a.jpg", posterA],
      ["/b.jpg", posterB],
      ["/logo.png", logo],
    ])

    const fetches = new Map<string, number>()
    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/a.jpg", iso_639_1: null, vote_average: 8, width: 1000, height: 1500 },
        { file_path: "/b.jpg", iso_639_1: null, vote_average: 7, width: 800, height: 1200 },
        { file_path: "/a.jpg", iso_639_1: null, vote_average: 8, width: 1000, height: 1500 },
      ],
      logoPath: "/logo.png",
      fetchImage: async (path) => {
        fetches.set(path, (fetches.get(path) ?? 0) + 1)
        return makeImages(images)(path)
      },
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBeDefined()
    expect(fetches.get("/a.jpg")).toBe(1)
  })

  it("skips clean posters with invalid poster aspect ratio", async () => {
    const validPoster = await solidPoster("#111111")
    const invalidPoster = await solidPoster("#000000", 1000, 1000)
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/valid.jpg", validPoster],
      ["/square.jpg", invalidPoster],
      ["/logo.png", logo],
    ])
    const fetches = new Map<string, number>()

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/square.jpg", iso_639_1: null, vote_average: 10, width: 1000, height: 1000 },
        { file_path: "/valid.jpg", iso_639_1: null, vote_average: 4, width: 1000, height: 1500 },
      ],
      logoPath: "/logo.png",
      fetchImage: async (path) => {
        fetches.set(path, (fetches.get(path) ?? 0) + 1)
        return makeImages(images)(path)
      },
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/valid.jpg")
    expect(fetches.get("/square.jpg")).toBeUndefined()
  })

  it("returns the first candidate when every fit score is weak", async () => {
    const firstPoster = await solidPoster("#ffffff")
    const slightlyBetterPoster = await solidPoster("#eeeeee")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/first.jpg", firstPoster],
      ["/slightly-better.jpg", slightlyBetterPoster],
      ["/logo.png", logo],
    ])

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/first.jpg", iso_639_1: null, vote_average: 5, width: 500, height: 750 },
        { file_path: "/slightly-better.jpg", iso_639_1: null, vote_average: 9, width: 500, height: 750 },
      ],
      logoPath: "/logo.png",
      fetchImage: makeImages(images),
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    expect(selected).toBe("/first.jpg")
  })

  it("penalizes logo color conflicts in the logo zone", async () => {
    const yellowConflictPoster = await solidPoster("#f6d21b")
    const darkPoster = await solidPoster("#171717")
    const logo = await solidLogo("#ffd21f")
    const images = new Map([
      ["/yellow.jpg", yellowConflictPoster],
      ["/dark.jpg", darkPoster],
      ["/logo.png", logo],
    ])

    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/yellow.jpg", iso_639_1: null, vote_average: 9, width: 500, height: 750 },
        { file_path: "/dark.jpg", iso_639_1: null, vote_average: 6, width: 500, height: 750 },
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
})
