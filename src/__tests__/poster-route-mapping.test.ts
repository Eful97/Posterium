import sharp from "sharp"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/poster/[type]/[id]/route"
import { getById } from "@/lib/store"
import { selectBestLogoFitPosterPath } from "@/lib/poster-auto-fit"

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ ok: true, retAfter: 0 })),
  rateLimitKey: vi.fn(() => "test"),
  rateLimitResponse: vi.fn(() => new Response("rate limited", { status: 429 })),
}))

vi.mock("@/lib/store", () => ({
  getById: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock("@/lib/server-defaults", () => ({
  getServerDefaults: vi.fn(() => ({ defaultLogoFitEnabled: true })),
}))

vi.mock("@/lib/poster-auto-fit", () => ({
  selectBestLogoFitPosterPath: vi.fn(async () => "/best-fit.jpg"),
}))

vi.mock("@/lib/svg-badge", () => ({
  warmFonts: vi.fn(),
  renderGenreBadge: vi.fn(),
  renderRankingBadge: vi.fn(),
  renderExtraBadge: vi.fn(),
}))

vi.mock("@/lib/justwatch", () => ({
  getJWRankings: vi.fn(async () => []),
}))

vi.mock("@/lib/awards", () => ({
  fetchAllWikidata: vi.fn(async () => ({ awards: [], nominations: [], studios: [], franchise: null, basedOn: null, director: null })),
  getAwardBadgeLabel: vi.fn(),
  getNominationBadgeLabel: vi.fn(),
  matchTMDBStudios: vi.fn(() => []),
}))

vi.mock("@/lib/mdblist", () => ({
  fetchMDBList: vi.fn(async () => []),
}))

vi.mock("@/lib/ratings", () => ({
  fetchAggregatedRating: vi.fn(async () => null),
}))

const mockedGetById = vi.mocked(getById)
const mockedSelectBestLogoFitPosterPath = vi.mocked(selectBestLogoFitPosterPath)

async function imageBuffer(color: string, width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color },
  }).png().toBuffer()
}

describe("GET /api/poster/[type]/[id] with saved mappings", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("uses the saved poster path instead of overriding it with automatic best fit", async () => {
    const savedPoster = await imageBuffer("#101010", 500, 750)
    const logo = await imageBuffer("#ffffff", 220, 80)
    const requestedUrls: string[] = []

    mockedGetById.mockResolvedValue({
      tmdbId: 42,
      mediaType: "movie",
      title: "Saved Poster",
      posterPath: "/saved-choice.jpg",
      logoPath: "/logo.png",
      originalPosterPath: null,
      language: "it",
      cleanPosters: ["/saved-choice.jpg", "/best-fit.jpg"],
      showBadges: false,
      rankingBadges: false,
      updatedAt: "2026-07-16T10:15:30.000Z",
    })

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input)
      requestedUrls.push(url)
      const body = url.includes("/logo.png") ? logo : savedPoster
      return new Response(new Uint8Array(body), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(body.length) },
      })
    })

    const req = new NextRequest("http://localhost:3000/api/poster/movie/42?rv=81&mv=1784218530000")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "42" }) })

    expect(res.status).toBe(200)
    expect(mockedSelectBestLogoFitPosterPath).not.toHaveBeenCalled()
    expect(requestedUrls.some((url) => url.includes("/saved-choice.jpg"))).toBe(true)
    expect(requestedUrls.some((url) => url.includes("/best-fit.jpg"))).toBe(false)
  })
})
