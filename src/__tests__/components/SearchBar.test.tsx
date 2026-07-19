import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchBar } from "@/components/SearchBar"
import { renderWithCtx } from "@/__tests__/test-utils"

describe("SearchBar", () => {
  it("renders with placeholder", () => {
    renderWithCtx(<SearchBar tmdbKey="test" value="" onChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByPlaceholderText("ui.searchPlaceholder")).toBeInTheDocument()
  })

  it("renders large placeholder when large is true", () => {
    renderWithCtx(<SearchBar large tmdbKey="test" value="" onChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByPlaceholderText("ui.searchPlaceholderLarge")).toBeInTheDocument()
  })

  it("has correct aria-label on input", () => {
    renderWithCtx(<SearchBar tmdbKey="test" value="" onChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-label", "ui.searchAriaLabel")
  })

  it("updates input value on typing", async () => {
    const user = userEvent.setup()
    renderWithCtx(<SearchBar tmdbKey="test" value="" onChange={() => {}} onSearch={() => {}} />)
    const input = screen.getByRole("textbox")
    await user.type(input, "Inception")
    expect(input).toHaveValue("Inception")
  })

  it("shows search button when text is entered", async () => {
    const user = userEvent.setup()
    renderWithCtx(<SearchBar tmdbKey="test" value="" onChange={() => {}} onSearch={() => {}} />)
    const input = screen.getByRole("textbox")
    await user.type(input, "In")
    expect(screen.getByLabelText("ui.searchButton")).toBeInTheDocument()
  })

  it("calls onSearch when search button is clicked", async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    renderWithCtx(<SearchBar tmdbKey="test" value="" onChange={() => {}} onSearch={onSearch} />)
    const input = screen.getByRole("textbox")
    await user.type(input, "Inception")
    await user.click(screen.getByLabelText("ui.searchButton"))
    expect(onSearch).toHaveBeenCalledWith("Inception")
  })

  it("calls onSearch on Enter key", async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    renderWithCtx(<SearchBar tmdbKey="test" value="" onChange={() => {}} onSearch={onSearch} />)
    const input = screen.getByRole("textbox")
    await user.type(input, "Inception")
    await user.keyboard("{Enter}")
    expect(onSearch).toHaveBeenCalledWith("Inception")
  })

  it("disables search button without tmdbKey", () => {
    renderWithCtx(<SearchBar tmdbKey="" value="test" onChange={() => {}} onSearch={() => {}} />)
    const buttons = screen.getAllByRole("button")
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })

  it("shows error indicator when error prop is set", () => {
    renderWithCtx(<SearchBar tmdbKey="test" value="test" onChange={() => {}} onSearch={() => {}} error="error" />)
    expect(screen.getByRole("search").querySelector(".text-red-400")).toBeInTheDocument()
  })

  it("calls onChange callback on input", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithCtx(<SearchBar tmdbKey="test" value="" onChange={onChange} onSearch={() => {}} />)
    await user.type(screen.getByRole("textbox"), "a")
    expect(onChange).toHaveBeenCalled()
  })

  it("respects controlled value prop", async () => {
    const { rerender } = renderWithCtx(<SearchBar tmdbKey="test" value="hello" onChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByRole("textbox")).toHaveValue("hello")
    rerender(<SearchBar tmdbKey="test" value="world" onChange={() => {}} onSearch={() => {}} />)
    expect(screen.getByRole("textbox")).toHaveValue("world")
  })
})
