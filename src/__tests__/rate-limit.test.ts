import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { rateLimitKey } from "@/lib/rate-limit"

describe("rateLimitKey (M1 — preferenza header IP trusted)", () => {
  it("prefers cf-connecting-ip over x-real-ip and x-forwarded-for", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: {
        "cf-connecting-ip": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
        "x-forwarded-for": "9.9.9.9, 10.10.10.10",
      },
    })
    expect(rateLimitKey(req)).toBe("1.2.3.4")
  })

  it("falls back to x-real-ip when cf-connecting-ip is absent", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: { "x-real-ip": "5.6.7.8", "x-forwarded-for": "9.9.9.9, 10.10.10.10" },
    })
    expect(rateLimitKey(req)).toBe("5.6.7.8")
  })

  it("uses the LAST hop of x-forwarded-for when the trusted headers are absent", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: { "x-forwarded-for": "9.9.9.9, 10.10.10.10" },
    })
    expect(rateLimitKey(req)).toBe("10.10.10.10")
  })

  it("trims values and defaults to 'local' with no IP headers", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: { "x-forwarded-for": "9.9.9.9,   10.10.10.10 " },
    })
    expect(rateLimitKey(req)).toBe("10.10.10.10")
    expect(rateLimitKey(new NextRequest("http://localhost:3000/"))).toBe("local")
  })
})
