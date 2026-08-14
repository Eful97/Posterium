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
  isValidProfileId: vi.fn((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)),
  verifyProfilePassword: vi.fn(async () => true),
  isKvStorageConfigured: vi.fn(() => true),
  type: {},
}))

import { getFullProfileData, verifyProfilePassword, createOrUpdateProfile } from "@/lib/profile-store"

const UUID = "11111111-1111-4111-8111-111111111111"

const VALID_CONFIG = {
  globalBadges: true,
  rankingBadges: false,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
  blurEnabled: true,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  gradientHeight: 30,
  networkLogo: true,
  autoRotateClean: false,
  logoFitEnabled: true,
}

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

describe("POST /api/profile — fix di sicurezza (findings 1, 2, 15)", () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.POSTERIUM_ADMIN_TOKEN
  })

  it("rifiuta l'aggiornamento di un profilo legacy senza password senza admin token (finding 1)", async () => {
    vi.mocked(getFullProfileData).mockResolvedValue({
      config: VALID_CONFIG as never,
      apiKeys: { tmdbKey: "secret-key" },
      // nessun passwordHash/salt → profilo legacy: l'UUID è pubblico nelle URL poster
    })

    const res = await POST(loadRequest({
      profileId: UUID,
      config: VALID_CONFIG,
      password: "attacker-password",
    }))
    expect(res.status).toBe(401)
    expect(createOrUpdateProfile).not.toHaveBeenCalled()
  })

  it("permette l'aggiornamento di un profilo legacy passwordless con admin token (finding 1)", async () => {
    process.env.POSTERIUM_ADMIN_TOKEN = "test-admin-token"
    vi.mocked(getFullProfileData).mockResolvedValue({
      config: VALID_CONFIG as never,
      apiKeys: { tmdbKey: "secret-key" },
    })

    const req = new NextRequest("http://localhost:3000/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": "test-admin-token" },
      body: JSON.stringify({ profileId: UUID, config: VALID_CONFIG, password: "new-password" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(createOrUpdateProfile).toHaveBeenCalledWith(VALID_CONFIG, UUID, "new-password", undefined, undefined)
  })

  it("rifiuta profileId non UUID (es. __proto__) con 400 (finding 2)", async () => {
    const res = await POST(loadRequest({
      profileId: "__proto__",
      config: VALID_CONFIG,
      password: "pw",
    }))
    expect(res.status).toBe(400)
    expect(createOrUpdateProfile).not.toHaveBeenCalled()
  })

  it("rifiuta config con enum badgeStyle non valido (finding 15)", async () => {
    const res = await POST(loadRequest({
      config: { ...VALID_CONFIG, badgeStyle: "potato" },
      password: "pw",
    }))
    expect(res.status).toBe(400)
    expect(createOrUpdateProfile).not.toHaveBeenCalled()
  })

  it("rifiuta customBadge oltre 40 caratteri (finding 8)", async () => {
    const res = await POST(loadRequest({
      config: { ...VALID_CONFIG, customBadge: "x".repeat(41) },
      password: "pw",
    }))
    expect(res.status).toBe(400)
    expect(createOrUpdateProfile).not.toHaveBeenCalled()
  })
})
