import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/catalog/[type]/[id]/route"
import { cacheClear } from "@/lib/cache"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getTop10 } from "@/lib/flixpatrol"

vi.mock("@/lib/flixpatrol", () => ({
  getTop10: vi.fn(),
}))

const mockedGetTop10 = vi.mocked(getTop10)

function justWatchResponse(tmdbId: number): Response {
  return Response.json({
    data: {
      streamingCharts: {
        edges: [
          {
            node: {
              content: {
                externalIds: { tmdbId },
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
  afterEach(() => {
    vi.restoreAllMocks()
    mockedGetTop10.mockReset()
    cacheClear()
    delete process.env.TMDB_API_KEY
  })

  it("builds Posterium series poster URLs for JustWatch series catalogs", async () => {
    process.env.TMDB_API_KEY = "tmdb-key"
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/series/posterium-jw-series.json")
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "posterium-jw-series.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas[0]).toMatchObject({
      type: "series",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/series/94997"),
    })
    expect(body.metas[0].poster).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("normalizes tv catalog routes to Posterium series poster URLs", async () => {
    process.env.TMDB_API_KEY = "tmdb-key"
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/tv/posterium-jw-series.json")
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
    process.env.TMDB_API_KEY = "tmdb-key"
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

    const req = new NextRequest("http://localhost:3000/catalog/movie/posterium-netflix-movies.json")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "posterium-netflix-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas[0]).toMatchObject({
      type: "movie",
      name: "Costa Concordia: incubo in mare",
      poster: expect.stringContaining("/api/poster/movie/1715492"),
    })
    expect(body.metas[0].poster).toContain(`rv=${POSTER_URL_VERSION}`)
  })
})
