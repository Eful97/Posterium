import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PosterOptions } from "@/components/PosterOptions"
import { renderWithCtx } from "@/__tests__/test-utils"
import type { TMDBImage } from "@/lib/types"

const mockPosters: TMDBImage[] = [
  { file_path: "/clean1.jpg", iso_639_1: null, vote_average: 0, width: 1000, height: 1500 },
  { file_path: "/clean2.jpg", iso_639_1: null, vote_average: 0, width: 1000, height: 1500 },
  { file_path: "/en1.jpg", iso_639_1: "en", vote_average: 0, width: 1000, height: 1500 },
  { file_path: "/it1.jpg", iso_639_1: "it", vote_average: 0, width: 1000, height: 1500 },
]

describe("PosterOptions", () => {
  it("shows loading when no posters", () => {
    renderWithCtx(<PosterOptions posters={[]} posterActivePath={null} lang="it" selectPoster={() => {}} />)
    expect(screen.getAllByText("ui.loading").length).toBeGreaterThan(0)
  })

  it("renders clean posters tab by default", () => {
    renderWithCtx(<PosterOptions posters={mockPosters} posterActivePath={null} lang="it" selectPoster={() => {}} />)
    expect(screen.getByText(/Clean/)).toBeInTheDocument()
  })

  it("shows language-specific tab", () => {
    renderWithCtx(<PosterOptions posters={mockPosters} posterActivePath={null} lang="it" selectPoster={() => {}} />)
    expect(screen.getByText(/Italiano/)).toBeInTheDocument()
  })

  it("shows English tab for en posters", () => {
    renderWithCtx(<PosterOptions posters={mockPosters} posterActivePath={null} lang="it" selectPoster={() => {}} />)
    expect(screen.getByText(/English/)).toBeInTheDocument()
  })

  it("switches tab on click", async () => {
    const u = userEvent.setup()
    renderWithCtx(<PosterOptions posters={mockPosters} posterActivePath={null} lang="it" selectPoster={() => {}} />)
    const itTab = screen.getByText(/Italiano/)
    await u.click(itTab)
    expect(itTab.closest("button")).toHaveClass("tab-chip-active")
  })

  it("showTabs=false hides tabs", () => {
    renderWithCtx(<PosterOptions posters={mockPosters} posterActivePath={null} lang="it" selectPoster={() => {}} showTabs={false} />)
    expect(screen.queryByText(/Clean/)).not.toBeInTheDocument()
  })

  it("renders clean poster images with correct src", () => {
    const { container } = renderWithCtx(<PosterOptions posters={mockPosters} posterActivePath={null} lang="it" selectPoster={() => {}} />)
    const imgs = container.querySelectorAll("img")
    const cleanSrcs = mockPosters.filter((p) => p.iso_639_1 === null).map((p) =>
      `https://image.tmdb.org/t/p/w154${p.file_path}`
    )
    cleanSrcs.forEach((src) => {
      const match = Array.from(imgs).some((img) => img.getAttribute("src") === src)
      expect(match).toBeTruthy()
    })
  })
})
