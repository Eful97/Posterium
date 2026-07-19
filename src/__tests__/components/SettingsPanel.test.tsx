import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SettingsPanel } from "@/components/SettingsPanel"
import { renderWithCtx } from "@/__tests__/test-utils"

describe("SettingsPanel", () => {
  it("renders TMDB key input", () => {
    renderWithCtx(
      <SettingsPanel
        tmdbKeyInput=""
        setTmdbKeyInput={() => {}}
        setTmdbKey={() => {}}
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
        mdblistApiKey=""
        setMdblistApiKey={() => {}}
      />
    )
    expect(screen.getByText("ui.tmdbKey")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("ui.tmdbKeyPlaceholder")).toBeInTheDocument()
  })

  it("renders MDBList key input", () => {
    renderWithCtx(
      <SettingsPanel
        tmdbKeyInput=""
        setTmdbKeyInput={() => {}}
        setTmdbKey={() => {}}
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
        mdblistApiKey=""
        setMdblistApiKey={() => {}}
      />
    )
    expect(screen.getByText("ui.mdblistKey")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("ui.mdblistKeyPlaceholder")).toBeInTheDocument()
  })

  it("renders genre/rating badge toggle", () => {
    renderWithCtx(
      <SettingsPanel
        tmdbKeyInput=""
        setTmdbKeyInput={() => {}}
        setTmdbKey={() => {}}
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
        mdblistApiKey=""
        setMdblistApiKey={() => {}}
      />
    )
    expect(screen.getByText("ui.genreRatingBadge")).toBeInTheDocument()
  })

  it("renders trend badge toggle", () => {
    renderWithCtx(
      <SettingsPanel
        tmdbKeyInput=""
        setTmdbKeyInput={() => {}}
        setTmdbKey={() => {}}
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
        mdblistApiKey=""
        setMdblistApiKey={() => {}}
      />
    )
    expect(screen.getByText("ui.trendBadge")).toBeInTheDocument()
  })

  it("shows validation error for short TMDB key on blur", async () => {
    const u = userEvent.setup()
    const setTmdbKey = vi.fn()
    renderWithCtx(
      <SettingsPanel
        tmdbKeyInput="short"
        setTmdbKeyInput={() => {}}
        setTmdbKey={setTmdbKey}
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
        mdblistApiKey=""
        setMdblistApiKey={() => {}}
      />
    )
    const input = screen.getByPlaceholderText("ui.tmdbKeyPlaceholder")
    await u.click(input)
    await u.tab()
    expect(screen.getByText(/almeno 20 caratteri/)).toBeInTheDocument()
  })

  it("renders clear cache button", () => {
    renderWithCtx(
      <SettingsPanel
        tmdbKeyInput=""
        setTmdbKeyInput={() => {}}
        setTmdbKey={() => {}}
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
        mdblistApiKey=""
        setMdblistApiKey={() => {}}
      />
    )
    const buttons = screen.getAllByRole("button")
    const clearBtn = buttons.find((b) => b.textContent === "ui.clearCache")
    expect(clearBtn).toBeTruthy()
  })

  it("renders export and import buttons", () => {
    renderWithCtx(
      <SettingsPanel
        tmdbKeyInput=""
        setTmdbKeyInput={() => {}}
        setTmdbKey={() => {}}
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
        mdblistApiKey=""
        setMdblistApiKey={() => {}}
      />
    )
    expect(screen.getByText("ui.exportJson")).toBeInTheDocument()
    expect(screen.getByText("ui.importJson")).toBeInTheDocument()
  })

  it("renders badge style selector", () => {
    renderWithCtx(
      <SettingsPanel
        tmdbKeyInput=""
        setTmdbKeyInput={() => {}}
        setTmdbKey={() => {}}
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
        mdblistApiKey=""
        setMdblistApiKey={() => {}}
      />
    )
    expect(screen.getByText("ui.styleDefault")).toBeInTheDocument()
  })
})
