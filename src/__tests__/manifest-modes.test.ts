import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { buildManifestResponse } from "@/lib/build-manifest"

describe("buildManifestResponse with hubMode options", () => {
  it("defaults to all (both content catalogs and search catalogs)", async () => {
    const req = new NextRequest("http://localhost:3000/manifest.json")
    const res = await buildManifestResponse(req)
    const json = await res.json()

    expect(json.id).toBe("org.posterium")
    expect(json.name).toBe("Posterium")
    const catalogIds = json.catalogs.map((c: any) => c.id)
    expect(catalogIds).toContain("posterium-search-movies")
    expect(catalogIds).toContain("posterium-search-series")
    expect(catalogIds.length).toBeGreaterThan(2)
  })

  it("handles mode=catalogs (only content catalogs, no search catalogs)", async () => {
    const req = new NextRequest("http://localhost:3000/manifest.json?mode=catalogs")
    const res = await buildManifestResponse(req)
    const json = await res.json()

    expect(json.id).toBe("org.posterium.catalogs")
    expect(json.name).toContain("(Cataloghi)")
    const catalogIds = json.catalogs.map((c: any) => c.id)
    expect(catalogIds).not.toContain("posterium-search-movies")
    expect(catalogIds).not.toContain("posterium-search-series")
    expect(catalogIds.length).toBeGreaterThan(0)
  })

  it("handles mode=search (only search catalogs, no content catalogs)", async () => {
    const req = new NextRequest("http://localhost:3000/manifest.json?mode=search")
    const res = await buildManifestResponse(req)
    const json = await res.json()

    expect(json.id).toBe("org.posterium.search")
    expect(json.name).toContain("(Ricerca)")
    const catalogIds = json.catalogs.map((c: any) => c.id)
    expect(catalogIds).toContain("posterium-search-movies")
    expect(catalogIds).toContain("posterium-search-series")
    expect(catalogIds.length).toBe(2)
  })
})
