import { describe, expect, it } from "vitest"
import { posterHeaders, posterNotModifiedHeaders } from "@/lib/poster-runtime-cache"

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
    expect(headers["Surrogate-Control"]).toContain("stale-while-revalidate")
  })
})
