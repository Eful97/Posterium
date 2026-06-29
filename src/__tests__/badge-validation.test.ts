import { describe, it, expect } from "vitest"
import { computeBadge, computeExtraFallback } from "@/lib/badge-priority"
import { mappingSchema } from "@/lib/validation"
import { createT } from "@/lib/i18n"

const t = createT("it")

describe("computeBadge", () => {
  const base = {
    isNewMovie: false, isNewSeries: false,
    animeRank: null, trendRank: null,
    award: null, franchise: null, nomination: null,
    studio: null, director: null, extra: null,
  }

  it("prioritizes new movie over everything", () => {
    expect(computeBadge({ ...base, isNewMovie: true, award: "Vincitore Oscar" }, t)?.label).toBe("Nuovo film")
  })

  it("prioritizes new series over award", () => {
    expect(computeBadge({ ...base, isNewSeries: true, award: "Vincitore Oscar" }, t)?.label).toBe("Nuova serie")
  })

  it("prioritizes anime rank over trend rank", () => {
    expect(computeBadge({ ...base, animeRank: 5, trendRank: 10 }, t)?.type).toBe("rank")
    expect(computeBadge({ ...base, animeRank: 5, trendRank: 10 }, t)?.rank).toBe(5)
    expect(computeBadge({ ...base, animeRank: 5, trendRank: 10 }, t)?.label).toBe("Anime")
  })

  it("prioritizes trend rank over award", () => {
    expect(computeBadge({ ...base, trendRank: 3, award: "Vincitore Oscar" }, t)?.type).toBe("rank")
    expect(computeBadge({ ...base, trendRank: 3 }, t)?.rank).toBe(3)
  })

  it("prioritizes award over franchise", () => {
    expect(computeBadge({ ...base, award: "Vincitore Oscar", franchise: "MCU" }, t)?.label).toBe("Vincitore Oscar")
  })

  it("prioritizes franchise over nomination", () => {
    expect(computeBadge({ ...base, franchise: "MCU", nomination: "Candidato Oscar" }, t)?.label).toBe("MCU")
  })

  it("falls back to extra when nothing else matches", () => {
    expect(computeBadge({ ...base, extra: "Da divorare" }, t)?.label).toBe("Da divorare")
  })

  it("returns null when nothing matches", () => {
    expect(computeBadge({ ...base }, t)).toBeNull()
  })

  it("returns key when no t function provided", () => {
    expect(computeBadge({ ...base, isNewMovie: true })?.label).toBe("badge.newMovie")
  })
})

describe("computeExtraFallback", () => {
  it("returns Il più votato for movies with vote >= 8.5", () => {
    expect(computeExtraFallback({ mediaType: "movie", voteAverage: 8.5, tvType: null, tvStatus: null }, t)).toBe("Il più votato")
  })

  it("returns null for movies with vote < 8.5", () => {
    expect(computeExtraFallback({ mediaType: "movie", voteAverage: 7.0, tvType: null, tvStatus: null }, t)).toBeNull()
  })

  it("returns Miniserie for TV with that type", () => {
    expect(computeExtraFallback({ mediaType: "tv", voteAverage: 7.0, tvType: "Miniseries", tvStatus: null }, t)).toBe("Miniserie")
  })

  it("returns Ritorna for returning series", () => {
    expect(computeExtraFallback({ mediaType: "tv", voteAverage: 7.0, tvType: null, tvStatus: "Returning Series" }, t)).toBe("Ritorna")
  })

  it("returns Da divorare for high-rated TV", () => {
    expect(computeExtraFallback({ mediaType: "tv", voteAverage: 9.0, tvType: null, tvStatus: "Ended" }, t)).toBe("Da divorare")
  })
})

describe("mappingSchema", () => {
  it("validates a correct mapping", () => {
    const result = mappingSchema.safeParse({
      tmdbId: 12345,
      mediaType: "movie",
      title: "Test Movie",
      posterPath: "/abc.jpg",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing required fields", () => {
    const result = mappingSchema.safeParse({ tmdbId: 12345 })
    expect(result.success).toBe(false)
  })

  it("rejects invalid mediaType", () => {
    const result = mappingSchema.safeParse({
      tmdbId: 12345,
      mediaType: "invalid",
      title: "Test",
      posterPath: "/abc.jpg",
    })
    expect(result.success).toBe(false)
  })

  it("accepts optional fields", () => {
    const result = mappingSchema.safeParse({
      tmdbId: 12345,
      mediaType: "tv",
      title: "Test Series",
      posterPath: "/def.jpg",
      genreName: "Drama",
      voteAverage: 8.5,
      trendRank: 3,
      logoPath: "/logo.png",
      logoScale: 75,
      badgeExtra: "Vincitore Emmy",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.genreName).toBe("Drama")
      expect(result.data.voteAverage).toBe(8.5)
      expect(result.data.trendRank).toBe(3)
    }
  })
})
