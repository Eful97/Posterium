import { afterEach, describe, expect, it, vi } from "vitest"
import { http, ApiError } from "@/lib/http"

describe("http", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns null when the response has no content", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })))

    const result = await http<null>("/api/empty", { retries: 0 })

    expect(result).toBeNull()
  })

  it("throws ApiError for non-ok responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })))

    await expect(http("/api/protected", { retries: 0 })).rejects.toBeInstanceOf(ApiError)
  })
})
