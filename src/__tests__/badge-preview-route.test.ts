import sharp from "sharp"
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { GET } from "@/app/api/badge-preview/route"

function req(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/badge-preview?${query}`)
}

describe("GET /api/badge-preview", () => {
  it("renders the genre badge with the server PNG renderer", async () => {
    const res = await GET(req("kind=genre&pw=380&genre=Sci-Fi%20%26%20Fantasy&vote=8.0&year=2022&style=pill&tl=0"))

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/png")
    expect(Number(res.headers.get("X-Badge-W"))).toBeGreaterThan(0)
    expect(Number(res.headers.get("X-Badge-H"))).toBeGreaterThan(0)

    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata()
    expect(meta.format).toBe("png")
    expect(meta.width).toBeGreaterThan(0)
    expect(meta.height).toBeGreaterThan(0)
  })

  it("rejects malformed preview requests", async () => {
    const res = await GET(req("kind=genre&pw=380&vote=8.0"))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "Missing genre" })
  })
})
