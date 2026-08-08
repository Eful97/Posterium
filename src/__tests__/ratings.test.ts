import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchAggregatedRating } from "@/lib/ratings"
import { cacheClear } from "@/lib/cache"
import * as cacheModule from "@/lib/cache"
import { getServerDefaults } from "@/lib/server-defaults"

vi.mock("@/lib/server-defaults", () => ({
  getServerDefaults: vi.fn(() => ({ mdblistApiKey: "" })),
}))

function okFetch(_url: string | URL | Request) {
  return { ok: true, json: async () => ({ ratings: [{ source: "imdb", value: 8.4 }] }) }
}

describe("fetchAggregatedRating (D4 — mdblist key nel cache key, D5 — chiavi Settings)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    cacheClear()
    vi.clearAllMocks()
  })

  it("usa la chiave d'istanza (Settings) come fallback quando nessuna key esplicita (D5)", async () => {
    const fetchMock = vi.fn(okFetch)
    vi.stubGlobal("fetch", fetchMock)
    vi.mocked(getServerDefaults).mockReturnValue({ mdblistApiKey: "settings-key" })

    const result = await fetchAggregatedRating("tt123")

    expect(result?.average).toBe(8.4)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain("apikey=settings-key")
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
})
