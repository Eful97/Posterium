import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import EditView from "@/components/EditView"
import { renderWithCtx } from "@/__tests__/test-utils"
import type { SearchResult } from "@/lib/types"

const mockSelected: SearchResult = {
  id: 550,
  media_type: "movie",
  title: "Fight Club",
  name: "",
  poster_path: "/fc.jpg",
  release_date: "1999-10-15",
}

describe("EditView", () => {
  it("shows search bar when no item selected", () => {
    renderWithCtx(<EditView />)
    expect(screen.getByPlaceholderText("ui.searchPlaceholderLarge")).toBeInTheDocument()
  })

  it("shows no key message when no tmdbKey", () => {
    renderWithCtx(<EditView />, { tmdbKey: "" })
    expect(screen.getByText("ui.noKey")).toBeInTheDocument()
  })

  it("shows trending when no item selected and has tmdbKey", () => {
    renderWithCtx(<EditView />)
    expect(screen.getByText("ui.heroTitle")).toBeInTheDocument()
  })

  it("shows preview section when item selected", () => {
    renderWithCtx(<EditView />, { selected: mockSelected })
    expect(screen.getByText("ui.previewSection")).toBeInTheDocument()
  })

  it("shows title when item selected", () => {
    renderWithCtx(<EditView />, { selected: mockSelected })
    expect(screen.getByText("Fight Club")).toBeInTheDocument()
  })

  it("shows save poster button when item selected with previewPoster", () => {
    renderWithCtx(<EditView />, {
      selected: mockSelected,
      previewPoster: { file_path: "/clean.jpg", iso_639_1: null, vote_average: 0, width: 1000, height: 1500 },
    })
    expect(screen.getByText("ui.savePoster")).toBeInTheDocument()
  })

  it("switches right tab on click", async () => {
    const u = userEvent.setup()
    renderWithCtx(<EditView />, {
      selected: mockSelected,
      posters: [{ file_path: "/clean.jpg", iso_639_1: null, vote_average: 0, width: 1000, height: 1500 }],
      previewPoster: { file_path: "/clean.jpg", iso_639_1: null, vote_average: 0, width: 1000, height: 1500 },
      selectedLogo: { file_path: "/logo.png", iso_639_1: "en", vote_average: 0, width: 200, height: 100 },
    })
    const transformTab = screen.getByText("ui.transform")
    await u.click(transformTab)
    expect(transformTab.closest("button")).toHaveClass("tab-chip-active")
  })

  it("shows trending loading state when no trending data", () => {
    renderWithCtx(<EditView />, { trending: [] })
    expect(screen.getByText("ui.loading")).toBeInTheDocument()
  })
})
