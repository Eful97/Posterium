import { describe, it, expect } from "vitest"
import { getSubGenreLabel } from "../lib/subgenres"

describe("subgenres detection", () => {
  it("detects cyberpunk for Blade Runner keywords", () => {
    const keywords = ["cyberpunk", "android", "futuristic city"]
    expect(getSubGenreLabel(keywords, "it")).toBe("🚀 Cyberpunk")
    expect(getSubGenreLabel(keywords, "en")).toBe("🚀 Cyberpunk")
  })

  it("detects slasher for Scream keywords", () => {
    const keywords = ["slasher", "serial killer", "ghostface"]
    expect(getSubGenreLabel(keywords, "it")).toBe("🔪 Slasher")
  })

  it("detects time travel for Interstellar keywords", () => {
    const keywords = ["wormhole", "time travel", "space"]
    expect(getSubGenreLabel(keywords, "it")).toBe("⏳ Viaggi nel Tempo")
  })

  it("detects whodunit for Knives Out keywords", () => {
    const keywords = ["murder mystery", "whodunit", "inheritance"]
    expect(getSubGenreLabel(keywords, "it")).toBe("🕵️ Whodunit")
  })

  it("detects zombie for The Walking Dead keywords", () => {
    const keywords = ["zombie apocalypse", "undead"]
    expect(getSubGenreLabel(keywords, "it")).toBe("🧟 Zombie")
  })

  it("returns null when no matching subgenre keywords exist", () => {
    const keywords = ["family", "school", "friendship"]
    expect(getSubGenreLabel(keywords, "it")).toBeNull()
  })
})
