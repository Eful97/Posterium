import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PosteriumUserConfig } from "@/lib/config-token"

// profile-store è mockato: la watchlist orchestrator dipende solo da
// getFullProfileData (token) e setProfileTokens (refresh).
vi.mock("@/lib/profile-store", () => ({
  getFullProfileData: vi.fn(),
  setProfileTokens: vi.fn(),
}))

import { getFullProfileData, setProfileTokens } from "@/lib/profile-store"

const UUID = "11111111-1111-4111-8111-111111111111"

const MINIMAL_CONFIG: PosteriumUserConfig = {
  globalBadges: true,
  rankingBadges: false,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
  blurEnabled: false,
  blurIntensity: 10,
  blurFade: 0,
  blurDarkness: 0,
  gradientHeight: 25,
  networkLogo: false,
  autoRotateClean: false,
  logoFitEnabled: false,
}

function loadEnv() {
  process.env.TRAKT_CLIENT_ID = "trakt-cid"
  process.env.TRAKT_CLIENT_SECRET = "trakt-csec"
  process.env.TRAKT_API_URL = "https://mock-trakt/api"
  process.env.TRAKT_AUTH_URL = "https://mock-trakt"
  process.env.SIMKL_CLIENT_ID = "simkl-cid"
  process.env.SIMKL_CLIENT_SECRET = "simkl-csec"
  process.env.SIMKL_API_URL = "https://mock-simkl/api"
  process.env.SIMKL_AUTH_URL = "https://mock-simkl"
}

const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const u = String(url)
  if (u.includes("/oauth/token")) {
    const body = JSON.parse(String(init?.body) || "{}")
    const refresh = body.grant_type === "refresh_token"
    return new Response(JSON.stringify({
      access_token: refresh ? "fresh-access" : "mock-access",
      refresh_token: refresh ? "fresh-refresh" : "mock-refresh",
      expires_in: 7776000,
    }), { status: 200 })
  }
  if (u.includes("/sync/watchlist/movies")) return new Response(JSON.stringify([{ ids: { tmdb: 19995 } }]), { status: 200 })
  if (u.includes("/sync/watchlist/shows")) return new Response(JSON.stringify([]), { status: 200 })
  return new Response("{}", { status: 200 })
})

describe("integrazioni Trakt/Simkl", () => {
  beforeEach(async () => {
    loadEnv()
    vi.stubGlobal("fetch", mockFetch)
    vi.mocked(getFullProfileData).mockReset()
    vi.mocked(setProfileTokens).mockReset()
    const { __resetWatchlistCache } = await import("@/lib/watchlist")
    __resetWatchlistCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.TRAKT_CLIENT_ID
    delete process.env.TRAKT_CLIENT_SECRET
    delete process.env.TRAKT_API_URL
    delete process.env.SIMKL_CLIENT_ID
    delete process.env.SIMKL_CLIENT_SECRET
    delete process.env.SIMKL_API_URL
  })

  it("builds the Trakt authorize URL with client_id, redirect_uri and state", async () => {
    const traktModule = await import("@/lib/trakt")
    const url = traktModule.buildTraktAuthorizeUrl(UUID, "https://app.example/api/trakt/auth/callback")
    expect(url).toContain("https://mock-trakt/oauth/authorize") // TRAKT_AUTH override
    expect(url).toContain(`client_id=trakt-cid`)
    expect(url).toContain(`state=${UUID}`)
    expect(url).toContain("response_type=code")
    expect(url).toContain(encodeURIComponent("https://app.example/api/trakt/auth/callback"))
  })

  it("builds the Simkl authorize URL", async () => {
    const simklModule = await import("@/lib/simkl")
    const url = simklModule.buildSimklAuthorizeUrl(UUID, "https://app.example/api/simkl/auth/callback")
    expect(url).toContain(`client_id=simkl-cid`)
    expect(url).toContain(`state=${UUID}`)
  })

  it("reports platforms as unconfigured when credentials are missing", async () => {
    delete process.env.TRAKT_CLIENT_ID
    delete process.env.SIMKL_CLIENT_ID
    const traktModule = await import("@/lib/trakt")
    const simklModule = await import("@/lib/simkl")
    expect(traktModule.traktConfigured()).toBe(false)
    expect(simklModule.simklConfigured()).toBe(false)
  })

  it("collects watchlist keys + version from Trakt and Simkl", async () => {
    const watchlistModule = await import("@/lib/watchlist")
    vi.mocked(getFullProfileData).mockResolvedValue({
      config: MINIMAL_CONFIG,
      traktTokens: { access_token: "a", refresh_token: "r", expires_at: Date.now() + 1e9 },
      simklTokens: { access_token: "b", refresh_token: "s", expires_at: Date.now() + 1e9 },
    })
    const snap = await watchlistModule.getProfileWatchlist(UUID)
    expect(snap.keys.has("movie:19995")).toBe(true)
    expect(snap.keys.size).toBe(1)
    expect(snap.version).toMatch(/^[0-9a-f]{8}$/)
  })

  it("returns an empty snapshot when the profile has no tokens", async () => {
    const watchlistModule = await import("@/lib/watchlist")
    vi.mocked(getFullProfileData).mockResolvedValue({ config: MINIMAL_CONFIG })
    const snap = await watchlistModule.getProfileWatchlist(UUID)
    expect(snap.keys.size).toBe(0)
    expect(snap.version).toBe("")
  })

  it("refreshes an expired token and persists the new one", async () => {
    const watchlistModule = await import("@/lib/watchlist")
    vi.mocked(getFullProfileData).mockResolvedValue({
      config: MINIMAL_CONFIG,
      traktTokens: { access_token: "expired", refresh_token: "old-refresh", expires_at: Date.now() - 1000 },
    })
    const snap = await watchlistModule.getProfileWatchlist(UUID)
    expect(snap.keys.has("movie:19995")).toBe(true)
    const refreshCalls = mockFetch.mock.calls.filter((c) => String(c[0]).includes("/oauth/token"))
    expect(refreshCalls.length).toBeGreaterThan(0)
    expect(vi.mocked(setProfileTokens)).toHaveBeenCalledWith(
      UUID,
      "trakt",
      expect.objectContaining({ access_token: "fresh-access", refresh_token: "fresh-refresh" }),
    )
  })
})
