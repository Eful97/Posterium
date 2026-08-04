import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { handleOAuthDisconnect } from "@/lib/oauth-flow"
import { setProfileTokens } from "@/lib/profile-store"
import { traktOAuthConfig } from "@/lib/oauth-platforms"

// setProfileTokens va su disco/KV: mockato per isolare il test del flusso.
vi.mock("@/lib/profile-store", () => ({
  setProfileTokens: vi.fn(),
}))

const UUID = "11111111-1111-4111-8111-111111111111"

describe("OAuth disconnect (CSRF)", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("rejects POST from a different origin (CSRF)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/trakt/disconnect?profile=${UUID}`, {
      method: "POST",
      headers: { origin: "https://evil.example" },
    })
    const res = await handleOAuthDisconnect(req, traktOAuthConfig)
    expect(res.status).toBe(403)
    expect(setProfileTokens).not.toHaveBeenCalled()
  })

  it("accepts POST from the same origin", async () => {
    vi.mocked(setProfileTokens).mockResolvedValue(undefined)
    const req = new NextRequest(`http://localhost:3000/api/trakt/disconnect?profile=${UUID}`, {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    })
    const res = await handleOAuthDisconnect(req, traktOAuthConfig)
    expect(res.status).toBe(200)
    expect(setProfileTokens).toHaveBeenCalledWith(UUID, "trakt", null)
  })

  it("accepts POST without Origin (curl, tooling, Stremio)", async () => {
    vi.mocked(setProfileTokens).mockResolvedValue(undefined)
    const req = new NextRequest(`http://localhost:3000/api/trakt/disconnect?profile=${UUID}`, { method: "POST" })
    const res = await handleOAuthDisconnect(req, traktOAuthConfig)
    expect(res.status).toBe(200)
    expect(setProfileTokens).toHaveBeenCalledWith(UUID, "trakt", null)
  })

  it("rejects non-POST methods", async () => {
    const req = new NextRequest(`http://localhost:3000/api/trakt/disconnect?profile=${UUID}`, { method: "GET" })
    const res = await handleOAuthDisconnect(req, traktOAuthConfig)
    expect(res.status).toBe(405)
    expect(setProfileTokens).not.toHaveBeenCalled()
  })

  it("rejects invalid profile id", async () => {
    const req = new NextRequest("http://localhost:3000/api/trakt/disconnect?profile=not-a-uuid", { method: "POST" })
    const res = await handleOAuthDisconnect(req, traktOAuthConfig)
    expect(res.status).toBe(400)
    expect(setProfileTokens).not.toHaveBeenCalled()
  })
})
