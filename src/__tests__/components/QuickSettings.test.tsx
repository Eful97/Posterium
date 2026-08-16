import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuickSettings } from "@/components/QuickSettings"
import { renderWithCtx } from "@/__tests__/test-utils"

describe("QuickSettings", () => {
  const base = {
    tmdbKeyInput: "abc",
    setTmdbKeyInput: vi.fn(),
    setTmdbKey: vi.fn(),
    onOpenFull: vi.fn(),
  }

  it("renders title, language list, key field and full-settings link", () => {
    renderWithCtx(<QuickSettings {...base} />)
    expect(screen.getByText("ui.quickSettingsTitle")).toBeInTheDocument()
    expect(screen.getByText("Italiano")).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()
    expect(screen.getByLabelText("ui.tmdbKey")).toHaveValue("abc")
    expect(screen.getByText("ui.quickSettingsFull")).toBeInTheDocument()
  })

  it("saves the key on Enter and shows the saved state", async () => {
    const u = userEvent.setup()
    renderWithCtx(<QuickSettings {...base} />)
    await u.type(screen.getByLabelText("ui.tmdbKey"), "{Enter}")
    expect(base.setTmdbKey).toHaveBeenCalledWith("abc")
    expect(screen.getByText("ui.saved")).toBeInTheDocument()
  })

  it("picks a language on click", async () => {
    const u = userEvent.setup()
    const pickLang = vi.fn()
    renderWithCtx(<QuickSettings {...base} />, { pickLang })
    await u.click(screen.getByText("English"))
    expect(pickLang).toHaveBeenCalledWith("en")
  })

  it("opens the full settings on link click", async () => {
    const u = userEvent.setup()
    renderWithCtx(<QuickSettings {...base} />)
    await u.click(screen.getByText("ui.quickSettingsFull"))
    expect(base.onOpenFull).toHaveBeenCalled()
  })
})
