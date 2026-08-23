import { describe, expect, it } from "vitest"
import { getNetworkSvgResult, renderNetworkLogoBadge } from "@/lib/network-svgs"

describe("network-svgs", () => {
  it("matches Netflix network and returns networkKey=netflix", () => {
    const res = getNetworkSvgResult("Netflix", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("netflix")
  })

  it("matches HBO and returns networkKey=hbo", () => {
    const res = getNetworkSvgResult("HBO Max", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("hbo")
  })

  it("matches Disney+ and returns networkKey=disney", () => {
    const res = getNetworkSvgResult("Walt Disney Pictures", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("disney")
  })

  it("matches Prime Video and returns networkKey=prime", () => {
    const res = getNetworkSvgResult("Amazon Prime Video", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("prime")
  })

  it("matches Apple TV+ and returns networkKey=apple", () => {
    const res = getNetworkSvgResult("Apple TV+", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("apple")
  })

  it("matches Rai network", () => {
    const rai = getNetworkSvgResult("Rai 1", 500)
    expect(rai?.networkKey).toBe("rai")
  })

  it("returns null for removed/unknown network", () => {
    const peacock = getNetworkSvgResult("Peacock", 500)
    expect(peacock).toBeNull()

    const res = getNetworkSvgResult("Unknown Indie Studio", 500)
    expect(res).toBeNull()
  })

  it("matches newly added networks", () => {
    expect(getNetworkSvgResult("AMC")?.networkKey).toBe("amc")
    expect(getNetworkSvgResult("AMC+")?.networkKey).toBe("amc")
    expect(getNetworkSvgResult("American Broadcasting Company")?.networkKey).toBe("abc")
    expect(getNetworkSvgResult("CBS")?.networkKey).toBe("cbs")
    expect(getNetworkSvgResult("FX")?.networkKey).toBe("fx")
    expect(getNetworkSvgResult("FXX")?.networkKey).toBe("fx")
    expect(getNetworkSvgResult("Hulu")?.networkKey).toBe("hulu")
    expect(getNetworkSvgResult("National Geographic")?.networkKey).toBe("natgeo")
    expect(getNetworkSvgResult("Nat Geo Wild")?.networkKey).toBe("natgeo")
    expect(getNetworkSvgResult("NBC")?.networkKey).toBe("nbc")
    expect(getNetworkSvgResult("Showtime")?.networkKey).toBe("showtime")
    expect(getNetworkSvgResult("Showtime 2")?.networkKey).toBe("showtime")
  })

  it("does NOT match word-boundary collisions for new networks", () => {
    expect(getNetworkSvgResult("Camcord Documentary")).toBeNull()
    expect(getNetworkSvgResult("X-Files Chronicles")).toBeNull()
  })

  it("matches Sky networks", () => {
    expect(getNetworkSvgResult("Sky")?.networkKey).toBe("sky")
    expect(getNetworkSvgResult("Sky Atlantic")?.networkKey).toBe("sky")
    expect(getNetworkSvgResult("Sky Italia")?.networkKey).toBe("sky")
  })

  it("does NOT match Sky for substring collisions", () => {
    expect(getNetworkSvgResult("Skydance")).toBeNull()
    expect(getNetworkSvgResult("Skydance Media")).toBeNull()
    expect(getNetworkSvgResult("Skywalker")).toBeNull()
    expect(getNetworkSvgResult("Skyline")).toBeNull()
  })

  it("does NOT match any network for unrelated names", () => {
    expect(getNetworkSvgResult("Sentimental Value")).toBeNull()
  })

  it("matches NOW as Sky (same service)", () => {
    expect(getNetworkSvgResult("NOW")?.networkKey).toBe("sky")
    expect(getNetworkSvgResult("Now TV")?.networkKey).toBe("sky")
    expect(getNetworkSvgResult("NOW Extra")?.networkKey).toBe("sky")
    // substring collisions must NOT match
    expect(getNetworkSvgResult("Snowfall")).toBeNull()
    expect(getNetworkSvgResult("Nowhere")).toBeNull()
    expect(getNetworkSvgResult("Don't Look Now")).toBeNull()
  })

  it("matches Mediaset networks", () => {
    expect(getNetworkSvgResult("Mediaset")?.networkKey).toBe("mediaset")
    expect(getNetworkSvgResult("Mediaset Infinity")?.networkKey).toBe("mediaset")
  })

  it("matches Tubi and Pluto TV", () => {
    expect(getNetworkSvgResult("Tubi")?.networkKey).toBe("tubi")
    expect(getNetworkSvgResult("Pluto TV")?.networkKey).toBe("pluto")
  })

  it("renders PNG buffers for the imported network logos", async () => {
    const cases: [string, string][] = [
      ["Sky", "sky"],
      ["NOW", "sky"], // NOW è un alias di Sky
      ["Mediaset", "mediaset"],
      ["Tubi", "tubi"],
      ["Pluto TV", "pluto"],
      ["Hulu", "hulu"],
      ["AMC", "amc"],
      ["NBC", "nbc"],
      ["Showtime", "showtime"],
    ]
    for (const [name, key] of cases) {
      const res = await renderNetworkLogoBadge(name, 500)
      expect(res, `logo for ${key}`).not.toBeNull()
      expect(res!.networkKey).toBe(key)
      expect(res!.png).toBeInstanceOf(Buffer)
      expect(res!.w).toBeGreaterThan(0)
      expect(res!.h).toBeGreaterThan(0)
    }
  })

  it("renders network PNG buffer without throwing", async () => {
    const res = await renderNetworkLogoBadge("Netflix", 500)
    expect(res).not.toBeNull()
    expect(res!.png).toBeInstanceOf(Buffer)
    expect(res!.w).toBeGreaterThan(0)
    expect(res!.h).toBeGreaterThan(0)
  })
})
