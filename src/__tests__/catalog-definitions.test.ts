import { describe, expect, it } from "vitest"
import { getWarmupCatalogs, POSTERIUM_CATALOGS, WARMUP_CATALOG_IDS } from "@/lib/catalog-definitions"

describe("catalog definitions", () => {
  it("keeps warmup catalog IDs backed by manifest catalogs", () => {
    const manifestIds: Set<string> = new Set(POSTERIUM_CATALOGS.map((catalog) => catalog.id))

    const warmupCatalogs = getWarmupCatalogs()

    expect(warmupCatalogs.map((catalog) => catalog.id)).toEqual([
      "posterium-jw-movies",
      "posterium-jw-series",
      "posterium-anime",
    ])
    expect(warmupCatalogs.every((catalog) => manifestIds.has(catalog.id))).toBe(true)
    expect(warmupCatalogs.map((catalog) => catalog.type)).toEqual(["movie", "series", "series"])
    expect(WARMUP_CATALOG_IDS).toHaveLength(3)
  })
})
