import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/profile/route"

// Storage non disponibile (es. Vercel senza KV): isKvStorageConfigured=false e
// la scrittura fallisce con errore di filesystem read-only → fallback stateless.
vi.mock("@/lib/profile-store", () => ({
  createOrUpdateProfile: vi.fn(async () => {
    throw Object.assign(new Error("EROFS: read-only file system"), { code: "EROFS" })
  }),
  getProfile: vi.fn(),
  getFullProfileData: vi.fn(async () => null),
  deleteProfile: vi.fn(),
  generateProfileId: vi.fn(() => "mock-stateless-uuid"),
  isValidProfileId: vi.fn((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)),
  verifyProfilePassword: vi.fn(async () => true),
  isKvStorageConfigured: vi.fn(() => false),
  type: {},
}))

import { createOrUpdateProfile, isKvStorageConfigured } from "@/lib/profile-store"

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

describe("POST /api/profile — fallback stateless senza storage", () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.CONFIG_HMAC_SECRET
    delete process.env.ENCRYPTION_KEY_SECRET
  })

  it("restituisce un profilo stateless (?config=) quando lo storage fallisce", async () => {
    vi.mocked(isKvStorageConfigured).mockReturnValue(false)

    const res = await POST(loadRequest({ config: VALID_CONFIG, password: "pw" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.stateless).toBe(true)
    expect(body.profileId).toBe("mock-stateless-uuid")
    expect(typeof body.configToken).toBe("string")
    expect(body.configToken.length).toBeGreaterThan(0)
    expect(body.url).toContain("?config=")
    expect(body.url).not.toContain("?u=")
  })

  it("non tocca lo storage (la scrittura non è nemmeno tentata come successo)", async () => {
    vi.mocked(isKvStorageConfigured).mockReturnValue(false)

    await POST(loadRequest({ config: VALID_CONFIG, password: "pw" }))
    // createOrUpdateProfile è stato chiamato ed è fallito con EROFS: il
    // fallback è scattato SENZA propagare l'errore.
    expect(createOrUpdateProfile).toHaveBeenCalledTimes(1)
  })
})
