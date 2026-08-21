import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/meta/[type]/[id]/route"
import { cacheClear } from "@/lib/cache"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getById } from "@/lib/store"

vi.mock("@/lib/store", () => ({
  getById: vi.fn(),
}))

vi.mock("@/lib/server-defaults", () => ({
  getServerDefaults: vi.fn(() => ({})),
}))

const mockedGetById = vi.mocked(getById)

describe("GET /meta/[type]/[id]", () => {
  beforeEach(() => {
    mockedGetById.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mockedGetById.mockReset()
    cacheClear()
  })

  it("returns complete movie metadata with Posterium poster URL and cast/crew", async () => {
    vi.spyOn(globalThis, "fetch")
      // /find/tt0137523
      .mockResolvedValueOnce(Response.json({
        movie_results: [{ id: 550, title: "Fight Club" }],
      }))
      // /movie/550 details
      .mockResolvedValueOnce(Response.json({
        id: 550,
        title: "Fight Club",
        overview: "Un impiegato insonne...",
        release_date: "1999-10-15",
        runtime: 139,
        vote_average: 8.4,
        genres: [{ id: 18, name: "Dramma" }, { id: 53, name: "Thriller" }],
        backdrop_path: "/backdrop.jpg",
        external_ids: { imdb_id: "tt0137523" },
        credits: {
          cast: [{ name: "Brad Pitt" }, { name: "Edward Norton" }],
          crew: [{ name: "David Fincher", job: "Director" }],
        },
        videos: {
          results: [{ site: "YouTube", key: "trailer123", type: "Trailer", name: "Trailer Ufficiale" }],
        },
      }))
      // /movie/550/images for logo
      .mockResolvedValueOnce(Response.json({
        logos: [{ file_path: "/fight-club-logo.png", iso_639_1: "it" }],
      }))

    const req = new NextRequest("http://localhost:3000/meta/movie/tt0137523.json?api_key=settings-key")
    const res = await GET(req, {
      params: Promise.resolve({ type: "movie", id: "tt0137523.json" }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.meta).toMatchObject({
      id: "tt0137523",
      type: "movie",
      name: "Fight Club",
      releaseInfo: "1999",
      runtime: "139 min",
      imdbRating: "8.4",
      genres: ["Dramma", "Thriller"],
      cast: ["Brad Pitt", "Edward Norton"],
      director: ["David Fincher"],
      behaviorHints: { defaultVideoId: "tt0137523" },
    })
    expect(body.meta.poster).toContain("/api/poster/movie/550")
    expect(body.meta.poster).toContain(`rv=${POSTER_URL_VERSION}`)
    expect(body.meta.background).toContain("/backdrop.jpg")
    expect(body.meta.logo).toContain("/fight-club-logo.png")
    expect(body.meta.trailers).toEqual([{ source: "trailer123", type: "Trailer" }])
  })

  it("returns complete series metadata with seasons and episode videos", async () => {
    vi.spyOn(globalThis, "fetch")
      // /tv/94997 details
      .mockResolvedValueOnce(Response.json({
        id: 94997,
        name: "House of the Dragon",
        overview: "La storia della Casa Targaryen...",
        first_air_date: "2022-08-21",
        vote_average: 8.4,
        genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }, { id: 18, name: "Dramma" }],
        backdrop_path: "/hotd-backdrop.jpg",
        external_ids: { imdb_id: "tt11198330" },
        seasons: [
          { season_number: 1, episode_count: 2 },
        ],
        credits: {
          cast: [{ name: "Matt Smith" }, { name: "Emma D'Arcy" }],
        },
      }))
      // /tv/94997/images
      .mockResolvedValueOnce(Response.json({ logos: [] }))
      // /tv/94997/episode_groups
      .mockResolvedValueOnce(Response.json({ results: [] }))
      // /tv/94997/season/1
      .mockResolvedValueOnce(Response.json({
        id: 1234,
        season_number: 1,
        name: "Stagione 1",
        episodes: [
          {
            id: 101,
            season_number: 1,
            episode_number: 1,
            name: "Gli eredi del drago",
            overview: "Re Viserys organizza un torneo...",
            still_path: "/ep1.jpg",
            air_date: "2022-08-21",
            vote_average: 8.1,
          },
          {
            id: 102,
            season_number: 1,
            episode_number: 2,
            name: "Il principe canaglia",
            overview: "Rhaenyra propone un piano...",
            still_path: "/ep2.jpg",
            air_date: "2022-08-28",
            vote_average: 8.3,
          },
        ],
      }))

    const req = new NextRequest("http://localhost:3000/meta/series/tmdb:94997.json?api_key=settings-key")
    const res = await GET(req, {
      params: Promise.resolve({ type: "series", id: "tmdb:94997.json" }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.meta).toMatchObject({
      id: "tt11198330",
      type: "series",
      name: "House of the Dragon",
      releaseInfo: "2022",
      imdbRating: "8.4",
      genres: ["Sci-Fi & Fantasy", "Dramma"],
      cast: ["Matt Smith", "Emma D'Arcy"],
    })
    expect(body.meta.videos).toHaveLength(2)
    expect(body.meta.videos[0]).toMatchObject({
      id: "tt11198330:1:1",
      season: 1,
      episode: 1,
      name: "Gli eredi del drago",
      thumbnail: expect.stringContaining("/ep1.jpg"),
    })
    expect(body.meta.videos[1]).toMatchObject({
      id: "tt11198330:1:2",
      season: 1,
      episode: 2,
      name: "Il principe canaglia",
      thumbnail: expect.stringContaining("/ep2.jpg"),
    })
  })

  it("supports alternative Netflix Episode Groups (e.g. 5 parts for La Casa de Papel)", async () => {
    vi.spyOn(globalThis, "fetch")
      // /find/tt6468322
      .mockResolvedValueOnce(Response.json({
        tv_results: [{ id: 71446 }],
      }))
      // /tv/71446 details
      .mockResolvedValueOnce(Response.json({
        id: 71446,
        name: "La casa di carta",
        overview: "Una banda di ladri...",
        first_air_date: "2017-05-02",
        vote_average: 8.2,
        genres: [{ id: 80, name: "Crime" }, { id: 18, name: "Dramma" }],
        external_ids: { imdb_id: "tt6468322" },
        seasons: [{ season_number: 1 }, { season_number: 2 }],
      }))
      // /tv/71446/images
      .mockResolvedValueOnce(Response.json({ logos: [] }))
      // /tv/71446/episode_groups
      .mockResolvedValueOnce(Response.json({
        results: [
          { id: "grp_netflix_5", name: "Netflix Order", type: 1, group_count: 5 },
        ],
      }))
      // /tv/episode_group/grp_netflix_5
      .mockResolvedValueOnce(Response.json({
        id: "grp_netflix_5",
        name: "Netflix Order",
        groups: [
          {
            id: "part_1",
            name: "Parte 1",
            order: 1,
            episodes: [{ id: 1, episode_number: 1, name: "Effetto Guggenheim", air_date: "2017-12-20" }],
          },
          {
            id: "part_5",
            name: "Parte 5",
            order: 5,
            episodes: [{ id: 50, episode_number: 1, name: "Fine della corsa", air_date: "2021-09-03" }],
          },
        ],
      }))

    const req = new NextRequest("http://localhost:3000/meta/series/tt6468322.json?api_key=settings-key")
    const res = await GET(req, {
      params: Promise.resolve({ type: "series", id: "tt6468322.json" }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.meta.videos).toHaveLength(2)
    // Parte 1
    expect(body.meta.videos[0]).toMatchObject({
      id: "tt6468322:1:1",
      season: 1,
      episode: 1,
      name: "Effetto Guggenheim",
    })
    // Parte 5
    expect(body.meta.videos[1]).toMatchObject({
      id: "tt6468322:5:1",
      season: 5,
      episode: 1,
      name: "Fine della corsa",
    })
  })

  it("returns null meta when title cannot be found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ movie_results: [] }))

    const req = new NextRequest("http://localhost:3000/meta/movie/tt0000000.json?api_key=settings-key")
    const res = await GET(req, {
      params: Promise.resolve({ type: "movie", id: "tt0000000.json" }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.meta).toBeNull()
  })
})
