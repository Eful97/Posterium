import { describe, it, expect, vi, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/tmdb/trending/route"
import { getJWRankings } from "@/lib/justwatch"
import { cacheClear } from "@/lib/cache"
import * as cacheModule from "@/lib/cache"

vi.mock("@/lib/justwatch", () => ({
  getJWRankings: vi.fn(),
}))

describe("GET /api/tmdb/trending (D6 — risposta degradata non cachata)", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    cacheClear()
  })

  it("non cachea la risposta quando JustWatch fallisce (outage upstream)", async () => {
    vi.mocked(getJWRankings).mockRejectedValue(new Error("JW down"))

    const keys: string[] = []
    const originalSet = cacheModule.cacheSet
    const spy = vi.spyOn(cacheModule, "cacheSet").mockImplementation((k: string, v: unknown, tags?: string[]) => {
      keys.push(k)
      originalSet(k, v, tags)
    })

    const req = new NextRequest("http://localhost:3000/api/tmdb/trending?country=IT")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.movies).toEqual([])
    expect(json.tv).toEqual([])
    // D6: un outage upstream non deve congelarsi in cache → nessuna entry, no-store.
    expect(keys).toHaveLength(0)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    spy.mockRestore()
  })

  it("cacha la risposta quando JW funziona ma non produce rank (vuoto legittimo)", async () => {
    vi.mocked(getJWRankings).mockResolvedValue([])

    const keys: string[] = []
    const originalSet = cacheModule.cacheSet
    const spy = vi.spyOn(cacheModule, "cacheSet").mockImplementation((k: string, v: unknown, tags?: string[]) => {
      keys.push(k)
      originalSet(k, v, tags)
    })

    const req = new NextRequest("http://localhost:3000/api/tmdb/trending?country=IT")
    const res = await GET(req)

    expect(res.status).toBe(200)
    // Nessun errore upstream → il vuoto legittimo può essere cachato.
    expect(keys).toHaveLength(1)
    expect(res.headers.get("Cache-Control")).toContain("public")
    spy.mockRestore()
  })
})
