import { describe, expect, it } from "vitest"
import { cacheClear } from "@/lib/cache"
import { isImmutablePosterRequest, posterHeaders, posterNotModifiedHeaders, readPosterError, writePosterError } from "@/lib/poster-runtime-cache"

describe("poster CDN headers", () => {
  it("adds long-lived CDN headers for versioned poster URLs", () => {
    const headers = posterHeaders("\"etag\"", true)

    expect(headers["Cache-Control"]).toContain("immutable")
    expect(headers["CDN-Cache-Control"]).toContain("immutable")
    expect(headers["Surrogate-Control"]).toBe("max-age=31536000")
  })

  it("keeps stale edge revalidation headers for non-versioned poster URLs", () => {
    const headers = posterNotModifiedHeaders("\"etag\"", false)

    expect(headers["Cache-Control"]).toContain("stale-while-revalidate")
    expect(headers["CDN-Cache-Control"]).toContain("stale-while-revalidate")
    expect(headers["CDN-Cache-Control"]).toContain("max-age=86400")
    expect(headers["Surrogate-Control"]).toContain("stale-while-revalidate")
  })

  it("uses a 6h TTL for dynamic (unmapped) posters instead of 24h", () => {
    const headers = posterHeaders("\"etag\"", false, false, true)

    expect(headers["Cache-Control"]).toContain("max-age=21600")
    expect(headers["CDN-Cache-Control"]).toContain("max-age=21600")
    expect(headers["Surrogate-Control"]).toBe("max-age=21600, stale-while-revalidate=86400")
    expect(headers["Cache-Control"]).not.toContain("max-age=86400")
  })

  it("keeps immutable max-age for mapped posters even with the dynamic flag", () => {
    const headers = posterHeaders("\"etag\"", true, false, true)

    expect(headers["Cache-Control"]).toContain("immutable")
    expect(headers["Surrogate-Control"]).toBe("max-age=31536000")
  })

  it("ignores the dynamic flag for preview responses", () => {
    const headers = posterHeaders("\"etag\"", false, true, true)

    expect(headers["Cache-Control"]).toContain("no-store")
  })

  it("only treats saved mapping poster URLs as immutable when the mapping version matches", () => {
    const params = new URLSearchParams("rv=81")
    const versionedParams = new URLSearchParams("rv=81&mv=1784218530000")

    expect(isImmutablePosterRequest(params, { hasMapping: true, isRotating: false })).toBe(false)
    expect(isImmutablePosterRequest(versionedParams, {
      hasMapping: true,
      isRotating: false,
      mappingVersionMatches: true,
    })).toBe(true)
    expect(isImmutablePosterRequest(versionedParams, {
      hasMapping: true,
      isRotating: true,
      mappingVersionMatches: true,
    })).toBe(false)
    // Senza mapping il poster contiene dati dinamici (rank, premi, IMDb Top 250):
    // non può essere immutable per un anno, o la CDN servirebbe badge congelati.
    expect(isImmutablePosterRequest(params, { hasMapping: false, isRotating: false })).toBe(false)
    expect(isImmutablePosterRequest(versionedParams, {
      hasMapping: true,
      isRotating: false,
      mappingVersionMatches: false,
    })).toBe(false)
  })
})

describe("poster negative cache (F3)", () => {
  it("round-trips a written error until it expires", () => {
    cacheClear()
    const key = "poster:test:1"
    expect(readPosterError(key)).toBeNull()

    writePosterError(key, 500)
    expect(readPosterError(key)).toEqual({ status: 500 })

    writePosterError(key, 503)
    expect(readPosterError(key)).toEqual({ status: 503 })
  })

  it("does not collide with the poster payload entry", () => {
    cacheClear()
    const key = "poster:test:2"
    writePosterError(key, 503)
    // La payload cache usa la stessa key base senza suffisso: nessun conflitto.
    expect(readPosterError(`${key}:headers`)).toBeNull()
  })
})
