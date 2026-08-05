import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { buildGenrePillSvg, buildGenreTextSvg, buildRankingDefaultSvg, buildExtraDefaultSvg } from "@/lib/badge-svg-shared"
import { buildGenreBadgeSVG, buildRankingBadgeSVG, buildExtraBadgeSVG, buildNetflixRankBadgeSVG } from "@/lib/svg-badge"

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
    expect(svg).toContain('lengthAdjust="spacingAndGlyphs"')
    expect(svg).not.toContain("Sci-Fi &amp; Fantasy</text><text")
  })

  it("uses a lighter text weight for genre/rating badges", () => {
    const { svg } = buildGenreTextSvg("Sci-Fi & Fantasy", "8.0", "2022", 63, "#e5e7eb", "shadow")

    expect(svg).toContain('font-weight="600"')
  })

  it("lowers the star symbol without shifting the rating baseline", () => {
    const fs = 63
    const starDy = Math.max(2, Math.round(fs * 0.14))
    const { svg } = buildGenreTextSvg("Fantascienza", "8.7", "2026", fs, "#e5e7eb", "shadow")

    expect(svg).toContain(`dy="${starDy}" font-family="Noto Sans Symbols 2"`)
    expect(svg).toContain(`dy="${-starDy}">8.7</tspan>`)
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

describe("GenreParts combinations", () => {
  it("hides genre and rating when only year is enabled", () => {
    const { svg } = buildGenreTextSvg("Dramma", "8.2", "2024", 60, "#e5e7eb", "shadow", 0, { showGenre: false, showRating: false })
    expect(svg).toContain("2024")
    expect(svg).not.toContain("Dramma")
    expect(svg).not.toContain("Noto Sans Symbols 2")
    expect(svg).not.toContain("8.2")
  })

  it("hides genre and year when only rating is enabled", () => {
    const { svg } = buildGenreTextSvg("Dramma", "8.2", "2024", 60, "#e5e7eb", "shadow", 0, { showGenre: false, showYear: false })
    expect(svg).toContain("Noto Sans Symbols 2")
    expect(svg).toContain("8.2")
    expect(svg).not.toContain("Dramma")
    expect(svg).not.toContain("2024")
  })

  it("hides rating but keeps genre and year", () => {
    const { svg } = buildGenreTextSvg("Dramma", "8.2", "2024", 60, "#e5e7eb", "shadow", 0, { showRating: false })
    expect(svg).toContain("Dramma")
    expect(svg).toContain("2024")
    expect(svg).not.toContain("Noto Sans Symbols 2")
    expect(svg).not.toContain("8.2")
  })

  it("hides genre but keeps rating and year", () => {
    const { svg } = buildGenreTextSvg("Dramma", "8.2", "2024", 60, "#e5e7eb", "shadow", 0, { showGenre: false })
    expect(svg).toContain("Noto Sans Symbols 2")
    expect(svg).toContain("8.2")
    expect(svg).toContain("2024")
    expect(svg).not.toContain("Dramma")
  })

  it("hides year and rating but keeps genre", () => {
    const { svg } = buildGenreTextSvg("Dramma", "8.2", "2024", 60, "#e5e7eb", "shadow", 0, { showYear: false, showRating: false })
    expect(svg).toContain("Dramma")
    expect(svg).not.toContain("Noto Sans Symbols 2")
    expect(svg).not.toContain("2024")
    expect(svg).not.toContain("8.2")
  })

  it("centers the only-year badge optically", async () => {
    const badge = await buildGenreBadgeSVG("Dramma", 8.2, 1000, "2024", "shadow", "#555555", false, { showGenre: false, showRating: false })
    expect(badge).not.toBeNull()
    const bounds = await alphaBounds(badge!.png)
    expect(bounds.minX).toBeGreaterThan(20)
    expect(bounds.maxX).toBeLessThan(bounds.width - 20)
    expect(Math.abs((bounds.width - 1 - bounds.maxX) - bounds.minX)).toBeLessThanOrEqual(16)
  })

  it("centers the only-rating badge optically", async () => {
    const badge = await buildGenreBadgeSVG("Dramma", 8.2, 1000, "2024", "shadow", "#555555", false, { showGenre: false, showYear: false })
    expect(badge).not.toBeNull()
    const bounds = await alphaBounds(badge!.png)
    expect(bounds.minX).toBeGreaterThan(20)
    expect(bounds.maxX).toBeLessThan(bounds.width - 20)
    expect(Math.abs((bounds.width - 1 - bounds.maxX) - bounds.minX)).toBeLessThanOrEqual(16)
  })

  it("renders a partial badge narrower than the full badge", async () => {
    const full = await buildGenreBadgeSVG("Dramma", 8.2, 1000, "2024", "shadow", "#555555", false)
    const partial = await buildGenreBadgeSVG("Dramma", 8.2, 1000, "2024", "shadow", "#555555", false, { showGenre: false })
    expect(full).not.toBeNull()
    expect(partial).not.toBeNull()
    expect(partial!.w).toBeLessThan(full!.w)
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

  it("renders netflix ribbon light with dark text when top is dark", async () => {
    const badge = await buildRankingBadgeSVG(4, 1000, "Oggi", false, "netflix", "#555555")
    expect(badge).not.toBeNull()
    expect(badge!.w).toBeGreaterThan(0)
  })

  it("uses light ribbon + dark text (tlBg/tlFg) when top is dark", () => {
    const { svg } = buildNetflixRankBadgeSVG(4, 1000, false)
    expect(svg).toContain('fill="rgba(255,255,255,0.80)"')
    expect(svg).toContain('fill="rgba(0,0,0,0.80)"')
    expect(svg).not.toContain("netflixGrad")
    expect(svg).not.toContain("#E50914")
  })

  it("uses dark ribbon + light text (tlBg/tlFg) when top is light", () => {
    const { svg } = buildNetflixRankBadgeSVG(4, 1000, true)
    expect(svg).toContain('fill="rgba(0,0,0,0.80)"')
    expect(svg).toContain('fill="rgba(255,255,255,0.80)"')
  })

  it("mirrors the ribbon horizontally when side=right (Stremio mode)", () => {
    const left = buildNetflixRankBadgeSVG(4, 1000, false)
    const right = buildNetflixRankBadgeSVG(4, 1000, false, "right")
    const pathL = left.svg.match(/<path d="([^"]+)"/)![1]
    const pathR = right.svg.match(/<path d="([^"]+)"/)![1]
    // Path specchiato: parte dall'angolo alto-destro della viewBox
    const totalW = Number(right.svg.match(/viewBox="0 0 (\d+) (\d+)"/)![1])
    expect(pathR).toMatch(new RegExp(`^M ${totalW} 0 L`))
    expect(pathL).not.toBe(pathR)
    // Ombra invertita: cade verso sinistra (verso il centro del poster)
    expect(right.svg).toContain('dx="-3" dy="3"')
    expect(left.svg).toContain('dx="3" dy="3"')
    // Testo non specchiato: "TOP" e rank restano leggibili
    expect(right.svg).toContain(">TOP</text>")
    expect(right.svg).toContain(">4</text>")
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

  it("uses a lighter text weight for trend badges", () => {
    const { svg } = buildRankingDefaultSvg("#1 Oggi", 60, "rgba(255,255,255,0.80)", "rgba(0,0,0,0.80)")

    expect(svg).toContain('font-weight="700"')
  })

  it("locks text to the measured badge width", () => {
    const { svg } = buildRankingDefaultSvg("#1 Oggi", 60, "rgba(255,255,255,0.80)", "rgba(0,0,0,0.80)")
    expect(svg).toContain('lengthAdjust="spacingAndGlyphs"')
  })
})

describe("buildExtraDefaultSvg", () => {
  it("locks text to the measured badge width", () => {
    const { svg } = buildExtraDefaultSvg("Vincitore Golden Globe", 60, "rgba(0,0,0,0.80)", "rgba(255,255,255,0.80)")
    expect(svg).toContain('lengthAdjust="spacingAndGlyphs"')
  })
})
