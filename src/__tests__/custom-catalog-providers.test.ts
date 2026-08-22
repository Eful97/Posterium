import { describe, it, expect, vi, beforeEach } from "vitest"
import { detectCatalogProvider, fetchUnifiedCatalogItems } from "@/lib/custom-catalog-providers"

describe("detectCatalogProvider", () => {
  it("detects Letterboxd list URL", () => {
    const res = detectCatalogProvider("https://letterboxd.com/arinbicer/list/mcu/")
    expect(res).not.toBeNull()
    expect(res?.provider).toBe("letterboxd")
    expect(res?.nameSuggestion).toBe("Mcu")
    expect(res?.defaultType).toBe("mixed")
  })

  it("detects Letterboxd watchlist URL", () => {
    const res = detectCatalogProvider("https://letterboxd.com/dave/watchlist/")
    expect(res).not.toBeNull()
    expect(res?.provider).toBe("letterboxd")
    expect(res?.nameSuggestion).toBe("Watchlist di dave")
    expect(res?.defaultType).toBe("mixed")
  })

  it("detects Trakt list URL", () => {
    const res = detectCatalogProvider("https://trakt.tv/users/donxy/lists/marvel-cinematic-universe")
    expect(res).not.toBeNull()
    expect(res?.provider).toBe("trakt")
    expect(res?.nameSuggestion).toBe("Marvel Cinematic Universe")
    expect(res?.defaultType).toBe("mixed")
  })

  it("detects TMDb Collection URL", () => {
    const res = detectCatalogProvider("https://www.themoviedb.org/collection/86311-the-avengers-collection")
    expect(res).not.toBeNull()
    expect(res?.provider).toBe("tmdb_collection")
    expect(res?.identifier).toBe("86311")
    expect(res?.defaultType).toBe("movie")
  })

  it("detects TMDb List URL", () => {
    const res = detectCatalogProvider("https://www.themoviedb.org/list/8249673")
    expect(res).not.toBeNull()
    expect(res?.provider).toBe("tmdb_list")
    expect(res?.identifier).toBe("8249673")
    expect(res?.defaultType).toBe("movie")
  })

  it("detects TheTVDB list URL", () => {
    const res = detectCatalogProvider("https://thetvdb.com/lists/top-shows")
    expect(res).not.toBeNull()
    expect(res?.provider).toBe("tvdb")
    expect(res?.identifier).toBe("top-shows")
  })

  it("detects IMDb list URL", () => {
    const res = detectCatalogProvider("https://www.imdb.com/list/ls000000000/")
    expect(res).not.toBeNull()
    expect(res?.provider).toBe("imdb")
    expect(res?.identifier).toBe("ls000000000")
  })

  it("falls back to MDBList for other URLs or slugs", () => {
    const res = detectCatalogProvider("https://mdblist.com/lists/snoak/sky-now-top10")
    expect(res?.provider).toBe("mdblist")

    const resSlug = detectCatalogProvider("snoak/trending-movies")
    expect(resSlug?.provider).toBe("mdblist")
  })

  it("returns null for empty input", () => {
    expect(detectCatalogProvider("")).toBeNull()
    expect(detectCatalogProvider("   ")).toBeNull()
  })
})

describe("fetchUnifiedCatalogItems", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("returns empty array on empty input", async () => {
    const items = await fetchUnifiedCatalogItems("")
    expect(items).toEqual([])
  })

  it("fetches Letterboxd list through HEAD + StremThru", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === "HEAD") {
        return Promise.resolve({
          ok: true,
          headers: new Headers({
            "x-letterboxd-identifier": "1XEE4",
          }),
        })
      }
      if (typeof url === "string" && url.includes("stremthru")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              title: "MCU",
              items: [
                {
                  id: "28dA",
                  title: "Iron Man",
                  year: 2008,
                  type: "movie",
                  id_map: { imdb: "tt0371746", tmdb: "1726" },
                },
                {
                  id: "28dB",
                  title: "The Incredible Hulk",
                  year: 2008,
                  type: "movie",
                  id_map: { imdb: "tt0800080", tmdb: "1724" },
                },
              ],
            },
          }),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    }) as any

    const items = await fetchUnifiedCatalogItems("https://letterboxd.com/arinbicer/list/mcu/")
    expect(items.length).toBe(2)
    expect(items[0].title).toBe("Iron Man")
    expect(items[0].imdb).toBe("tt0371746")
    expect(items[0].tmdb).toBe(1726)
    expect(items[0].mediatype).toBe("movie")
  })
})
