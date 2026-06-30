import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { buildGenrePillSvg, buildGenreTextSvg, buildRankingDefaultSvg, buildExtraDefaultSvg } from "@/lib/badge-svg-shared"
import { buildGenreBadgeSVG, buildRankingBadgeSVG, buildExtraBadgeSVG } from "@/lib/svg-badge"

async function alphaBounds(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width
  let maxX = -1

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3]
      if (alpha && alpha > 10) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
      }
    }
  }

  return { minX, maxX, width: info.width }
}

describe("buildGenreBadgeSVG", () => {
  it("keeps genre separators in natural text flow", () => {
    const { svg } = buildGenreTextSvg("Sci-Fi & Fantasy", "8.0", "2022", 63, "#e5e7eb", "shadow")

    expect(svg).toContain("<tspan>Sci-Fi &amp; Fantasy</tspan>")
    expect(svg).toContain('<tspan dx="21" fill-opacity="0.6">•</tspan>')
    expect(svg).toContain('text-anchor="middle"')
    expect(svg).not.toContain("Sci-Fi &amp; Fantasy</text><text")
  })

  it("keeps long genre pill compact and centers its text flow", async () => {
    const rawPill = buildGenrePillSvg("Sci-Fi & Fantasy", "8.2", "2019", 53, "rgba(255,255,255,0.80)", "rgba(0,0,0,0.80)")
    expect(rawPill.svg).toContain('text-anchor="middle"')

    const badge = await buildGenreBadgeSVG("Sci-Fi & Fantasy", 8.2, 1000, "2019", "pill", "#555555", false)
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeLessThan(800)
  })

  it("keeps long shadow genre badge within aesthetic width", async () => {
    const badge = await buildGenreBadgeSVG("Sci-Fi & Fantasy", 8.0, 1000, "2022", "shadow", "#555555", false)

    expect(badge).not.toBeNull()
    expect(badge!.w).toBeLessThanOrEqual(860)
  })

  it.each([
    ["Commedia", 8.1, "2026"],
    ["Sci-Fi & Fantasy", 8.0, "2022"],
  ])("keeps server-rendered genre text away from SVG edges for %s", async (genre, vote, year) => {
    const badge = await buildGenreBadgeSVG(genre, vote, 1000, year, "shadow", "#555555", true)
    expect(badge).not.toBeNull()

    const bounds = await alphaBounds(badge!.png)

    expect(bounds.minX).toBeGreaterThan(20)
    expect(bounds.maxX).toBeLessThan(bounds.width - 20)
  })

  it("centers the rendered genre text optically in the transparent badge", async () => {
    const badge = await buildGenreBadgeSVG("Sci-Fi & Fantasy", 8.0, 1000, "2022", "shadow", "#555555", false)
    expect(badge).not.toBeNull()

    const bounds = await alphaBounds(badge!.png)
    const leftPad = bounds.minX
    const rightPad = bounds.width - 1 - bounds.maxX

    expect(Math.abs(leftPad - rightPad)).toBeLessThanOrEqual(12)
  })

  it("uses adjustedX for text-anchor middle to compensate dx tspans", () => {
    const { svg } = buildGenreTextSvg("Azione", "7.5", "2024", 60, "#e5e7eb", "shadow")
    expect(svg).toContain('text-anchor="middle"')
    // The text element should have an x attribute with the adjustedX value
    expect(svg).toMatch(/<text[^>]*x="/)
    // adjustedX should be less than the canvas center (centerX = renderW/2, renderW > 300)
    const xVal = Number(svg.match(/<text[^>]*x="([\d.]+)"/)![1])
    expect(xVal).toBeGreaterThan(100)
    expect(xVal).toBeLessThan(500)
  })

  it("handles single-word genre with year", async () => {
    const badge = await buildGenreBadgeSVG("Azione", 7.5, 1000, "2024", "shadow", "#555555", false)
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeGreaterThan(100)
    expect(badge!.w).toBeLessThan(900)
  })

  it("handles missing year gracefully", async () => {
    const badge = await buildGenreBadgeSVG("Commedia", 6.0, 1000, undefined, "shadow", "#555555", false)
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeGreaterThan(0)
  })

  it("renders bar style full-width", async () => {
    const badge = await buildGenreBadgeSVG("Dramma", 8.5, 1000, "2023", "bar", "#555555", false)
    expect(badge).not.toBeNull()
    expect(badge!.w).toBe(1000)
  })
})

describe("buildRankingBadgeSVG", () => {
  it("renders default ranking badge with rank and label", async () => {
    const badge = await buildRankingBadgeSVG(1, 1000, "Oggi", false, "default", "#555555")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeGreaterThan(50)
    expect(badge!.w).toBeLessThan(600)
  })

  it("renders bar ranking badge full-width", async () => {
    const badge = await buildRankingBadgeSVG(5, 1000, "Oggi", false, "bar", "#555555")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBe(1000)
  })

  it("renders colored ranking badge", async () => {
    const badge = await buildRankingBadgeSVG(3, 1000, "Oggi", false, "colored", "#ff6430")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeGreaterThan(50)
  })

  it("handles long rank text with overflow protection", async () => {
    const badge = await buildRankingBadgeSVG(999, 500, "Supercalifragilistichespiralidoso", false, "default", "#555555")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeLessThanOrEqual(500)
    expect(badge!.w).toBeGreaterThan(0)
  })

  it("renders without label", async () => {
    const badge = await buildRankingBadgeSVG(1, 1000, undefined, false, "default", "#555555")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeGreaterThan(0)
  })
})

describe("buildExtraBadgeSVG", () => {
  it("renders default extra badge with label", async () => {
    const badge = await buildExtraBadgeSVG("Golden Globe", 1000, false, "default", "#555555")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeGreaterThan(50)
    expect(badge!.w).toBeLessThan(600)
  })

  it("renders bar extra badge full-width", async () => {
    const badge = await buildExtraBadgeSVG("Vincitore Oscar", 1000, false, "bar", "#555555")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBe(1000)
  })

  it("handles long extra label with overflow protection", async () => {
    const badge = await buildExtraBadgeSVG("Supercalifragilistichespiralidosamente lungo", 500, false, "default", "#555555")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeLessThanOrEqual(500)
    expect(badge!.w).toBeGreaterThan(0)
  })
})

describe("buildRankingDefaultSvg", () => {
  it("contains text-anchor middle for centering", () => {
    const { svg } = buildRankingDefaultSvg("#1 Oggi", 60, "rgba(255,255,255,0.80)", "rgba(0,0,0,0.80)")
    expect(svg).toContain('text-anchor="middle"')
  })
})
