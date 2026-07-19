import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MyPostersView } from "@/components/MyPostersView"
import { renderWithCtx } from "@/__tests__/test-utils"
import type { Mapping } from "@/lib/types"

const mockMappings: Mapping[] = [
  { mediaType: "movie", tmdbId: "550", title: "Fight Club", posterPath: "/fc.jpg", logoPath: null, logoScale: 75, logoOffsetX: 0, logoOffsetY: 0, backdropPath: null, backdropScale: 100, backdropOffsetX: 0, backdropOffsetY: 0, customBadge: null, showBadges: true, rankingBadges: true, gradientHeight: 30, blurIntensity: 5, blurFade: 60, blurDarkness: 40, blurEnabled: false, badgeStyle: "shadow", rankingBadgeStyle: "default", language: "en", cleanPosters: [], excludedPosters: [], autoRotateClean: false, logoDisabled: false, trendRank: null, updatedAt: "2024-01-01", genreName: "Drama" },
  { mediaType: "tv", tmdbId: "1399", title: "Game of Thrones", posterPath: "/got.jpg", logoPath: "/got_logo.png", logoScale: 75, logoOffsetX: 0, logoOffsetY: 0, backdropPath: null, backdropScale: 100, backdropOffsetX: 0, backdropOffsetY: 0, customBadge: null, showBadges: true, rankingBadges: true, gradientHeight: 30, blurIntensity: 5, blurFade: 60, blurDarkness: 40, blurEnabled: false, badgeStyle: "shadow", rankingBadgeStyle: "default", language: "en", cleanPosters: [], excludedPosters: [], autoRotateClean: false, logoDisabled: false, trendRank: null, updatedAt: "2024-01-02", genreName: "Action" },
  { mediaType: "tv", tmdbId: "999", title: "Attack on Titan", posterPath: "/aot.jpg", logoPath: "/aot_logo.png", logoScale: 75, logoOffsetX: 0, logoOffsetY: 0, backdropPath: null, backdropScale: 100, backdropOffsetX: 0, backdropOffsetY: 0, customBadge: null, showBadges: true, rankingBadges: true, gradientHeight: 30, blurIntensity: 5, blurFade: 60, blurDarkness: 40, blurEnabled: false, badgeStyle: "shadow", rankingBadgeStyle: "default", language: "en", cleanPosters: [], excludedPosters: [], autoRotateClean: false, logoDisabled: false, trendRank: null, updatedAt: "2024-01-03", genreName: "Animation" },
]

describe("MyPostersView", () => {
  it("shows empty state when no mappings", () => {
    renderWithCtx(<MyPostersView />)
    expect(screen.getByText("ui.emptyPosters")).toBeInTheDocument()
  })

  it("renders poster items", () => {
    renderWithCtx(<MyPostersView />, { mappings: mockMappings })
    expect(screen.getByText("Fight Club")).toBeInTheDocument()
    expect(screen.getByText("Game of Thrones")).toBeInTheDocument()
    expect(screen.getByText("Attack on Titan")).toBeInTheDocument()
  })

  it("filters by title", async () => {
    const u = userEvent.setup()
    renderWithCtx(<MyPostersView />, { mappings: mockMappings })
    const input = screen.getByPlaceholderText("ui.filterPlaceholder")
    await u.type(input, "Fight")
    expect(screen.getByText("Fight Club")).toBeInTheDocument()
    expect(screen.queryByText("Game of Thrones")).not.toBeInTheDocument()
  })

  it("shows select mode button", () => {
    renderWithCtx(<MyPostersView />, { mappings: mockMappings })
    expect(screen.getByText("ui.select")).toBeInTheDocument()
  })

  it("shows poster count in title", () => {
    renderWithCtx(<MyPostersView />, { mappings: mockMappings })
    expect(screen.getByText(/\(3\)/)).toBeInTheDocument()
  })
})
