import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { resolveRequestApiKey } from "@/lib/tmdb"

function mkReq(searchParams?: Record<string, string>, headers?: Record<string, string>) {
  const sp = new URLSearchParams(searchParams)
  return {
    nextUrl: { searchParams: sp },
    headers: new Headers(headers),
  }
}

describe("resolveRequestApiKey — fallback d'istanza POSTERIUM_TMDB_KEY", () => {
  beforeEach(() => {
    delete process.env.POSTERIUM_TMDB_KEY
  })
  afterEach(() => {
    delete process.env.POSTERIUM_TMDB_KEY
  })

  it("priorità: header x-api-key > query api_key > env", () => {
    process.env.POSTERIUM_TMDB_KEY = "env-key"
    const req = mkReq({ api_key: "query-key" }, { "x-api-key": "header-key" })
    expect(resolveRequestApiKey(req)).toBe("header-key")
    expect(resolveRequestApiKey(mkReq({ api_key: "query-key" }))).toBe("query-key")
    expect(resolveRequestApiKey(mkReq({}))).toBe("env-key")
  })

  it("ritorna undefined quando non c'è nulla (nessuna env)", () => {
    delete process.env.POSTERIUM_TMDB_KEY
    expect(resolveRequestApiKey(mkReq({}))).toBeUndefined()
  })

  it("header vuoto non vince sull'env", () => {
    process.env.POSTERIUM_TMDB_KEY = "env-key"
    expect(resolveRequestApiKey(mkReq({}, { "x-api-key": "" }))).toBe("env-key")
  })
})
