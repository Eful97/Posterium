import { describe, expect, it } from "vitest"
import { getTMDBSessionCache, invalidateTMDBSessionCache, setTMDBSessionCache, __resetTMDBSessionCache } from "@/lib/tmdb-session-cache"

const DETAILS = { id: 42, title: "Test", genres: [], vote_average: 7.0, vote_count: 100 } as never
const IMAGES = { id: 42, backdrops: [], posters: [], logos: [] } as never

describe("TMDB session cache (F6)", () => {
  it("stores and returns the entry for the same type:id", () => {
    __resetTMDBSessionCache()
    expect(getTMDBSessionCache("movie", 42)).toBeNull()

    setTMDBSessionCache("movie", 42, { details: DETAILS, images: IMAGES })
    const entry = getTMDBSessionCache("movie", 42)
    expect(entry?.details).toEqual(DETAILS)
    expect(entry?.images).toEqual(IMAGES)
    expect(getTMDBSessionCache("movie", 42)).toEqual(entry)
  })

  it("keys by type:id so different titles do not collide", () => {
    __resetTMDBSessionCache()
    setTMDBSessionCache("movie", 42, { details: DETAILS })
    expect(getTMDBSessionCache("movie", 43)).toBeNull()
    expect(getTMDBSessionCache("tv", 42)).toBeNull()
  })

  it("invalidates a single title", () => {
    __resetTMDBSessionCache()
    setTMDBSessionCache("movie", 42, { details: DETAILS })
    invalidateTMDBSessionCache("movie", 42)
    expect(getTMDBSessionCache("movie", 42)).toBeNull()
  })
})
