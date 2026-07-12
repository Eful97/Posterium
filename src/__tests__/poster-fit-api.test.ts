import { afterEach, describe, expect, it, vi } from "vitest"
import sharp from "sharp"
import { POST } from "@/app/api/poster-fit/route"

function makeJpeg(r: number, g: number, b: number): Promise<Buffer> {
  const data = Buffer.alloc(100 * 150 * 3)
  for (let i = 0; i < 100 * 150; i++) {
    const off = i * 3
    data[off] = r; data[off + 1] = g; data[off + 2] = b
  }
  return sharp(data, { raw: { width: 100, height: 150, channels: 3 } }).jpeg().toBuffer()
}

async function makePosterBuffer(r: number, g: number, b: number): Promise<Buffer> {
  const data = Buffer.alloc(500 * 750 * 3)
  for (let i = 0; i < 500 * 750; i++) {
    const off = i * 3
    data[off] = r; data[off + 1] = g; data[off + 2] = b
  }
  return sharp(data, { raw: { width: 500, height: 750, channels: 3 } }).jpeg().toBuffer()
}

async function makeLogoBuffer(r: number, g: number, b: number): Promise<Buffer> {
  const data = Buffer.alloc(200 * 80 * 4)
  for (let i = 0; i < 200 * 80; i++) {
    const off = i * 4
    data[off] = r; data[off + 1] = g; data[off + 2] = b; data[off + 3] = 255
  }
  return sharp(data, { raw: { width: 200, height: 80, channels: 4 } }).png().toBuffer()
}

function mockNextRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/poster-fit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/poster-fit", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns ranked results for valid input", async () => {
    const posterBuf = await makePosterBuffer(20, 20, 30)
    const logoBuf = await makeLogoBuffer(255, 255, 255)
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/logo")) return new Response(logoBuf)
      return new Response(posterBuf)
    }))

    const req = mockNextRequest({ posterPaths: ["/test.jpg"], logoPath: "/logo.png" })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ranked).toHaveLength(1)
    expect(json.ranked[0].posterPath).toBe("/test.jpg")
    expect(json.ranked[0].score).toBeGreaterThan(0)
    expect(json.ranked[0].adjustedScore).toBeGreaterThan(0)
    expect(json.ranked[0].textPenalty).toBeTypeOf("number")
    expect(json.ranked[0].metrics).toHaveProperty("cleanliness")
    expect(json.ranked[0].metrics).toHaveProperty("contrast")
    expect(json.ranked[0].metrics).toHaveProperty("lowDetailScore")
    expect(json.ranked[0].metrics).toHaveProperty("badgeReadability")
    expect(json.ranked[0].reasons).toBeInstanceOf(Array)
    expect(json.total).toBe(1)
    expect(json.failed).toBe(0)
  })

  it("returns 400 when posterPaths is missing", async () => {
    const req = mockNextRequest({ logoPath: "/logo.png" })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it("returns 400 when logoPath is missing", async () => {
    const req = mockNextRequest({ posterPaths: ["/test.jpg"] })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it("returns 400 for empty posterPaths", async () => {
    const req = mockNextRequest({ posterPaths: [], logoPath: "/logo.png" })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost:3000/api/poster-fit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it("returns 502 when logo fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })))
    const req = mockNextRequest({ posterPaths: ["/test.jpg"], logoPath: "/missing.png" })
    const res = await POST(req as any)
    expect(res.status).toBe(502)
  })

  it("skips posters that fail to fetch", async () => {
    const posterBuf = await makePosterBuffer(20, 20, 30)
    const logoBuf = await makeLogoBuffer(255, 255, 255)
    let callCount = 0
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/logo")) return new Response(logoBuf)
      callCount++
      if (callCount === 1) return new Response(null, { status: 404 })
      return new Response(posterBuf)
    }))

    const req = mockNextRequest({ posterPaths: ["/fail.jpg", "/ok.jpg"], logoPath: "/logo.png" })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ranked).toHaveLength(1)
    expect(json.failed).toBe(1)
  })

  it("only analyzes up to MAX_POSTERS (20)", async () => {
    const posterBuf = await makePosterBuffer(20, 20, 30)
    const logoBuf = await makeLogoBuffer(255, 255, 255)
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("/logo")) return new Response(logoBuf)
      return new Response(posterBuf)
    })
    vi.stubGlobal("fetch", fetchFn)

    const paths = Array.from({ length: 25 }, (_, i) => `/poster${i}.jpg`)
    const req = mockNextRequest({ posterPaths: paths, logoPath: "/logo.png" })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.total).toBe(20)
    expect(json.ranked).toHaveLength(20)
  })

  it("sorts ranked by adjustedScore descending", async () => {
    const logoBuf = await makeLogoBuffer(255, 255, 255)
    const darkBuf = await makePosterBuffer(20, 20, 30)
    const lightBuf = await makePosterBuffer(230, 230, 240)
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/logo")) return new Response(logoBuf)
      if (url.includes("/dark")) return new Response(darkBuf)
      return new Response(lightBuf)
    }))

    const req = mockNextRequest({
      posterPaths: ["/light.jpg", "/dark.jpg"],
      logoPath: "/logo.png",
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ranked).toHaveLength(2)
    expect(json.ranked[0].adjustedScore).toBeGreaterThanOrEqual(json.ranked[1].adjustedScore)
    expect(json.ranked[0].posterPath).toBe("/dark.jpg")
  })
})
