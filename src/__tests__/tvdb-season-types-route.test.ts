import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/tvdb/[id]/seasonTypes/route"
import { cacheClear } from "@/lib/cache"
import { clearTvdbCache } from "@/lib/tvdb"

describe("GET /api/tvdb/[id]/seasonTypes", () => {
  beforeEach(() => {
    cacheClear()
    clearTvdbCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cacheClear()
    clearTvdbCache()
  })

  it("returns season types when resolved with IMDb ID", async () => {
    vi.spyOn(globalThis, "fetch")
      // 1. Auth token
      .mockResolvedValueOnce(
        Response.json({ status: "success", data: { token: "mock-jwt" } })
      )
      // 2. Search remoteid for IMDb tt6468322
      .mockResolvedValueOnce(
        Response.json({
          status: "success",
          data: [{ series: { id: 327153, name: "La Casa de Papel" } }],
        })
      )
      // 3. Series extended
      .mockResolvedValueOnce(
        Response.json({
          status: "success",
          data: {
            id: 327153,
            name: "La Casa de Papel",
            seasonTypes: [
              { id: 1, name: "Aired Order", type: "official", alternateName: null },
              { id: 3, name: "Alternate Order", type: "alternate", alternateName: "Netflix" },
            ],
          },
        })
      )

    const req = new NextRequest("http://localhost:3000/api/tvdb/tt6468322/seasonTypes?tvdb_key=valid-key")
    const res = await GET(req, { params: Promise.resolve({ id: "tt6468322" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tvdbId).toBe(327153)
    expect(json.results).toHaveLength(2)
    expect(json.results[0].type).toBe("official")
    expect(json.results[1].alternateName).toBe("Netflix")
  })

  it("returns error message when tvdb key is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/tvdb/71446/seasonTypes")
    const res = await GET(req, { params: Promise.resolve({ id: "71446" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toEqual([])
    expect(json.error).toContain("TVDB key missing")
  })
})
