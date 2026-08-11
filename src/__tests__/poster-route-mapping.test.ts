import sharp from "sharp"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/poster/[type]/[id]/route"
import { getById } from "@/lib/store"
import { selectBestLogoFitPosterPath } from "@/lib/poster-auto-fit"
import { getDetails, getImages, getExternalIds } from "@/lib/tmdb"
import { fetchMDBList } from "@/lib/mdblist"
import { getFullProfileData } from "@/lib/profile-store"
import { cacheClear } from "@/lib/cache"
import { __resetTMDBSessionCache } from "@/lib/tmdb-session-cache"
import type { Mapping } from "@/lib/types"

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
  getServerDefaults: vi.fn(() => ({ defaultLogoFitEnabled: true, badgeStyle: "shadow", rankingBadgeStyle: "default" })),
}))

vi.mock("@/lib/poster-auto-fit", () => ({
  selectBestLogoFitPosterPath: vi.fn(async () => ({ posterPath: "/best-fit.jpg" })),
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
  fetchAllWikidata: vi.fn(async () => ({ awards: [], nominations: [], studios: [], director: null })),
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
  resolveRequestApiKey: vi.fn((req: { nextUrl?: { searchParams: URLSearchParams } }) => req.nextUrl?.searchParams.get("api_key") || undefined),
}))

vi.mock("@/lib/profile-store", () => ({
  getProfile: vi.fn(async () => null),
  getFullProfileData: vi.fn(async () => null),
}))

vi.mock("@/lib/imdb-resolver", () => ({
  resolveImdbToTmdb: vi.fn(async () => null),
}))

const mockedGetById = vi.mocked(getById)
const mockedSelectBestLogoFitPosterPath = vi.mocked(selectBestLogoFitPosterPath)
const mockedGetDetails = vi.mocked(getDetails)
const mockedGetImages = vi.mocked(getImages)
const mockedGetExternalIds = vi.mocked(getExternalIds)
const mockedFetchMDBList = vi.mocked(fetchMDBList)
const mockedGetFullProfileData = vi.mocked(getFullProfileData)

async function imageBuffer(color: string, width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color },
  }).png().toBuffer()
}

describe("GET /api/poster/[type]/[id] with saved mappings", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cacheClear()
    __resetTMDBSessionCache()
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

  it("falls back to the language poster when no logo is available (clean without logo is useless)", async () => {
    const langPosterBuf = await imageBuffer("#204080", 500, 750)
    const cleanBuf = await imageBuffer("#101010", 500, 750)
    const requestedUrls: string[] = []

    mockedGetById.mockResolvedValue(null)
    mockedGetDetails.mockResolvedValue({
      id: 42,
      title: "Gli occhi degli altri",
      genres: [{ id: 18, name: "Drama" }],
      vote_average: 7.0,
      vote_count: 100,
      original_language: "it",
      release_date: "2025-01-15",
      production_companies: [],
    })
    mockedGetImages.mockResolvedValue({
      id: 42,
      posters: [
        { file_path: "/clean.jpg", iso_639_1: null, vote_average: 8.0, vote_count: 100, width: 500, height: 750, aspect_ratio: 0.667 },
        { file_path: "/it-poster.jpg", iso_639_1: "it", vote_average: 7.0, vote_count: 50, width: 500, height: 750, aspect_ratio: 0.667 },
      ],
      // Nessun logo disponibile (caso reale: TMDB 1341422 “Gli occhi degli altri”)
      logos: [],
      backdrops: [],
    })
    mockedGetExternalIds.mockResolvedValue({ imdb_id: "tt34625288" })

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input)
      requestedUrls.push(url)
      const body = url.includes("/it-poster.jpg") ? langPosterBuf : cleanBuf
      return new Response(new Uint8Array(body), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(body.length) },
      })
    })

    const req = new NextRequest("http://localhost:3000/api/poster/movie/42")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "42" }) })

    expect(res.status).toBe(200)
    // Deve usare il poster in lingua, NON il clean senza logo
    expect(requestedUrls.some((url) => url.includes("/it-poster.jpg"))).toBe(true)
    expect(requestedUrls.some((url) => url.includes("/clean.jpg"))).toBe(false)
  })

  it("memoizes TMDB fetches for the same unmapped title across preview ticks (F6)", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)
    mockedGetById.mockResolvedValue(null)
    mockedGetDetails.mockResolvedValue({
      id: 42,
      title: "Session Cache",
      genres: [{ id: 18, name: "Drama" }],
      vote_average: 7.0,
      vote_count: 100,
      original_language: "it",
      release_date: "2025-01-15",
      production_companies: [],
    })
    mockedGetImages.mockResolvedValue({
      id: 42,
      posters: [
        { file_path: "/it-poster.jpg", iso_639_1: "it", vote_average: 7.0, vote_count: 50, width: 500, height: 750, aspect_ratio: 0.667 },
      ],
      logos: [],
      backdrops: [],
    })
    mockedGetExternalIds.mockResolvedValue({ imdb_id: null })

    // NB: mockImplementation e non mockResolvedValue — la Response va creata
    // fresca a ogni chiamata, altrimenti il body one-shot viene consumato dal
    // primo fetchImg e il secondo tick va in "Poster image not available".
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(new Uint8Array(posterBuf), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(posterBuf.length) },
      }),
    )

    // Azzera la history dei mock: gli altri test del describe la inquinano.
    mockedGetDetails.mockClear()
    mockedGetImages.mockClear()
    mockedGetExternalIds.mockClear()

    const req1 = new NextRequest("http://localhost:3000/api/poster/movie/42?preview=1")
    const res1 = await GET(req1, { params: Promise.resolve({ type: "movie", id: "42" }) })
    expect(res1.status).toBe(200)
    const detailsAfterFirst = mockedGetDetails.mock.calls.length
    const imagesAfterFirst = mockedGetImages.mock.calls.length
    const extAfterFirst = mockedGetExternalIds.mock.calls.length
    expect(detailsAfterFirst).toBeGreaterThan(0)

    // Secondo tick di preview con parametri diversi → cache key diversa, ma la
    // session cache per type:id evita di rifare i fetch TMDB.
    const req2 = new NextRequest("http://localhost:3000/api/poster/movie/42?preview=1&blur=0")
    const res2 = await GET(req2, { params: Promise.resolve({ type: "movie", id: "42" }) })
    expect(res2.status).toBe(200)
    expect(mockedGetDetails.mock.calls.length).toBe(detailsAfterFirst)
    expect(mockedGetImages.mock.calls.length).toBe(imagesAfterFirst)
    expect(mockedGetExternalIds.mock.calls.length).toBe(extAfterFirst)
  })
})

describe("GET /api/poster/[type]/[id] error and edge cases", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cacheClear()
    __resetTMDBSessionCache()
  })

  it("returns 400 for invalid numeric ID", async () => {
    const req = new NextRequest("http://localhost:3000/api/poster/movie/0")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "0" }) })
    expect(res.status).toBe(400)
  })

  it("returns 400 for non-IMDB, non-numeric ID", async () => {
    const req = new NextRequest("http://localhost:3000/api/poster/movie/invalid-id")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "invalid-id" }) })
    expect(res.status).toBe(400)
  })

  it("returns 404 when posterPath is null after resolution", async () => {
    mockedGetById.mockResolvedValue({
      tmdbId: 99,
      mediaType: "movie",
      title: "No Poster",
      posterPath: "",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-16T10:15:30.000Z",
    } as Mapping)

    const req = new NextRequest("http://localhost:3000/api/poster/movie/99")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "99" }) })
    expect(res.status).toBe(404)
  })

  it("returns 404 when poster image fetch fails", async () => {
    mockedGetById.mockResolvedValue({
      tmdbId: 77,
      mediaType: "movie",
      title: "No Image",
      posterPath: "/poster.jpg",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-16T10:15:30.000Z",
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }))

    const req = new NextRequest("http://localhost:3000/api/poster/movie/77")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "77" }) })
    expect(res.status).toBe(404)
  })

  it("includes CORS headers in success response", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)

    mockedGetById.mockResolvedValue({
      tmdbId: 42,
      mediaType: "movie",
      title: "Test CORS",
      posterPath: "/poster.jpg",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-16T10:15:30.000Z",
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(posterBuf), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(posterBuf.length) },
      }),
    )

    const req = new NextRequest("http://localhost:3000/api/poster/movie/42?rv=81")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "42" }) })

    expect(res.status).toBe(200)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })

  it("includes CORS headers in 404 error response", async () => {
    const req = new NextRequest("http://localhost:3000/api/poster/movie/0")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "0" }) })
    expect(res.status).toBe(400)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })

  it("returns 304 Not Modified when etag matches", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)

    mockedGetById.mockResolvedValue({
      tmdbId: 42,
      mediaType: "movie",
      title: "Test 304",
      posterPath: "/poster.jpg",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-16T10:15:30.000Z",
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(posterBuf), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(posterBuf.length) },
      }),
    )

    // First request — cache the etag
    const req1 = new NextRequest("http://localhost:3000/api/poster/movie/42")
    const res1 = await GET(req1, { params: Promise.resolve({ type: "movie", id: "42" }) })
    expect(res1.status).toBe(200)
    const etag = res1.headers.get("ETag")
    expect(etag).toBeTruthy()

    // Second request with If-None-Match
    const req2 = new NextRequest("http://localhost:3000/api/poster/movie/42", {
      headers: { "If-None-Match": etag! },
    })
    const res2 = await GET(req2, { params: Promise.resolve({ type: "movie", id: "42" }) })
    expect(res2.status).toBe(304)
  })

  it("handles IMDB ID (tt...) resolution to TMDB ID", async () => {
    const { resolveImdbToTmdb } = await import("@/lib/imdb-resolver")
    const mockedResolve = vi.mocked(resolveImdbToTmdb)
    mockedResolve.mockResolvedValue(42)

    const posterBuf = await imageBuffer("#101010", 500, 750)

    mockedGetById.mockResolvedValue({
      tmdbId: 42,
      mediaType: "movie",
      title: "From IMDB",
      posterPath: "/poster.jpg",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-16T10:15:30.000Z",
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(posterBuf), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(posterBuf.length) },
      }),
    )

    const req = new NextRequest("http://localhost:3000/api/poster/movie/tt1234567")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "tt1234567" }) })
    expect(res.status).toBe(200)
  })

  it("normalizes series/tv media type", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)

    mockedGetById.mockResolvedValue({
      tmdbId: 10,
      mediaType: "tv",
      title: "Series Test",
      posterPath: "/poster.jpg",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-16T10:15:30.000Z",
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(posterBuf), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(posterBuf.length) },
      }),
    )

    const req = new NextRequest("http://localhost:3000/api/poster/series/10")
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "10" }) })
    expect(res.status).toBe(200)
  })

  it("includes version param in preview response", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)

    mockedGetById.mockResolvedValue({
      tmdbId: 10,
      mediaType: "movie",
      title: "Preview",
      posterPath: "/poster.jpg",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-16T10:15:30.000Z",
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(posterBuf), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(posterBuf.length) },
      }),
    )

    const req = new NextRequest(`http://localhost:3000/api/poster/movie/10?preview=1`)
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "10" }) })
    expect(res.status).toBe(200)
    // Preview should have no-cache
    expect(res.headers.get("Cache-Control")).toContain("no-cache")
  })

  it("handles auto-rotate when mapping has rotation state", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)

    mockedGetById.mockResolvedValue({
      tmdbId: 10,
      mediaType: "movie",
      title: "Rotating",
      posterPath: "/current.jpg",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-16T10:15:30.000Z",
      cleanPosters: ["/current.jpg", "/next.jpg"],
      cleanPosterIndex: 0,
    })

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input)
      const body = url.includes("/next.jpg") ? await imageBuffer("#202020", 500, 750) : posterBuf
      return new Response(new Uint8Array(body), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(body.length) },
      })
    })

    const req = new NextRequest("http://localhost:3000/api/poster/movie/10")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "10" }) })
    expect(res.status).toBe(200)
  })

  it("uses the profile MDBList key for the anime rank lookup (tv)", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)

    mockedGetById.mockResolvedValue(null)
    mockedGetDetails.mockResolvedValue({
      id: 42,
      title: "Test Anime",
      genres: [{ id: 16, name: "Animation" }],
      vote_average: 8.0,
      vote_count: 100,
      original_language: "ja",
      first_air_date: "2020-01-01",
      type: "scripted",
      production_companies: [],
    })
    mockedGetImages.mockResolvedValue({
      id: 42,
      posters: [
        { file_path: "/anime-clean.jpg", iso_639_1: null, vote_average: 8.0, vote_count: 100, width: 500, height: 750, aspect_ratio: 0.667 },
      ],
      logos: [],
      backdrops: [],
    })
    mockedGetExternalIds.mockResolvedValue({ imdb_id: "tt0000042" })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(posterBuf), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(posterBuf.length) },
      }),
    )

    // Profilo con chiave MDBList: il rank anime deve usarla invece del fetch
    // keyless che risponde 503 "Invalid API key".
    mockedGetFullProfileData.mockResolvedValue({
      config: { globalBadges: true, rankingBadges: true, blurEnabled: true, blurIntensity: 5, blurFade: 60, blurDarkness: 40, gradientHeight: 30, networkLogo: true, autoRotateClean: true, logoFitEnabled: false },
      apiKeys: { tmdbKey: "profile-tmdb", mdblistApiKey: "profile-mdblist" },
    } as never)

    const req = new NextRequest("http://localhost:3000/api/poster/tv/42?u=550e8400-e29b-41d4-a716-446655440000")
    const res = await GET(req, { params: Promise.resolve({ type: "tv", id: "42" }) })

    expect(res.status).toBe(200)
    expect(mockedFetchMDBList).toHaveBeenCalledWith("mdblistAnime", "profile-mdblist")
  })

  it("uses the animerank query param as anime rank override (preview WYSIWYG)", async () => {
    const posterBuf = await imageBuffer("#101010", 500, 750)

    mockedGetById.mockResolvedValue(null)
    mockedGetDetails.mockResolvedValue({
      id: 42,
      title: "Test Anime",
      genres: [{ id: 16, name: "Animation" }],
      vote_average: 8.0,
      vote_count: 100,
      original_language: "ja",
      first_air_date: "2020-01-01",
      type: "scripted",
      production_companies: [],
    })
    mockedGetImages.mockResolvedValue({
      id: 42,
      posters: [
        { file_path: "/anime-clean.jpg", iso_639_1: null, vote_average: 8.0, vote_count: 100, width: 500, height: 750, aspect_ratio: 0.667 },
      ],
      logos: [],
      backdrops: [],
    })
    mockedGetExternalIds.mockResolvedValue({ imdb_id: "tt0000042" })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(posterBuf), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(posterBuf.length) },
      }),
    )

    mockedFetchMDBList.mockClear()
    const req = new NextRequest("http://localhost:3000/api/poster/tv/42?animerank=5&debug=1")
    const res = await GET(req, { params: Promise.resolve({ type: "tv", id: "42" }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rankings.anime).toBe(5)
    // L'override evita il fetch MDBList (la preview non porta chiavi)
    expect(mockedFetchMDBList).not.toHaveBeenCalled()
  })
})
