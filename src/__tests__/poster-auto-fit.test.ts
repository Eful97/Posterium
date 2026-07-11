import { describe, expect, it } from "vitest"
import sharp from "sharp"
import { selectBestLogoFitPosterPath } from "@/lib/poster-auto-fit"

async function solidPoster(color: string): Promise<Buffer> {
  return sharp({
    create: {
      width: 500,
      height: 750,
      channels: 3,
      background: color,
    },
  }).jpeg().toBuffer()
}

async function solidLogo(color: string): Promise<Buffer> {
  return sharp({
    create: {
      width: 300,
      height: 120,
      channels: 4,
      background: color,
    },
  }).png().toBuffer()
}

describe("selectBestLogoFitPosterPath", () => {
  it("selects the clean poster with stronger logo contrast", async () => {
    // Given
    const darkPoster = await solidPoster("#050505")
    const lightPoster = await solidPoster("#f8f8f8")
    const logo = await solidLogo("#ffffff")
    const images = new Map([
      ["/dark.jpg", darkPoster],
      ["/light.jpg", lightPoster],
      ["/logo.png", logo],
    ])

    // When
    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/light.jpg", iso_639_1: null },
        { file_path: "/dark.jpg", iso_639_1: null },
      ],
      logoPath: "/logo.png",
      fetchImage: async (path) => {
        const image = images.get(path)
        if (!image) throw new Error(`Missing fixture ${path}`)
        return image
      },
      logoScale: 50,
      logoOffsetX: 0,
      logoOffsetY: 0,
      hasBadges: true,
    })

    // Then
    expect(selected).toBe("/dark.jpg")
  })

  it("returns the only clean poster without scoring", async () => {
    // Given
    let fetchCount = 0

    // When
    const selected = await selectBestLogoFitPosterPath({
      posters: [
        { file_path: "/single.jpg", iso_639_1: null },
        { file_path: "/it.jpg", iso_639_1: "it" },
      ],
      logoPath: "/logo.png",
      fetchImage: async () => {
        fetchCount += 1
        return Buffer.alloc(0)
      },
      hasBadges: true,
    })

    // Then
    expect(selected).toBe("/single.jpg")
    expect(fetchCount).toBe(0)
  })
})
