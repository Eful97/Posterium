import { describe, expect, it } from "vitest"
import { isImmutablePosterRequest, posterHeaders, posterNotModifiedHeaders } from "@/lib/poster-runtime-cache"

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
    expect(isImmutablePosterRequest(params, { hasMapping: false, isRotating: false })).toBe(true)
  })
})
