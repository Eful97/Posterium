import { describe, it, expect } from "vitest"
import sharp from "sharp"
import { scorePosterLogoFit, rankPostersByFit } from "@/lib/poster-fit-score"

function makeSolidPoster(r: number, g: number, b: number, noise = 0): Promise<Buffer> {
  const pixels = 500 * 750
  const data = Buffer.alloc(pixels * 3)
  for (let i = 0; i < pixels; i++) {
    const offset = i * 3
    const nr = Math.round(r + (Math.random() - 0.5) * noise)
    const ng = Math.round(g + (Math.random() - 0.5) * noise)
    const nb = Math.round(b + (Math.random() - 0.5) * noise)
    data[offset] = Math.max(0, Math.min(255, nr))
    data[offset + 1] = Math.max(0, Math.min(255, ng))
    data[offset + 2] = Math.max(0, Math.min(255, nb))
  }
  return sharp(data, { raw: { width: 500, height: 750, channels: 3 } })
    .jpeg()
    .toBuffer()
}

function makeCheckerPoster(bgR: number, bgG: number, bgB: number, checkerR: number, checkerG: number, checkerB: number, size = 10): Promise<Buffer> {
  const data = Buffer.alloc(500 * 750 * 3)
  for (let y = 0; y < 750; y++) {
    for (let x = 0; x < 500; x++) {
      const idx = (y * 500 + x) * 3
      const isChecker = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0
      data[idx] = isChecker ? checkerR : bgR
      data[idx + 1] = isChecker ? checkerG : bgG
      data[idx + 2] = isChecker ? checkerB : bgB
    }
  }
  return sharp(data, { raw: { width: 500, height: 750, channels: 3 } })
    .jpeg()
    .toBuffer()
}

function makeTwoTonePoster(topR: number, topG: number, topB: number, bottomR: number, bottomG: number, bottomB: number, noise = 0): Promise<Buffer> {
  const pixels = 500 * 750
  const data = Buffer.alloc(pixels * 3)
  const midY = 375
  for (let y = 0; y < 750; y++) {
    for (let x = 0; x < 500; x++) {
      const idx = (y * 500 + x) * 3
      const nr = y < midY
        ? topR + (Math.random() - 0.5) * noise
        : bottomR + (Math.random() - 0.5) * noise
      const ng = y < midY
        ? topG + (Math.random() - 0.5) * noise
        : bottomG + (Math.random() - 0.5) * noise
      const nb = y < midY
        ? topB + (Math.random() - 0.5) * noise
        : bottomB + (Math.random() - 0.5) * noise
      data[idx] = Math.max(0, Math.min(255, Math.round(nr)))
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(ng)))
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(nb)))
    }
  }
  return sharp(data, { raw: { width: 500, height: 750, channels: 3 } })
    .jpeg()
    .toBuffer()
}

function makeLogo(width: number, height: number, r: number, g: number, b: number, alpha = 255): Promise<Buffer> {
  const data = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = alpha
    }
  }
  return sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()
}

describe("scorePosterLogoFit", () => {
  it("high score: white logo on dark poster", async () => {
    const poster = await makeSolidPoster(20, 20, 30)
    const logo = await makeLogo(200, 80, 255, 255, 255)
    const result = await scorePosterLogoFit({
      posterBuffer: poster,
      logoBuffer: logo,
      logoScale: 75,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })
    expect(result.score).toBeGreaterThan(0.6)
    expect(result.metrics.contrast).toBeGreaterThan(0.4)
    expect(result.reasons).toContain("Buon contrasto logo/sfondo")
  })

  it("low score: white logo on white poster", async () => {
    const poster = await makeSolidPoster(240, 240, 245)
    const logo = await makeLogo(200, 80, 255, 255, 255)
    const result = await scorePosterLogoFit({
      posterBuffer: poster,
      logoBuffer: logo,
      logoScale: 75,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })
    expect(result.score).toBeLessThan(0.45)
    expect(result.metrics.contrast).toBeLessThan(0.3)
  })

  it("high score: dark logo on light poster", async () => {
    const poster = await makeSolidPoster(230, 230, 240)
    const logo = await makeLogo(200, 80, 10, 10, 10)
    const result = await scorePosterLogoFit({
      posterBuffer: poster,
      logoBuffer: logo,
      logoScale: 75,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })
    expect(result.score).toBeGreaterThan(0.6)
    expect(result.metrics.contrast).toBeGreaterThan(0.4)
  })

  it("penalizes busy background in logo area", async () => {
    const cleanPoster = await makeSolidPoster(40, 40, 40)
    const busyPoster = await makeCheckerPoster(40, 40, 40, 220, 220, 220, 6)
    const logo = await makeLogo(200, 80, 255, 255, 255)
    const [cleanResult, busyResult] = await Promise.all([
      scorePosterLogoFit({ posterBuffer: cleanPoster, logoBuffer: logo, logoScale: 75, logoOffsetX: 0, logoOffsetY: 0, hasBadges: true }),
      scorePosterLogoFit({ posterBuffer: busyPoster, logoBuffer: logo, logoScale: 75, logoOffsetX: 0, logoOffsetY: 0, hasBadges: true }),
    ])
    expect(busyResult.metrics.cleanliness).toBeLessThan(cleanResult.metrics.cleanliness)
    expect(busyResult.metrics.detailPenalty).toBeGreaterThan(cleanResult.metrics.detailPenalty)
    expect(busyResult.score).toBeLessThan(cleanResult.score)
  })

  it("handles transparent logo", async () => {
    const poster = await makeSolidPoster(20, 20, 30)
    const logo = await makeLogo(200, 80, 255, 255, 255, 128)
    const result = await scorePosterLogoFit({
      posterBuffer: poster,
      logoBuffer: logo,
      logoScale: 75,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })
    expect(result.score).toBeGreaterThan(0)
    expect(result.metrics.contrast).toBeGreaterThan(0)
  })

  it("clean logo area gets cleanliness > 0.7", async () => {
    const poster = await makeSolidPoster(40, 40, 50)
    const logo = await makeLogo(200, 80, 255, 255, 255)
    const result = await scorePosterLogoFit({
      posterBuffer: poster,
      logoBuffer: logo,
      logoScale: 75,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })
    expect(result.metrics.cleanliness).toBeGreaterThan(0.7)
  })

  it("returns all metric fields", async () => {
    const poster = await makeSolidPoster(30, 30, 40)
    const logo = await makeLogo(200, 80, 255, 255, 255)
    const result = await scorePosterLogoFit({
      posterBuffer: poster,
      logoBuffer: logo,
      logoScale: 75,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })
    expect(result).toHaveProperty("score")
    expect(result).toHaveProperty("metrics")
    expect(result.metrics).toHaveProperty("cleanliness")
    expect(result.metrics).toHaveProperty("contrast")
    expect(result.metrics).toHaveProperty("detailPenalty")
    expect(result.metrics).toHaveProperty("badgeReadability")
    expect(result).toHaveProperty("reasons")
    expect(Array.isArray(result.reasons)).toBe(true)
  })
  it("penalizes yellow logo on yellow poster vs yellow logo on dark poster", async () => {
    const yellowLogo = await makeLogo(200, 80, 255, 210, 0)
    const yellowPoster = await makeSolidPoster(240, 200, 20)
    const darkPoster = await makeSolidPoster(20, 20, 30)

    const [yellowResult, darkResult] = await Promise.all([
      scorePosterLogoFit({ posterBuffer: yellowPoster, logoBuffer: yellowLogo, logoScale: 75, logoOffsetX: 0, logoOffsetY: 0, hasBadges: true }),
      scorePosterLogoFit({ posterBuffer: darkPoster, logoBuffer: yellowLogo, logoScale: 75, logoOffsetX: 0, logoOffsetY: 0, hasBadges: true }),
    ])

    expect(darkResult.score).toBeGreaterThan(yellowResult.score)
    expect(darkResult.metrics.contrast).toBeGreaterThan(yellowResult.metrics.contrast)
  })
})

describe("rankPostersByFit", () => {
  it("ranks dark poster higher than light poster for white logo", async () => {
    const darkPoster = await makeSolidPoster(20, 20, 30)
    const lightPoster = await makeSolidPoster(230, 230, 240)
    const logo = await makeLogo(200, 80, 255, 255, 255)

    const ranked = await rankPostersByFit(
      [
        { posterPath: "/light.jpg", posterBuffer: lightPoster },
        { posterPath: "/dark.jpg", posterBuffer: darkPoster },
      ],
      logo,
      75, 0, 0, true,
    )

    expect(ranked.length).toBe(2)
    expect(ranked[0].posterPath).toBe("/dark.jpg")
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it("handles empty poster list", async () => {
    const logo = await makeLogo(200, 80, 255, 255, 255)
    const ranked = await rankPostersByFit([], logo, 75, 0, 0, true)
    expect(ranked).toEqual([])
  })
})
