import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { SettingsPanel } from "@/components/SettingsPanel"
import { renderWithCtx } from "@/__tests__/test-utils"

describe("SettingsPanel", () => {
  it("renders genre/rating badge toggle", () => {
    renderWithCtx(
      <SettingsPanel
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
      />
    )
    expect(screen.getByText("ui.genreRatingBadge")).toBeInTheDocument()
  })

  it("renders trend badge toggle", () => {
    renderWithCtx(
      <SettingsPanel
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
      />
    )
    expect(screen.getByText("ui.trendBadge")).toBeInTheDocument()
  })

  it("renders clear cache button", () => {
    renderWithCtx(
      <SettingsPanel
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
      />
    )
    const buttons = screen.getAllByRole("button")
    const clearBtn = buttons.find((b) => b.textContent === "ui.clearCache")
    expect(clearBtn).toBeTruthy()
  })

  it("renders export and import buttons", () => {
    renderWithCtx(
      <SettingsPanel
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
      />
    )
    expect(screen.getByText("ui.exportJson")).toBeInTheDocument()
    expect(screen.getByText("ui.importJson")).toBeInTheDocument()
  })

  it("renders badge style selector", () => {
    renderWithCtx(
      <SettingsPanel
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
      />
    )
    expect(screen.getByText("ui.styleDefault")).toBeInTheDocument()
  })

  it("does not render API key inputs", () => {
    renderWithCtx(
      <SettingsPanel
        setSettingsOpen={() => {}}
        exportData={() => {}}
        importData={() => {}}
      />
    )
    expect(screen.queryByPlaceholderText("ui.tmdbKeyPlaceholder")).toBeNull()
    expect(screen.queryByPlaceholderText("ui.mdblistKeyPlaceholder")).toBeNull()
    expect(screen.queryByPlaceholderText("ui.tvdbKeyPlaceholder")).toBeNull()
  })
})
