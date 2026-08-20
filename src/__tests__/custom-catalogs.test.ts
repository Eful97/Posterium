import { describe, it, expect, vi } from "vitest"
import { parseMDBListTarget, fetchCustomMDBList } from "@/lib/mdblist"
import { buildManifestResponse } from "@/lib/build-manifest"
import { encodeConfig } from "@/lib/config-token"
import { NextRequest } from "next/server"

describe("Custom Catalogs & MDBList Parsing", () => {
  describe("parseMDBListTarget", () => {
    it("parses full URL with username and slug", () => {
      const res = parseMDBListTarget("https://mdblist.com/lists/snoak/sky-now-top10")
      expect(res).toEqual({ user: "snoak", slug: "sky-now-top10" })
    })

    it("parses api.mdblist.com URL", () => {
      const res = parseMDBListTarget("https://api.mdblist.com/lists/john/trending-shows")
      expect(res).toEqual({ user: "john", slug: "trending-shows" })
    })

    it("parses numeric list URL", () => {
      const res = parseMDBListTarget("https://mdblist.com/lists/123456")
      expect(res).toEqual({ id: "123456" })
    })

    it("parses user/slug shorthand", () => {
      const res = parseMDBListTarget("snoak/trending-movies")
      expect(res).toEqual({ user: "snoak", slug: "trending-movies" })
    })

    it("parses plain numeric ID", () => {
      const res = parseMDBListTarget("98765")
      expect(res).toEqual({ id: "98765" })
    })

    it("fetches and maps items from MDBList correctly", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({
          items: [
            { id: 100, title: "The Penguin", year: 2024, imdb_id: "tt15474916" },
            { id: 200, title: "Dune: Part Two", year: 2024, imdb_id: "tt15239678" },
          ],
        }),
      )

      const items = await fetchCustomMDBList("https://mdblist.com/lists/snoak/sky-now")
      expect(items).toHaveLength(2)
      expect(items[0]).toEqual({
        imdb: "tt15474916",
        title: "The Penguin",
        year: 2024,
        tmdb: 100,
      })
      expect(items[1]).toEqual({
        imdb: "tt15239678",
        title: "Dune: Part Two",
        year: 2024,
        tmdb: 200,
      })
    })
  })

  describe("Manifest with Custom Catalogs", () => {
    it("includes custom catalogs when encoded in config token", async () => {
      const token = encodeConfig({
        globalBadges: true,
        rankingBadges: true,
        badgeStyle: "pill",
        rankingBadgeStyle: "default",
        blurEnabled: true,
        blurIntensity: 50,
        blurFade: 30,
        blurDarkness: 40,
        gradientHeight: 35,
        networkLogo: true,
        autoRotateClean: true,
        customCatalogs: [
          {
            id: "sky-now-1",
            name: "Sky & NOW — Top 10",
            type: "movie",
            url: "https://mdblist.com/lists/snoak/sky-now",
            enabled: true,
          },
        ],
        disabledCatalogIds: ["posterium-jw-movies"],
      })

      const req = new NextRequest(`https://posterium.test/manifest.json?config=${token}`)
      const res = await buildManifestResponse(req, null, token)
      const data = await res.json()

      expect(data.catalogs).toBeDefined()
      // Should exclude disabled posterium-jw-movies
      expect(data.catalogs.some((c: { id: string }) => c.id === "posterium-jw-movies")).toBe(false)
      // Should include custom catalog
      const custom = data.catalogs.find((c: { id: string }) => c.id === "posterium-custom-sky-now-1")
      expect(custom).toBeDefined()
      expect(custom?.name).toBe("Sky & NOW — Top 10")
      expect(custom?.type).toBe("movie")
    })
  })
})

