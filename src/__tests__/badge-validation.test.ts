import { describe, it, expect } from "vitest"
import { computeBadge, computeAbsoluteCinema } from "@/lib/badge-priority"
import { getUpcomingReleaseLabel } from "@/lib/release-badge"
import { mappingSchema } from "@/lib/validation"
import { createT } from "@/lib/i18n"

const t = createT("it")

describe("computeBadge", () => {
  const base = {
    upcomingRelease: null,
    isNewMovie: false, isNewSeries: false,
    animeRank: null, trendRank: null,
    award: null, franchise: null, nomination: null,
    studio: null, director: null, extra: null,
  }

  it("prioritizes upcoming release over new movie", () => {
    const badge = computeBadge({
      ...base,
      upcomingRelease: "In uscita 18.12.26",
      isNewMovie: true,
    }, t)
    expect(badge).toEqual({ type: "extra", label: "In uscita 18.12.26" })
  })

  it("prioritizes upcoming release over trend", () => {
    const badge = computeBadge({
      ...base,
      upcomingRelease: "In uscita 18.12.26",
      trendRank: 1,
    })
    expect(badge).toEqual({ type: "extra", label: "In uscita 18.12.26" })
  })

  it("prioritizes new movie over everything else", () => {
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

  it("prioritizes nomination over subgenre", () => {
    expect(computeBadge({ ...base, nomination: "Candidato Oscar", subGenre: "Viaggi nel Tempo" }, t)?.label).toBe("Candidato Oscar")
  })

  it("prioritizes subgenre over director", () => {
    expect(computeBadge({ ...base, subGenre: "Viaggi nel Tempo", director: "Di Christopher Nolan" }, t)?.label).toBe("Viaggi nel Tempo")
  })

  it("prioritizes imdbTop250 before generic extra", () => {
    expect(computeBadge({ ...base, imdbTop250: true, extra: "Da divorare" }, t)?.label).toBe("Absolute Cinema")
  })

  it("does not show imdbTop250 for TV", () => {
    // The imdbTop250 flag works for both media types, but IMDb chart is movie-only
    const badge = computeBadge({ ...base, imdbTop250: true }, t)
    expect(badge?.label).toBe("Absolute Cinema")
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

describe("computeAbsoluteCinema (replaces old computeExtraFallback)", () => {
  it("returns Absolute Cinema for movies in IMDb Top 250", () => {
    expect(computeAbsoluteCinema({ mediaType: "movie", imdbTop250: true }, t)).toBe("Absolute Cinema")
  })

  it("returns null for movies NOT in IMDb Top 250", () => {
    expect(computeAbsoluteCinema({ mediaType: "movie", imdbTop250: false }, t)).toBeNull()
  })

  it("returns null for TV even if imdbTop250 is true (chart is movie-only)", () => {
    expect(computeAbsoluteCinema({ mediaType: "tv", imdbTop250: true }, t)).toBeNull()
  })

  it("returns key when no t function provided", () => {
    expect(computeAbsoluteCinema({ mediaType: "movie", imdbTop250: true })).toBe("badge.absoluteCinema")
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

describe("getUpcomingReleaseLabel", () => {
  it("returns formatted date for future movie", () => {
    expect(getUpcomingReleaseLabel({
      mediaType: "movie",
      releaseDate: "2099-12-18",
      locale: "it",
    })).toBe("In uscita 18.12.99")
  })

  it("returns null for past release date", () => {
    expect(getUpcomingReleaseLabel({
      mediaType: "movie",
      releaseDate: "2020-01-01",
      locale: "it",
    })).toBeNull()
  })

  it("returns null for TV shows", () => {
    expect(getUpcomingReleaseLabel({
      mediaType: "tv",
      releaseDate: "2099-12-18",
      firstAirDate: "2099-12-18",
      locale: "it",
    })).toBeNull()
  })

  it("returns null when no date provided", () => {
    expect(getUpcomingReleaseLabel({
      mediaType: "movie",
      locale: "it",
    })).toBeNull()
  })
})
