import { afterEach, describe, expect, it, vi } from "vitest"
import { copyText } from "@/lib/clipboard"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("copyText", () => {
  it("uses the async clipboard API when available", async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    expect(await copyText("hello")).toBe(true)
    expect(writeText).toHaveBeenCalledWith("hello")
  })

  it("falls back to execCommand outside secure contexts", async () => {
    vi.stubGlobal("navigator", {})
    const execCommand = vi.fn(() => true);
    (document as unknown as Record<string, unknown>).execCommand = execCommand
    expect(await copyText("http://192.168.1.10:8080/manifest.json")).toBe(true)
    expect(execCommand).toHaveBeenCalledWith("copy")
  })

  it("returns false when every method fails", async () => {
    vi.stubGlobal("navigator", {});
    (document as unknown as Record<string, unknown>).execCommand = vi.fn(() => { throw new Error("denied") })
    expect(await copyText("x")).toBe(false)
  })
})
