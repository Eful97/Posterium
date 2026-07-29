import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ErrorBoundary } from "@/components/ErrorBoundary"

// Sopprime i console.error di React per errori catturati da ErrorBoundary
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

const Thrower = ({ message }: { message?: string }) => {
  throw new Error(message || "test error")
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>hello world</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText("hello world")).toBeTruthy()
  })

  it("renders default fallback UI on error", () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Qualcosa è andato storto")).toBeTruthy()
    expect(screen.getByText("test error")).toBeTruthy()
  })

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <Thrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Custom Error UI")).toBeTruthy()
  })

  it("renders custom title and message", () => {
    render(
      <ErrorBoundary title="Custom Title" message="Custom Message">
        <Thrower message="internal error" />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Custom Title")).toBeTruthy()
    expect(screen.getByText("Custom Message")).toBeTruthy()
  })

  it("resets error state on retry button click", () => {
    let shouldThrow = true
    const Flaky = () => {
      if (shouldThrow) throw new Error("fail")
      return <div>recovered</div>
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )

    expect(screen.getByText("Qualcosa è andato storto")).toBeTruthy()

    // Disabilita l'errore e clicca "Riprova"
    shouldThrow = false
    fireEvent.click(screen.getByText("Riprova"))

    expect(screen.getByText("recovered")).toBeTruthy()
  })

  it("renders custom retry label", () => {
    render(
      <ErrorBoundary retryLabel="Ricarica">
        <Thrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Ricarica")).toBeTruthy()
  })
})
