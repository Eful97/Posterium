import { describe, expect, it } from "vitest"
import { getEffectiveRotationState } from "@/lib/poster-rotation"
import type { Mapping } from "@/lib/types"

function mapping(input: Partial<Mapping>): Mapping {
  return {
    tmdbId: 1,
    mediaType: "movie",
    title: "Rotation Test",
    posterPath: "/a.jpg",
    logoPath: "/logo.png",
    originalPosterPath: null,
    language: null,
    updatedAt: "2026-07-16T00:00:00.000Z",
    ...input,
  }
}

describe("getEffectiveRotationState", () => {
  it("disables rotation when exclusions leave fewer than two posters", () => {
    const state = getEffectiveRotationState(mapping({
      autoRotateClean: true,
      cleanPosters: ["/a.jpg", "/b.jpg"],
      excludedPosters: ["/b.jpg"],
    }))

    expect(state.isRotating).toBe(false)
    expect(state.availablePosters).toEqual(["/a.jpg"])
  })

  it("keeps rotation enabled when at least two posters remain", () => {
    const state = getEffectiveRotationState(mapping({
      autoRotateClean: true,
      cleanPosters: ["/a.jpg", "/b.jpg", "/c.jpg"],
      excludedPosters: ["/c.jpg"],
    }))

    expect(state.isRotating).toBe(true)
    expect(state.availablePosters).toEqual(["/a.jpg", "/b.jpg"])
  })
})
