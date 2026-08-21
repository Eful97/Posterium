import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchAggregatedRating, calculateAverageRating } from "@/lib/ratings"
import { cacheClear } from "@/lib/cache"
import * as cacheModule from "@/lib/cache"

function okFetch(_url: string | URL | Request) {
  return { ok: true, json: async () => ({ ratings: [{ source: "imdb", value: 8.4 }] }) }
}

describe("fetchAggregatedRating (D4 — mdblist key nel cache key, D5 — niente chiave d'istanza)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    cacheClear()
    vi.clearAllMocks()
  })

  it("senza key esplicita nessun fallback d'istanza: richiesta senza apikey (D5)", async () => {
    const fetchMock = vi.fn(okFetch)
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchAggregatedRating("tt123")

    expect(result?.average).toBe(8.4)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).not.toContain("apikey=")
  })

  it("cache key con hash della chiave mdblist, mai plaintext, e distinto per key (D4)", async () => {
    vi.stubGlobal("fetch", vi.fn(okFetch))
    const keys: string[] = []
    const originalSet = cacheModule.cacheSet
    const spy = vi.spyOn(cacheModule, "cacheSet").mockImplementation((k: string, v: unknown, tags?: string[]) => {
      keys.push(k)
      originalSet(k, v, tags)
    })

    await fetchAggregatedRating("tt1", "keyAAA")
    await fetchAggregatedRating("tt1", "keyBBB")

    expect(keys).toHaveLength(2)
    expect(keys[0]).toMatch(/^mdb:ratings:tt1:/)
    expect(keys[0]).not.toBe(keys[1])
    expect(keys[0]).not.toContain("keyAAA")
    expect(keys[1]).not.toContain("keyBBB")
    spy.mockRestore()
  })

  it("parsa correttamente tutte le fonti supportate (IMDb, TMDB, MDBList, Rotten Tomatoes, Popcorntime, Metacritic, SIMKL, Filmweb, Roger Ebert, AniList, Kitsu, etc.)", async () => {
    const multiSourceFetch = () => ({
      ok: true,
      json: async () => ({
        score: 75,
        ratings: [
          { source: "imdb", value: 8.4, score: 84 },
          { source: "tmdb", value: 8.0, score: 80 },
          { source: "tomatoes", value: 92, score: 92 },
          { source: "popcorn", value: 7.9, score: 79 },
          { source: "metacritic", value: 85, score: 85 },
          { source: "metacriticuser", value: 7.7, score: 77 },
          { source: "letterboxd", value: 4.1, score: 82 },
          { source: "trakt", value: 8.3, score: 83 },
          { source: "simkl", value: 8.1, score: 81 },
          { source: "filmweb", value: 7.6, score: 76 },
          { source: "filmweb_critics", value: 8.0, score: 80 },
          { source: "roger_ebert", value: 3.5 },
          { source: "myanimelist", value: 8.9, score: 89 },
          { source: "anilist", score: 86 },
          { source: "kitsu", score: 82 },
        ],
      }),
    })
    vi.stubGlobal("fetch", vi.fn(multiSourceFetch))

    const result = await fetchAggregatedRating("tt999")
    expect(result).not.toBeNull()
    expect(result?.sources.imdb).toBe(8.4)
    expect(result?.sources.tmdb).toBe(8.0)
    expect(result?.sources.mdblist).toBe(7.5)
    expect(result?.sources.tomatoes).toBe(9.2)
    expect(result?.sources.popcorntime).toBe(7.9)
    expect(result?.sources.metacritic).toBe(8.5)
    expect(result?.sources.metacriticuser).toBe(7.7)
    expect(result?.sources.letterboxd).toBe(8.2)
    expect(result?.sources.trakt).toBe(8.3)
    expect(result?.sources.simkl).toBe(8.1)
    expect(result?.sources.filmweb).toBe(7.6)
    expect(result?.sources.filmwebcritics).toBe(8.0)
    expect(result?.sources.rogerebert).toBe(8.8) // 3.5 * 2.5 = 8.75 -> 8.8
    expect(result?.sources.mal).toBe(8.9)
    expect(result?.sources.anilist).toBe(8.6)
    expect(result?.sources.kitsu).toBe(8.2)
    // Default average is between IMDb and TMDB
    expect(result?.average).toBe(8.2)
  })

  it("calculateAverageRating calcola la media in base alle fonti richieste", () => {
    const sample = {
      sources: {
        imdb: 8.0,
        tmdb: 9.0,
        tomatoes: 9.5,
        metacritic: 7.0,
      },
      average: 8.5,
      count: 4,
    }

    // Default: imdb + tmdb -> (8.0 + 9.0) / 2 = 8.5
    expect(calculateAverageRating(sample)).toBe(8.5)
    // Custom: tomatoes + metacritic -> (9.5 + 7.0) / 2 = 8.25
    expect(calculateAverageRating(sample, ["tomatoes", "metacritic"])).toBe(8.25)
    // Custom: solo metacritic -> 7.0
    expect(calculateAverageRating(sample, ["metacritic"])).toBe(7.0)
    // Fonte assente: ignora e usa le presenti
    expect(calculateAverageRating(sample, ["tomatoes", "letterboxd"])).toBe(9.5)
    // Nessuna fonte trovata -> null
    expect(calculateAverageRating(sample, ["letterboxd", "mal"])).toBeNull()
    expect(calculateAverageRating(null)).toBeNull()
  })
})
