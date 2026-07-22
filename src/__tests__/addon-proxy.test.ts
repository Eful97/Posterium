import { describe, expect, it } from "vitest"
import { rewriteMetasPosters, rewriteSingleMetaPoster, type StremioItemMeta } from "@/lib/addon-proxy"
import { resolveImdbToTmdb } from "@/lib/imdb-resolver"

describe("Addon Proxy Helpers", () => {
  it("rewrites metas poster URLs correctly for movies and series", () => {
    const metas: StremioItemMeta[] = [
      { id: "tt0111161", type: "movie", name: "The Shawshank Redemption", poster: "https://original.poster/1.jpg" },
      { id: "tt0944947", type: "series", name: "Game of Thrones", poster: "https://original.poster/2.jpg" },
      { id: "278", type: "movie", name: "Numeric Movie", poster: null },
    ]

    const rewritten = rewriteMetasPosters(metas, "https://posterium.app")

    expect(rewritten[0].poster).toContain("https://posterium.app/api/poster/movie/tt0111161")
    expect(rewritten[1].poster).toContain("https://posterium.app/api/poster/series/tt0944947")
    expect(rewritten[2].poster).toContain("https://posterium.app/api/poster/movie/278")
  })

  it("rewrites single meta poster URL correctly", () => {
    const meta: StremioItemMeta = { id: "tt1375666", type: "movie", name: "Inception", poster: "https://old.jpg" }
    const rewritten = rewriteSingleMetaPoster(meta, "https://my-posterium.koyeb.app")
    expect(rewritten.poster).toContain("https://my-posterium.koyeb.app/api/poster/movie/tt1375666")
  })

  it("resolveImdbToTmdb returns null for non-imdb IDs", async () => {
    const res = await resolveImdbToTmdb("12345", "movie")
    expect(res).toBeNull()
  })
})
