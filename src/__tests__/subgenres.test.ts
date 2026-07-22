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

  it("detects space opera for The Mandalorian, not spaghetti western", () => {
    const keywords = ["bounty hunter", "affectation", "space western", "space opera", "space exploration", "quest"]
    expect(getSubGenreLabel(keywords, "it")).toBe("Space Opera")
  })

  it("detects spaghetti western for a real western with gunslinger", () => {
    const keywords = ["gunslinger", "wild west", "saloon"]
    expect(getSubGenreLabel(keywords, "it")).toBe("Spaghetti Western")
  })

  it("does not trigger spaghetti western from generic bounty hunter alone", () => {
    const keywords = ["bounty hunter", "action", "crime"]
    expect(getSubGenreLabel(keywords, "it")).toBeNull()
  })
})
