import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Modal } from "@/components/ui/Modal"
import { SliderRow } from "@/components/SliderRow"

describe("Modal", () => {
  it("focuses the first focusable element and traps Tab", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} labelledBy="t">
        <h3 id="t">Title</h3>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>,
    )
    // Focus iniziale sul primo elemento interattivo
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus()
    // Tab dal primo → secondo
    await user.tab()
    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus()
    // Tab oltre l'ultimo → wrap al primo
    await user.tab()
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus()
  })

  it("closes on Escape when closeOnEscape is true", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal isOpen onClose={onClose}><button type="button">Ok</button></Modal>)
    await user.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does NOT close on Escape when closeOnEscape is false", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal isOpen onClose={onClose} closeOnEscape={false}><button type="button">Ok</button></Modal>)
    await user.keyboard("{Escape}")
    expect(onClose).not.toHaveBeenCalled()
  })

  it("renders role=dialog and aria-modal", () => {
    render(<Modal isOpen onClose={() => {}}><button type="button">Ok</button></Modal>)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true")
  })
})

describe("SliderRow reset button", () => {
  it("calls onDoubleClick via the accessible reset button", async () => {
    const user = userEvent.setup()
    const onDoubleClick = vi.fn()
    render(
      <SliderRow
        icon={<span>⚙</span>}
        label="Scale"
        value={50}
        min={0}
        max={100}
        boundsMin={0}
        boundsMax={100}
        onChange={() => {}}
        onDoubleClick={onDoubleClick}
        editingValue={null}
        editText=""
        setEditingValue={() => {}}
        setEditText={() => {}}
        editingKey="scale"
        suffix="%"
      />,
    )
    await user.click(screen.getByRole("button", { name: "Reset Scale" }))
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })
})
