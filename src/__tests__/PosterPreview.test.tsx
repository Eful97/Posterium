import { describe, expect, it, vi } from "vitest"
import { screen, fireEvent } from "@testing-library/react"
import { renderWithCtx } from "./test-utils"
import { PosterPreview } from "@/components/PosterPreview"

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ error: vi.fn() }),
}))

// t() che ritorna la key stessa — test non dipendenti dalle traduzioni
const t = (k: string) => k

const BASE_PROPS = {
  previewLoading: false,
  loadProgress: 0,
  imageError: false,
  setImageError: vi.fn(),
  imgSrc: "",
}

const SELECTED_MOVIE = {
  id: 1,
  media_type: "movie" as const,
  title: "Test Movie",
  name: "Test Movie",
  poster_path: "/test.jpg",
}

describe("PosterPreview", () => {
  it("renders nothing when no poster is selected and no previewUrl", () => {
    const { container } = renderWithCtx(
      <PosterPreview {...BASE_PROPS} />,
      { selected: null, previewUrl: "", t },
    )
    expect(container.querySelector("img")).toBeNull()
  })

  it("renders skeleton when selected but no previewUrl", () => {
    renderWithCtx(
      <PosterPreview {...BASE_PROPS} />,
      { selected: SELECTED_MOVIE, previewUrl: "", t },
    )
    expect(document.querySelector(".animate-pulse")).toBeTruthy()
  })

  it("renders the preview image when imgSrc is provided", () => {
    const { container } = renderWithCtx(
      <PosterPreview {...BASE_PROPS} imgSrc="https://example.com/poster.jpg" />,
      { selected: SELECTED_MOVIE, previewUrl: "https://example.com/preview", t },
    )
    const img = container.querySelector("img[src]")
    expect(img).toBeTruthy()
    expect(img?.getAttribute("src")).toBe("https://example.com/poster.jpg")
  })

  it("shows loading bar when previewLoading is true", () => {
    renderWithCtx(
      <PosterPreview {...BASE_PROPS} previewLoading loadProgress={45} />,
      { selected: SELECTED_MOVIE, previewUrl: "https://example.com/preview", t },
    )
    expect(screen.getByText("45%")).toBeTruthy()
  })

  it("shows error overlay when imageError is true", () => {
    renderWithCtx(
      <PosterPreview {...BASE_PROPS} imageError />,
      { selected: SELECTED_MOVIE, previewUrl: "https://example.com/preview", t },
    )
    expect(screen.getByText("ui.imageNotAvailable")).toBeTruthy()
  })

  it("calls setImageError(false) on retry click", () => {
    const setImageError = vi.fn()
    renderWithCtx(
      <PosterPreview {...BASE_PROPS} imageError setImageError={setImageError} />,
      { selected: SELECTED_MOVIE, previewUrl: "https://example.com/preview", t },
    )
    fireEvent.click(screen.getByText("ui.retry"))
    expect(setImageError).toHaveBeenCalledWith(false)
  })
})
