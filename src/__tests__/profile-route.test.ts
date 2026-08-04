import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/profile/route"

// La route legge/scrive profili su disco/KV: mockato per isolare il test.
vi.mock("@/lib/profile-store", () => ({
  createOrUpdateProfile: vi.fn(async () => "mock-uuid"),
  getProfile: vi.fn(),
  getFullProfileData: vi.fn(),
  deleteProfile: vi.fn(),
  generateProfileId: vi.fn(() => "mock-uuid"),
  verifyProfilePassword: vi.fn(async () => true),
  type: {},
}))

import { getFullProfileData, verifyProfilePassword } from "@/lib/profile-store"

const UUID = "11111111-1111-4111-8111-111111111111"

function loadRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/profile — accesso ai profili", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("restituisce apiKeys solo dopo la verifica della password", async () => {
    vi.mocked(getFullProfileData).mockResolvedValue({
      config: { globalBadges: true } as never,
      apiKeys: { tmdbKey: "secret-key" },
      mappings: {},
      passwordHash: "hash",
      salt: "salt",
    })
    vi.mocked(verifyProfilePassword).mockResolvedValue(true)

    const res = await POST(loadRequest({ action: "load", profileId: UUID, password: "ok" }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.apiKeys).toEqual({ tmdbKey: "secret-key" })
    expect(verifyProfilePassword).toHaveBeenCalledWith(UUID, "ok")
  })

  it("rifiuta la password errata per un profilo protetto", async () => {
    vi.mocked(getFullProfileData).mockResolvedValue({
      config: { globalBadges: true } as never,
      apiKeys: { tmdbKey: "secret-key" },
      passwordHash: "hash",
      salt: "salt",
    })
    vi.mocked(verifyProfilePassword).mockResolvedValue(false)

    const res = await POST(loadRequest({ action: "load", profileId: UUID, password: "wrong" }))
    expect(res.status).toBe(401)
  })

  it("NON restituisce apiKeys ai profili legacy senza password (UUID esposto nelle URL poster)", async () => {
    vi.mocked(getFullProfileData).mockResolvedValue({
      config: { globalBadges: true } as never,
      apiKeys: { tmdbKey: "secret-key" },
      mappings: { "movie:42": { tmdbId: 42 } as never },
      // nessun passwordHash/salt: profilo creato prima della funzionalità password
    })

    const res = await POST(loadRequest({ action: "load", profileId: UUID, password: "whatever" }))
    const body = await res.json()
    expect(res.status).toBe(200)
    // config e mappings restano pubblici (come GET /api/profile), le chiavi no
    expect(body.apiKeys).toEqual({})
    expect(body.config).toBeTruthy()
    expect(body.mappings).toBeTruthy()
    expect(verifyProfilePassword).not.toHaveBeenCalled()
  })
})
