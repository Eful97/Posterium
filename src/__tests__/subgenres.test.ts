import { describe, it, expect } from "vitest"
import { getSubGenreLabel } from "../lib/subgenres"

describe("subgenres detection", () => {
  it("detects cyberpunk for Blade Runner keywords", () => {
    const keywords = ["cyberpunk", "android", "futuristic city"]
    expect(getSubGenreLabel(keywords, "it")).toBe("Cyberpunk")
    expect(getSubGenreLabel(keywords, "en")).toBe("Cyberpunk")
  })



  it("detects time travel for Back to the Future keywords without false cyberpunk match", () => {
    const keywords = ["time travel", "delorean", "time machine", "future"]
    expect(getSubGenreLabel(keywords, "it")).toBe("Viaggi nel Tempo")
  })

  it("detects whodunit for Knives Out keywords with Italian label", () => {
    const keywords = ["murder mystery", "whodunit", "inheritance"]
    expect(getSubGenreLabel(keywords, "it")).toBe("Giallo col Delitto")
    expect(getSubGenreLabel(keywords, "en")).toBe("Whodunit")
  })

  it("detects zombie for The Walking Dead keywords", () => {
    const keywords = ["zombie apocalypse", "undead"]
    expect(getSubGenreLabel(keywords, "it")).toBe("Film di Zombie")
  })

  it("returns null when no matching subgenre keywords exist", () => {
    const keywords = ["family", "school", "friendship"]
    expect(getSubGenreLabel(keywords, "it")).toBeNull()
  })
})
