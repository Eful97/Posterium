import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Mapping } from "@/lib/types"

const originalDataDir = process.env.POSTERIUM_DATA_DIR
let tempDir: string | undefined

afterEach(async () => {
  if (originalDataDir === undefined) {
    delete process.env.POSTERIUM_DATA_DIR
  } else {
    process.env.POSTERIUM_DATA_DIR = originalDataDir
  }
  vi.resetModules()
  if (tempDir) await fsp.rm(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

describe("file mapping store", () => {
  it("reloads mappings written by another server worker", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "posterium-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    vi.resetModules()
    const store = await import("@/lib/store")
    expect(await store.getAll()).toEqual([])

    const mapping: Mapping = {
      tmdbId: 42,
      mediaType: "movie",
      title: "Persisted Worker Mapping",
      posterPath: "/persisted.jpg",
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: "2026-07-10T00:00:00.000Z",
    }
    await fsp.writeFile(path.join(tempDir, "mappings.json"), JSON.stringify({ "movie:42": mapping }))

    expect(await store.getAll()).toEqual([mapping])
  })

  it("handles concurrent upserts without losing writes", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "posterium-concurrent-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    vi.resetModules()
    const store = await import("@/lib/store")

    const makeM = (id: number, title: string): Mapping => ({
      tmdbId: id,
      mediaType: "movie",
      title,
      posterPath: `/p${id}.jpg`,
      logoPath: null,
      originalPosterPath: null,
      language: "it",
      updatedAt: new Date().toISOString(),
    })

    await Promise.all([
      store.upsert(makeM(1, "Movie A")),
      store.upsert(makeM(2, "Movie B")),
    ])

    const all = await store.getAll()
    expect(all).toHaveLength(2)
    const titles = all.map((m) => m.title).sort()
    expect(titles).toEqual(["Movie A", "Movie B"])
  })
})
