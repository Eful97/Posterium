import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey } from "@/lib/rate-limit"

describe("rateLimitKey con POSTERIUM_TRUST_PROXY=1 (deploy dietro proxy fidato)", () => {
  beforeEach(() => { process.env.POSTERIUM_TRUST_PROXY = "1" })
  afterEach(() => { delete process.env.POSTERIUM_TRUST_PROXY })

  it("prefers x-real-ip over cf-connecting-ip (fix L27: anti-spoofing)", () => {
    // Su deploy non-Cloudflare che impostano solo x-real-ip, cf-connecting-ip
    // è un header client spoofabile: prima aveva la precedenza e il rate
    // limit era bypassabile ruotandolo. Ora vince x-real-ip (scritto
    // dall'edge); Cloudflare non imposta x-real-ip, quindi i suoi client
    // cadono su cf-connecting-ip.
    const req = new NextRequest("http://localhost:3000/", {
      headers: {
        "cf-connecting-ip": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
        "x-forwarded-for": "9.9.9.9, 10.10.10.10",
      },
    })
    expect(rateLimitKey(req)).toBe("5.6.7.8")
  })

  it("falls back to cf-connecting-ip when x-real-ip is absent (Cloudflare)", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: { "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 10.10.10.10" },
    })
    expect(rateLimitKey(req)).toBe("1.2.3.4")
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

describe("rateLimitKey senza flag (default fail-safe — S3)", () => {
  afterEach(() => { delete process.env.POSTERIUM_TRUST_PROXY })

  it("ignora gli header IP spoofati dal client → bucket condiviso 'shared'", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: {
        "cf-connecting-ip": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
        "x-forwarded-for": "9.9.9.9, 10.10.10.10",
      },
    })
    expect(rateLimitKey(req)).toBe("shared")
    expect(rateLimitKey(new NextRequest("http://localhost:3000/"))).toBe("shared")
  })

  it("il flag con valore non '1' non abilita la fiducia negli header", () => {
    process.env.POSTERIUM_TRUST_PROXY = "true"
    const req = new NextRequest("http://localhost:3000/", {
      headers: { "x-real-ip": "5.6.7.8" },
    })
    expect(rateLimitKey(req)).toBe("shared")
  })
})

// NOTA: il bucket map è module-level e condiviso tra i test del file: ogni
// test usa una chiave client univoca per non interferire con gli altri.
describe("rateLimit (token bucket per (bucket, key))", () => {
  afterEach(() => {
    vi.useRealTimers()
    delete process.env.POSTERIUM_TRUST_PROXY
  })

  it("scarica un bucket e risponde 429 con Retry-After quando è esaurito", () => {
    const key = "h2-exhaust-1"
    // warmup ha maxTokens=5, refill 1/s → 6 richieste: le prime 5 ok, la 6a no
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, "warmup")).toEqual({ ok: true, retAfter: 0 })
    }
    const denied = rateLimit(key, "warmup")
    expect(denied.ok).toBe(false)
    expect(denied.retAfter).toBeGreaterThan(0)
  })

  it("route diverse con la stessa chiave client NON condividono il bucket (chiave composta)", () => {
    // Senza trust proxy la chiave client è sempre "shared": prima del fix il
    // bucket era unico e il cfg dell'ultima route chiamata vinceva.
    vi.useFakeTimers()
    try {
      for (let i = 0; i < 5; i++) expect(rateLimit("shared", "warmup").ok).toBe(true)
      expect(rateLimit("shared", "warmup").ok).toBe(false) // warmup esaurito

      // Il bucket poster (max 200) è intatto: non deve risentire del cap warmup.
      expect(rateLimit("shared", "poster").ok).toBe(true)
      for (let i = 0; i < 4; i++) expect(rateLimit("shared", "poster").ok).toBe(true)
      // E nemmeno il bucket default (max 120): riparte pieno.
      expect(rateLimit("shared", "default").ok).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it("ricarica i token dopo la finestra di refill (con clock finto)", () => {
    vi.useFakeTimers()
    try {
      const key = "h2-refill-1"
      for (let i = 0; i < 5; i++) expect(rateLimit(key, "warmup").ok).toBe(true)
      expect(rateLimit(key, "warmup").ok).toBe(false)

      // Dopo 2 finestre da 1 s: 2 token aggiuntivi (capped al max di 5) → 2 richieste ok
      vi.setSystemTime(Date.now() + 2_000)
      expect(rateLimit(key, "warmup").ok).toBe(true)
      expect(rateLimit(key, "warmup").ok).toBe(true)
      expect(rateLimit(key, "warmup").ok).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("bucket sconosciuti cadono sul default (120 burst)", () => {
    const key = "h2-fallback-1"
    for (let i = 0; i < 120; i++) expect(rateLimit(key, "non-esistente").ok).toBe(true)
    expect(rateLimit(key, "non-esistente").ok).toBe(false)
  })
})
