import { describe, it, expect } from "vitest"
import { mappingSchema } from "@/lib/validation"
import { computeBadge } from "@/lib/badge-priority"

describe("mappingSchema CRUD", () => {
  it("validates a minimal mapping", () => {
    const r = mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg" })
    expect(r.success).toBe(true)
  })

  it("rejects negative tmdbId", () => {
    const r = mappingSchema.safeParse({ tmdbId: -1, mediaType: "movie", title: "T", posterPath: "/p.jpg" })
    expect(r.success).toBe(false)
  })

  it("rejects empty title", () => {
    const r = mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "", posterPath: "/p.jpg" })
    expect(r.success).toBe(false)
  })

  it("accepts TV with series-specific fields", () => {
    const r = mappingSchema.safeParse({
      tmdbId: 123, mediaType: "tv", title: "Show", posterPath: "/p.jpg",
      tvType: "Scripted", tvStatus: "Returning Series", firstAirDate: "2024-01-01",
    })
    expect(r.success).toBe(true)
  })

  it("rejects logoScale below 10", () => {
    const r = mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg", logoScale: 5 })
    expect(r.success).toBe(false)
  })

  it("rejects logoScale above 200", () => {
    const r = mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg", logoScale: 250 })
    expect(r.success).toBe(false)
  })

  it("accepts voteAverage between 0 and 10", () => {
    expect(mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg", voteAverage: 8.5 }).success).toBe(true)
    expect(mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg", voteAverage: 0 }).success).toBe(true)
    expect(mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg", voteAverage: 10 }).success).toBe(true)
    expect(mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg", voteAverage: 11 }).success).toBe(false)
    expect(mappingSchema.safeParse({ tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg", voteAverage: -1 }).success).toBe(false)
  })
})

describe("badge priority edge cases", () => {
  it("handles all null inputs", () => {
    expect(computeBadge({
      isNewMovie: false, isNewSeries: false, animeRank: null, trendRank: null,
      award: null, franchise: null, nomination: null, studio: null, director: null, extra: null,
    })).toBeNull()
  })

  it("shows studio over director", () => {
    const r = computeBadge({
      isNewMovie: false, isNewSeries: false, animeRank: null, trendRank: null,
      award: null, franchise: null, nomination: null, studio: "Netflix", director: "Di Nolan", extra: null,
    })
    expect(r?.label).toBe("Netflix")
  })

  it("shows director when studio is null", () => {
    const r = computeBadge({
      isNewMovie: false, isNewSeries: false, animeRank: null, trendRank: null,
      award: null, franchise: null, nomination: null, studio: null, director: "Di Nolan", extra: null,
    })
    expect(r?.label).toBe("Di Nolan")
  })

  it("rank badge includes rank and label", () => {
    const r = computeBadge({
      isNewMovie: false, isNewSeries: false, animeRank: 3, trendRank: 10,
      award: null, franchise: null, nomination: null, studio: null, director: null, extra: null,
    })
    expect(r?.type).toBe("rank")
    expect(r?.rank).toBe(3)
    expect(r?.label).toBe("Anime")
  })
})
