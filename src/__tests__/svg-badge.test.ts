import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { buildGenrePillSvg, buildGenreTextSvg } from "@/lib/badge-svg-shared"
import { buildGenreBadgeSVG } from "@/lib/svg-badge"

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
})
