import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/tmdb/[id]/details/route"
import { getDetails, getExternalIds } from "@/lib/tmdb"
import { fetchAggregatedRating } from "@/lib/ratings"
import { cacheClear } from "@/lib/cache"
import * as cacheModule from "@/lib/cache"

vi.mock("@/lib/tmdb", () => ({
  getDetails: vi.fn(),
  getExternalIds: vi.fn(),
}))
vi.mock("@/lib/ratings", () => ({
  fetchAggregatedRating: vi.fn(async () => null),
}))

const BASE_DETAILS = {
  title: "Test", name: null, genres: [], vote_average: 7.3, vote_count: 0, type: "movie",
  status: null, release_date: null, first_air_date: null, last_air_date: null,
  next_episode_to_air: null, number_of_seasons: null, number_of_episodes: null,
  networks: [], production_companies: [], original_language: "en",
}

function makeReq(mdblistKey?: string): NextRequest {
  const query = mdblistKey
    ? `?type=movie&language=it-IT&api_key=k&mdblist_key=${mdblistKey}`
    : "?type=movie&language=it-IT&api_key=k"
  return new NextRequest(`http://localhost:3000/api/tmdb/123/details${query}`)
}

describe("GET /api/tmdb/[id]/details (voto medio TMDB+IMDb)", () => {
  afterEach(() => {
    vi.clearAllMocks()
    cacheClear()
  })

  it("falls back to TMDB vote_average when no aggregated rating is available", async () => {
    ;(getDetails as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_DETAILS)
    ;(getExternalIds as ReturnType<typeof vi.fn>).mockResolvedValue({ imdb_id: "tt123" })

    const res = await GET(makeReq(), { params: Promise.resolve({ id: "123" }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.voteAverage).toBe(7.3)
  })

  it("uses the TMDB+IMDb average when the aggregated rating is available", async () => {
    ;(getDetails as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_DETAILS)
    ;(getExternalIds as ReturnType<typeof vi.fn>).mockResolvedValue({ imdb_id: "tt123" })
    ;(fetchAggregatedRating as ReturnType<typeof vi.fn>).mockResolvedValue({
      sources: { imdb: 8.0, tmdb: 7.3 }, average: 7.65, count: 2,
    })

    const res = await GET(makeReq(), { params: Promise.resolve({ id: "123" }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.voteAverage).toBe(7.65)
  })

  it("uses distinct cache keys for different mdblist_key values (hash, not plaintext)", async () => {
    ;(getDetails as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_DETAILS)
    ;(getExternalIds as ReturnType<typeof vi.fn>).mockResolvedValue({ imdb_id: "tt123" })

    const keys: string[] = []
    const originalSet = cacheModule.cacheSet
    const spy = vi.spyOn(cacheModule, "cacheSet").mockImplementation((key: string, value: unknown, tags?: string[]) => {
      keys.push(key)
      originalSet(key, value, tags)
    })

    const res1 = await GET(makeReq("keyAAA"), { params: Promise.resolve({ id: "123" }) })
    const res2 = await GET(makeReq("keyBBB"), { params: Promise.resolve({ id: "123" }) })

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(keys).toHaveLength(2)
    // Chiavi diverse → non c'è cache hit incrociato con un'altra chiave mdblist.
    expect(keys[0]).not.toBe(keys[1])
    // Prefisso standard details:v11.
    expect(keys[0]).toMatch(/^details:v11:movie:123:it-IT:/)
    // La chiave API non deve apparire in chiaro nel cache key (hash sha1 a 8 hex).
    expect(keys[0]).not.toContain("keyAAA")
    expect(keys[1]).not.toContain("keyBBB")

    spy.mockRestore()
  })

  it("uses the same cache key for repeated requests with the same mdblist_key (cache hit)", async () => {
    ;(getDetails as ReturnType<typeof vi.fn>).mockResolvedValue(BASE_DETAILS)
    ;(getExternalIds as ReturnType<typeof vi.fn>).mockResolvedValue({ imdb_id: "tt123" })

    const keys: string[] = []
    const originalSet = cacheModule.cacheSet
    const spy = vi.spyOn(cacheModule, "cacheSet").mockImplementation((key: string, value: unknown, tags?: string[]) => {
      keys.push(key)
      originalSet(key, value, tags)
    })

    await GET(makeReq("keyAAA"), { params: Promise.resolve({ id: "123" }) })
    await GET(makeReq("keyAAA"), { params: Promise.resolve({ id: "123" }) })

    // Seconda chiamata servita dalla cache: cacheSet chiamato una sola volta.
    expect(keys).toHaveLength(1)
    spy.mockRestore()
  })
})
