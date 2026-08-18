import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { cacheClear, cacheGet } from "@/lib/cache"

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ ok: true, retAfter: 0 })),
  rateLimitKey: vi.fn(() => "test"),
  rateLimitResponse: vi.fn(() => new Response("rate limited", { status: 429 })),
}))

vi.mock("@/lib/tmdb", () => ({
  getImages: vi.fn(),
}))

const { GET } = await import("@/app/api/tmdb/[id]/images/route")
const { getImages } = await import("@/lib/tmdb")
const mockedGetImages = vi.mocked(getImages)

function req(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/tmdb/${id}/images?type=movie&languages=en,null`)
}

const VALID_DATA = {
  id: 42,
  backdrops: [{ file_path: "/b1.jpg", aspect_ratio: 1.78, height: 720, iso_639_1: null, vote_average: 5, vote_count: 1, width: 1280 }],
  posters: [{ file_path: "/p1.jpg", aspect_ratio: 0.667, height: 1080, iso_639_1: null, vote_average: 6, vote_count: 2, width: 720 }],
  logos: [],
}

describe("GET /api/tmdb/[id]/images (H4: niente cache poisoning su errore upstream)", () => {
  beforeEach(() => {
    cacheClear()
    mockedGetImages.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cacheClear()
  })

  it("risponde 502 e NON mette in cache quando il fetch TMDB fallisce", async () => {
    mockedGetImages.mockRejectedValue(new Error("TMDB down"))
    const res = await GET(req("42"), { params: Promise.resolve({ id: "42" }) })

    expect(res.status).toBe(502)
    // Nessun record in cache per la chiave della richiesta (prima il catch
    // cacettava la lista vuota per 30 minuti, avvelenando l'editor).
    expect(cacheGet(`images:movie:42:en,null`)).toBeNull()
  })

  it("risponde 200 e mette in cache quando il fetch TMDB riesce (anche con liste vuote valide)", async () => {
    mockedGetImages.mockResolvedValue(VALID_DATA as never)
    const res = await GET(req("42"), { params: Promise.resolve({ id: "42" }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.posters).toHaveLength(1)

    // Il dato valido è in cache: la seconda richiesta non tocca più TMDB.
    const res2 = await GET(req("42"), { params: Promise.resolve({ id: "42" }) })
    expect(res2.status).toBe(200)
    expect(mockedGetImages).toHaveBeenCalledTimes(1)
  })

  it("un errore dopo un successo NON sovrascrive la cache valida", async () => {
    mockedGetImages.mockResolvedValueOnce(VALID_DATA as never).mockRejectedValueOnce(new Error("boom"))
    await GET(req("42"), { params: Promise.resolve({ id: "42" }) })

    const res = await GET(req("43"), { params: Promise.resolve({ id: "43" }) })
    expect(res.status).toBe(502)
    expect(cacheGet(`images:movie:43:en,null`)).toBeNull()
    // La cache chiave 42 resta valida.
    expect(cacheGet(`images:movie:42:en,null`)).toEqual(VALID_DATA)
  })
})