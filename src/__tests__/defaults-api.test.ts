import { afterEach, describe, expect, it, vi } from "vitest"
import { PUT } from "@/app/api/defaults/route"
import { cacheClear, cacheGet, cacheSet } from "@/lib/cache"

afterEach(() => {
  vi.restoreAllMocks()
  cacheClear()
  delete process.env.ADMIN_TOKEN
})

function mockPutRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/defaults", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("PUT /api/defaults", () => {
  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost:3000/api/defaults", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "not json",
    })
    const res = await PUT(req as any)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid body fields", async () => {
    const req = mockPutRequest({ badgeStyle: 123, blurEnabled: "yes" })
    const res = await PUT(req as any)
    expect(res.status).toBe(400)
  })

  it("returns 401 when ADMIN_TOKEN is set and header is missing", async () => {
    process.env.ADMIN_TOKEN = "secret-token"
    const req = mockPutRequest({ badgeStyle: "bar" })
    const res = await PUT(req as any)
    expect(res.status).toBe(401)
  })

  it("accepts valid body with no auth token set", async () => {
    delete process.env.ADMIN_TOKEN
    const req = mockPutRequest({ badgeStyle: "bar", rankingBadges: true })
    const res = await PUT(req as any)
    expect(res.status).toBe(200)
  })

  it("invalidates poster and catalog cache after saving defaults", async () => {
    delete process.env.ADMIN_TOKEN
    cacheSet("poster:movie:1", "poster", ["poster"])
    cacheSet("catalog:movie:top", "catalog", ["catalog"])
    cacheSet("tmdb:search:avatar", "search", ["tmdb"])

    const req = mockPutRequest({ badgeStyle: "bar" })
    const res = await PUT(req as any)

    expect(res.status).toBe(200)
    expect(cacheGet("poster:movie:1")).toBeNull()
    expect(cacheGet("catalog:movie:top")).toBeNull()
    expect(cacheGet("tmdb:search:avatar")).toBe("search")
  })
})
