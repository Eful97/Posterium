import { describe, it, expect } from "vitest"
import { toSearchResult } from "@/lib/types"

describe("toSearchResult", () => {
  it("converts partial with all fields", () => {
    const result = toSearchResult({
      id: 123,
      media_type: "tv",
      title: "My Title",
      name: "My Name",
      poster_path: "/poster.jpg",
      release_date: "2024-01-15",
      first_air_date: "2024-03-20",
      imdb_id: "tt1234567",
    })
    expect(result).toEqual({
      id: 123,
      media_type: "tv",
      title: "My Title",
      name: "My Name",
      poster_path: "/poster.jpg",
      release_date: "2024-01-15",
      first_air_date: "2024-03-20",
      imdb_id: "tt1234567",
    })
  })

  it("defaults id to 0 when null/undefined", () => {
    expect(toSearchResult({}).id).toBe(0)
    expect(toSearchResult({ id: null }).id).toBe(0)
    expect(toSearchResult({ id: undefined }).id).toBe(0)
  })

  it("defaults media_type to movie when not tv", () => {
    expect(toSearchResult({}).media_type).toBe("movie")
    expect(toSearchResult({ media_type: "invalid" }).media_type).toBe("movie")
    expect(toSearchResult({ media_type: "movie" }).media_type).toBe("movie")
  })

  it("sets media_type to tv when explicitly tv", () => {
    expect(toSearchResult({ media_type: "tv" }).media_type).toBe("tv")
  })

  it("converts null title to undefined", () => {
    expect(toSearchResult({ title: null }).title).toBeUndefined()
  })

  it("converts null name to undefined", () => {
    expect(toSearchResult({ name: null }).name).toBeUndefined()
  })

  it("preserves valid title", () => {
    expect(toSearchResult({ title: "Valid" }).title).toBe("Valid")
  })

  it("preserves valid name", () => {
    expect(toSearchResult({ name: "Valid" }).name).toBe("Valid")
  })

  it("defaults poster_path to null", () => {
    expect(toSearchResult({}).poster_path).toBeNull()
  })

  it("converts null poster_path to null", () => {
    expect(toSearchResult({ poster_path: null }).poster_path).toBeNull()
  })

  it("preserves poster_path", () => {
    expect(toSearchResult({ poster_path: "/img.jpg" }).poster_path).toBe("/img.jpg")
  })

  it("preserves release_date and first_air_date", () => {
    const r = toSearchResult({ release_date: "2024-01-01", first_air_date: "2024-06-01" })
    expect(r.release_date).toBe("2024-01-01")
    expect(r.first_air_date).toBe("2024-06-01")
  })

  it("preserves imdb_id", () => {
    expect(toSearchResult({ imdb_id: "tt9999999" }).imdb_id).toBe("tt9999999")
  })

  it("handles undefined imdb_id", () => {
    expect(toSearchResult({}).imdb_id).toBeUndefined()
  })
})
