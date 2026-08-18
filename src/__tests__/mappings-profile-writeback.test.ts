import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// Fix H7: il write-back dei mapping nel profilo (POST /api/mappings con
// profileId) deve richiedere la password del profilo (o un admin token).
// Prima chiunque conoscesse l'UUID — esposto nelle URL poster pubbliche —
// poteva sovrascrivere i mapping salvati della vittima su istanze pubbliche.

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ ok: true, retAfter: 0 })),
  rateLimitKey: vi.fn(() => "test"),
  rateLimitResponse: vi.fn(() => new Response("rate limited", { status: 429 })),
}))

vi.mock("@/lib/store", () => ({
  getAll: vi.fn(async () => new Map()),
  getById: vi.fn(async () => null),
  upsert: vi.fn(async () => undefined),
  removeAll: vi.fn(async () => undefined),
}))

vi.mock("@/lib/profile-store", () => ({
  getFullProfileData: vi.fn(),
  createOrUpdateProfile: vi.fn(async () => "mock-uuid"),
  verifyProfilePassword: vi.fn(async (_id: string, password: string) => password === "correct-horse"),
}))

const { POST } = await import("@/app/api/mappings/route")
const { getFullProfileData, createOrUpdateProfile, verifyProfilePassword } = await import("@/lib/profile-store")

const mockedGetFullProfileData = vi.mocked(getFullProfileData)
const mockedCreateOrUpdateProfile = vi.mocked(createOrUpdateProfile)
const mockedVerifyProfilePassword = vi.mocked(verifyProfilePassword)

const PROFILE_ID = "11111111-2222-3333-4444-555555555555"

function req(body: Record<string, unknown>, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

const BASE_MAPPING = {
  tmdbId: 42,
  mediaType: "movie",
  title: "Test Film",
  posterPath: "/poster.jpg",
}

describe("POST /api/mappings — write-back profilo protetto da password (H7)", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }))

  beforeEach(() => {
    fetchSpy.mockClear()
    mockedCreateOrUpdateProfile.mockClear()
    mockedVerifyProfilePassword.mockClear()
    // Istanza pubblica (scenario dell'attacco): route admin aperte, la guardia
    // sul write-back del profilo è l'unica difesa.
    process.env.POSTERIUM_PUBLIC_INSTANCE = "1"
    delete process.env.POSTERIUM_ADMIN_TOKEN
    delete process.env.ADMIN_TOKEN
  })

  afterEach(() => {
    delete process.env.POSTERIUM_PUBLIC_INSTANCE
    // Il warmup della route è fire-and-forget: lascia assestare i fetch
    // mentre il mock è ancora attivo (vedi warmup-catalog.test.ts).
  })

  it("rifiuta con 401 il write-back su profilo protetto senza password", async () => {
    mockedGetFullProfileData.mockResolvedValue({
      config: {}, passwordHash: "hash", salt: "salt", mappings: {},
    } as never)

    const res = await POST(req({ ...BASE_MAPPING, profileId: PROFILE_ID }))
    expect(res.status).toBe(401)
    expect(mockedCreateOrUpdateProfile).not.toHaveBeenCalled()
  })

  it("rifiuta con 401 il write-back con password errata", async () => {
    mockedGetFullProfileData.mockResolvedValue({
      config: {}, passwordHash: "hash", salt: "salt", mappings: {},
    } as never)

    const res = await POST(req({ ...BASE_MAPPING, profileId: PROFILE_ID, password: "wrong" }))
    expect(res.status).toBe(401)
    expect(mockedCreateOrUpdateProfile).not.toHaveBeenCalled()
  })

  it("accetta il write-back con la password corretta del profilo", async () => {
    mockedGetFullProfileData.mockResolvedValue({
      config: {}, passwordHash: "hash", salt: "salt", mappings: {},
    } as never)

    const res = await POST(req({ ...BASE_MAPPING, profileId: PROFILE_ID, password: "correct-horse" }))
    expect(res.status).toBe(200)
    expect(mockedCreateOrUpdateProfile).toHaveBeenCalledTimes(1)
    const [, idArg, , , mappingsArg] = mockedCreateOrUpdateProfile.mock.calls[0]
    expect(idArg).toBe(PROFILE_ID)
    expect(mappingsArg).toHaveProperty("movie:42")
  })

  it("rifiuta il write-back su profilo legacy senza password (UUID pubblico non basta)", async () => {
    mockedGetFullProfileData.mockResolvedValue({
      config: {}, mappings: {},
    } as never)

    const res = await POST(req({ ...BASE_MAPPING, profileId: PROFILE_ID }))
    expect(res.status).toBe(401)
    expect(mockedCreateOrUpdateProfile).not.toHaveBeenCalled()
  })

  it("consente il write-back su profilo legacy con un admin token valido", async () => {
    process.env.POSTERIUM_ADMIN_TOKEN = "admin-secret"
    mockedGetFullProfileData.mockResolvedValue({
      config: {}, mappings: {},
    } as never)

    const res = await POST(req({ ...BASE_MAPPING, profileId: PROFILE_ID }, { "x-admin-token": "admin-secret" }))
    expect(res.status).toBe(200)
    expect(mockedCreateOrUpdateProfile).toHaveBeenCalledTimes(1)
  })

  it("salva il mapping globale senza toccare il profilo quando profileId è assente", async () => {
    const res = await POST(req(BASE_MAPPING))
    expect(res.status).toBe(200)
    expect(mockedCreateOrUpdateProfile).not.toHaveBeenCalled()
  })
})
