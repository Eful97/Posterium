import { afterEach, describe, expect, it } from "vitest"
import { GET } from "@/app/api/cache/status/route"
import { cacheClear, cacheSet } from "@/lib/cache"

afterEach(() => {
  cacheClear()
  delete process.env.ADMIN_TOKEN
})

describe("GET /api/cache/status", () => {
  it("returns cache status grouped by tag", async () => {
    cacheSet("poster:1", "a", ["poster"])
    cacheSet("poster:2", "b", ["poster"])
    cacheSet("catalog:1", "c", ["catalog", "stremio"])
    cacheSet("misc", "d")

    const req = new Request("http://localhost:3000/api/cache/status")
    const res = await GET(req as never)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      totalEntries: 4,
      taggedEntries: [
        { tag: "catalog", count: 1 },
        { tag: "poster", count: 2 },
        { tag: "stremio", count: 1 },
      ],
      untaggedEntries: 1,
    })
  })

  it("requires admin token when configured", async () => {
    process.env.ADMIN_TOKEN = "secret"

    const req = new Request("http://localhost:3000/api/cache/status")
    const res = await GET(req as never)

    expect(res.status).toBe(401)
  })

  it("does not count expired entries", async () => {
    cacheSet("expired", "old", ["short-lived"], -1)

    const req = new Request("http://localhost:3000/api/cache/status")
    const res = await GET(req as never)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      totalEntries: 0,
      taggedEntries: [],
      untaggedEntries: 0,
    })
  })
})
