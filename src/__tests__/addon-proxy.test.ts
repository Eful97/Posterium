import { afterEach, describe, expect, it } from "vitest"
import { rewriteMetasPosters, rewriteSingleMetaPoster, type StremioItemMeta } from "@/lib/addon-proxy"
import { resolveImdbToTmdb } from "@/lib/imdb-resolver"
import { isAllowedByAllowlist } from "@/app/api/proxy/[...path]/route"

describe("Addon Proxy Helpers", () => {
  afterEach(() => {
    delete process.env.POSTERIUM_PROXY_ALLOW_DOMAINS
  })

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

describe("isAllowedByAllowlist (C3/A1 — POSTERIUM_PROXY_ALLOW_DOMAINS)", () => {
  afterEach(() => {
    delete process.env.POSTERIUM_PROXY_ALLOW_DOMAINS
  })

  it("allows everything when the env is unset or empty (default open)", () => {
    expect(isAllowedByAllowlist(new URL("https://anything.example/x"))).toBe(true)
    process.env.POSTERIUM_PROXY_ALLOW_DOMAINS = "  "
    expect(isAllowedByAllowlist(new URL("https://anything.example/x"))).toBe(true)
  })

  it("allows an exact domain match and its subdomains", () => {
    process.env.POSTERIUM_PROXY_ALLOW_DOMAINS = "example.com"
    expect(isAllowedByAllowlist(new URL("https://example.com/addon"))).toBe(true)
    expect(isAllowedByAllowlist(new URL("https://sub.example.com/addon"))).toBe(true)
  })

  it("blocks domains outside the allowlist", () => {
    process.env.POSTERIUM_PROXY_ALLOW_DOMAINS = "example.com"
    expect(isAllowedByAllowlist(new URL("https://evil.example.net/x"))).toBe(false)
    expect(isAllowedByAllowlist(new URL("https://notexample.com/x"))).toBe(false)
  })

  it("is case-insensitive and supports multiple comma-separated domains", () => {
    process.env.POSTERIUM_PROXY_ALLOW_DOMAINS = "Example.COM, api.other.net"
    expect(isAllowedByAllowlist(new URL("https://EXAMPLE.com/x"))).toBe(true)
    expect(isAllowedByAllowlist(new URL("https://sub.api.other.net/x"))).toBe(true)
    expect(isAllowedByAllowlist(new URL("https://other.net/x"))).toBe(false)
  })
})
