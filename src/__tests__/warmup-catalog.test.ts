import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("POST /api/mappings — catalog warmup", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }))

  beforeEach(() => {
    fetchSpy.mockClear()
    process.env.ADMIN_TOKEN = ""
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fires background fetch for poster + catalog URLs after save", async () => {
    const { POST } = await import("@/app/api/mappings/route")

    const body = {
      tmdbId: 42,
      mediaType: "movie",
      title: "Test Film",
      posterPath: "/poster.jpg",
    }

    const req = new Request("http://localhost:3000/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    await new Promise((r) => setTimeout(r, 50))

    const urls = fetchSpy.mock.calls.map((c) => String(c[0]))
    const posterUrl = urls.find((u) => u.includes("/api/poster/movie/42"))
    const hasCatalogMovie = urls.some((u) => u.includes("/catalog/movie/posterium-jw-movies.json"))
    const hasCatalogSeries = urls.some((u) => u.includes("/catalog/series/posterium-jw-series.json"))
    const hasCatalogAnime = urls.some((u) => u.includes("/catalog/series/posterium-anime.json"))

    expect(posterUrl).toBeDefined()
    if (!posterUrl) throw new Error("Poster warmup URL was not called")
    const warmPosterUrl = new URL(posterUrl)
    expect(warmPosterUrl.searchParams.get("rv")).toBeTruthy()
    expect(warmPosterUrl.searchParams.get("bs")).toBeTruthy()
    expect(hasCatalogMovie).toBe(true)
    expect(hasCatalogSeries).toBe(true)
    expect(hasCatalogAnime).toBe(true)
  })

  it("does not block the response for warmup failures", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network down"))

    const { POST } = await import("@/app/api/mappings/route")

    const body = {
      tmdbId: 99,
      mediaType: "tv",
      title: "Test Series",
      posterPath: "/poster2.jpg",
    }

    const req = new Request("http://localhost:3000/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
