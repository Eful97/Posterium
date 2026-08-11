import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/catalog/[type]/[id]/route"
import { cacheClear } from "@/lib/cache"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getTop10 } from "@/lib/flixpatrol"
import { getById } from "@/lib/store"
import { __resetJWRankingsCache } from "@/lib/justwatch"

vi.mock("@/lib/flixpatrol", () => ({
  getTop10: vi.fn(),
}))

vi.mock("@/lib/store", () => ({
  getById: vi.fn(),
}))

vi.mock("@/lib/server-defaults", () => ({
  getServerDefaults: vi.fn(() => ({})),
}))

const mockedGetTop10 = vi.mocked(getTop10)
const mockedGetById = vi.mocked(getById)

function justWatchResponse(tmdbId: number, imdbId?: string): Response {
  return Response.json({
    data: {
      streamingCharts: {
        edges: [
          {
            streamingChartInfo: { rank: 1 },
            node: {
              content: {
                externalIds: { tmdbId, imdbId: imdbId ?? null },
              },
            },
          },
        ],
      },
    },
  })
}

function tmdbShowResponse(tmdbId: number): Response {
  return Response.json({
    id: tmdbId,
    name: "House of the Dragon",
    poster_path: "/house-of-the-dragon.jpg",
    first_air_date: "2022-08-21",
  })
}

describe("GET /catalog/[type]/[id]", () => {
  beforeEach(() => {
    mockedGetById.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mockedGetTop10.mockReset()
    mockedGetById.mockReset()
    __resetJWRankingsCache()
    cacheClear()
  })

  it("builds Posterium series poster URLs for JustWatch series catalogs", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/series/posterium-jw-series.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "posterium-jw-series.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas[0]).toMatchObject({
      id: "tt11198330",
      type: "series",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/series/94997"),
    })
    expect(body.metas[0].poster).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("adds mapping version to catalog poster URLs for saved titles", async () => {
    mockedGetById.mockResolvedValueOnce({
      tmdbId: 94997,
      mediaType: "tv",
      title: "House of the Dragon",
      posterPath: "/saved.jpg",
      logoPath: "/logo.png",
      originalPosterPath: null,
      language: null,
      updatedAt: "2026-07-16T10:15:30.000Z",
    })
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/series/posterium-jw-series.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "posterium-jw-series.json" }) })
    const body = await res.json()
    const posterUrl = new URL(body.metas[0].poster)

    expect(res.status).toBe(200)
    expect(posterUrl.searchParams.get("mv")).toBe(String(Date.parse("2026-07-16T10:15:30.000Z")))
  })

  it("normalizes tv catalog routes to Posterium series poster URLs", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/tv/posterium-jw-series.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "tv", id: "posterium-jw-series.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas[0]).toMatchObject({
      type: "series",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/series/94997"),
    })
    expect(body.metas[0].poster).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("builds Posterium poster URLs for platform catalogs even when source posterPath is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ id: 1715492, imdb_id: "tt1715492" }),
    )
    mockedGetTop10.mockResolvedValueOnce({
      platform: "netflix",
      platformName: "Netflix",
      country: "italy",
      movies: [
        {
          rank: 1,
          title: "Costa Concordia: incubo in mare",
          tmdbId: 1715492,
          mediaType: "movie",
          posterPath: null,
          releaseDate: "2026-01-01",
        },
      ],
      tv: [],
    })

    const req = new NextRequest("http://localhost:3000/catalog/movie/posterium-netflix-movies.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "posterium-netflix-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockedGetTop10).toHaveBeenCalledWith("netflix", "italy", "settings-key", { enrich: false })
    expect(body.metas[0]).toMatchObject({
      id: "tt1715492",
      type: "movie",
      name: "Costa Concordia: incubo in mare",
      poster: expect.stringContaining("/api/poster/movie/1715492"),
    })
    expect(body.metas[0].poster).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("falls back to TMDB external_ids when JustWatch lacks an IMDb id", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(687163))
      .mockResolvedValueOnce(tmdbShowResponse(687163))
      .mockResolvedValueOnce(Response.json({ id: 687163, imdb_id: "tt12042730" }))

    const req = new NextRequest("http://localhost:3000/catalog/movie/posterium-jw-movies.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "posterium-jw-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
    expect(body.metas[0]).toMatchObject({
      id: "tt12042730",
      type: "movie",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/movie/687163"),
    })
  })

  it("uses the IMDb id already returned by JustWatch (no extra TMDB call)", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(8282, "tt0848228"))
      .mockResolvedValueOnce(tmdbShowResponse(8282))

    const req = new NextRequest("http://localhost:3000/catalog/movie/posterium-jw-movies.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "posterium-jw-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
    expect(body.metas[0]).toMatchObject({
      id: "tt0848228",
      type: "movie",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/movie/8282"),
    })
  })

  it("exposes a tmdb:<id> provider id when no IMDb id is resolvable (AIOMetadata compat)", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(67890))
      .mockResolvedValueOnce(tmdbShowResponse(67890))
      .mockResolvedValueOnce(Response.json({ id: 67890, imdb_id: null }))

    const req = new NextRequest("http://localhost:3000/catalog/movie/posterium-jw-movies.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "posterium-jw-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:67890",
      type: "movie",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/movie/67890"),
    })
  })
})
