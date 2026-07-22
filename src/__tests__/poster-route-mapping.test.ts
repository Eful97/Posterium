import sharp from "sharp"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/poster/[type]/[id]/route"
import { getById } from "@/lib/store"
import { selectBestLogoFitPosterPath } from "@/lib/poster-auto-fit"
import { getDetails, getImages, getExternalIds } from "@/lib/tmdb"

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
  renderGenreBadge: vi.fn(async () => null),
  renderRankingBadge: vi.fn(async () => null),
  renderExtraBadge: vi.fn(async () => null),
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

vi.mock("@/lib/tmdb", () => ({
  getDetails: vi.fn(),
  getImages: vi.fn(),
  getExternalIds: vi.fn(async () => ({ imdb_id: null })),
  getKeywords: vi.fn(async () => []),
}))

const mockedGetById = vi.mocked(getById)
const mockedSelectBestLogoFitPosterPath = vi.mocked(selectBestLogoFitPosterPath)
const mockedGetDetails = vi.mocked(getDetails)
const mockedGetImages = vi.mocked(getImages)
const mockedGetExternalIds = vi.mocked(getExternalIds)

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

  it("calls selectBestLogoFitPosterPath when no mapping exists and a logo is available", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)
    const logo = await imageBuffer("#ffffff", 220, 80)
    const requestedUrls: string[] = []

    mockedGetById.mockResolvedValue(null)

    mockedGetDetails.mockResolvedValue({
      id: 42,
      title: "Test Movie",
      genres: [{ id: 18, name: "Drama" }],
      vote_average: 7.5,
      vote_count: 100,
      original_language: "en",
      release_date: "2024-01-15",
      production_companies: [],
    })

    mockedGetImages.mockResolvedValue({
      id: 42,
      posters: [
        { file_path: "/first-clean.jpg", iso_639_1: null, vote_average: 8.0, vote_count: 100, width: 500, height: 750, aspect_ratio: 0.667 },
        { file_path: "/second-clean.jpg", iso_639_1: null, vote_average: 7.0, vote_count: 50, width: 500, height: 750, aspect_ratio: 0.667 },
      ],
      logos: [
        { file_path: "/logo.png", iso_639_1: "en", vote_average: 0, vote_count: 0, width: 220, height: 80, aspect_ratio: 2.75 },
      ],
      backdrops: [],
    })

    mockedGetExternalIds.mockResolvedValue({ imdb_id: "tt1234567" })

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input)
      requestedUrls.push(url)
      const body = url.includes("/logo.png") ? logo : posterBuf
      return new Response(new Uint8Array(body), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(body.length) },
      })
    })

    const req = new NextRequest("http://localhost:3000/api/poster/movie/42")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "42" }) })

    expect(res.status).toBe(200)
    expect(mockedSelectBestLogoFitPosterPath).toHaveBeenCalledTimes(1)
    expect(mockedSelectBestLogoFitPosterPath).toHaveBeenCalledWith(
      expect.objectContaining({
        logoPath: "/logo.png",
        hasBadges: true,
      }),
    )
    expect(requestedUrls.some((url) => url.includes("/logo.png"))).toBe(true)
  })
})
