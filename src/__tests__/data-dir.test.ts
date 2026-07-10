import { afterEach, describe, expect, it, vi } from "vitest"

const originalDataDir = process.env.POSTERIUM_DATA_DIR

afterEach(() => {
  if (originalDataDir === undefined) {
    delete process.env.POSTERIUM_DATA_DIR
  } else {
    process.env.POSTERIUM_DATA_DIR = originalDataDir
  }
  vi.resetModules()
})

describe("DATA_DIR", () => {
  it("uses POSTERIUM_DATA_DIR when a persistent volume is configured", async () => {
    process.env.POSTERIUM_DATA_DIR = "/data"
    vi.resetModules()

    const { DATA_DIR } = await import("@/lib/data-dir")

    expect(DATA_DIR).toBe("/data")
  })
})
