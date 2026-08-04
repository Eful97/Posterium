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
    const hulu = getNetworkSvgResult("Hulu", 500)
    expect(hulu).toBeNull()

    const peacock = getNetworkSvgResult("Peacock", 500)
    expect(peacock).toBeNull()

    const res = getNetworkSvgResult("Unknown Indie Studio", 500)
    expect(res).toBeNull()
  })

  it("matches Sky networks", () => {
    expect(getNetworkSvgResult("Sky")?.networkKey).toBe("sky")
    expect(getNetworkSvgResult("Sky Atlantic")?.networkKey).toBe("sky")
    expect(getNetworkSvgResult("Sky Italia")?.networkKey).toBe("sky")
  })

  it("matches NOW as Sky (same service)", () => {
    expect(getNetworkSvgResult("NOW")?.networkKey).toBe("sky")
    expect(getNetworkSvgResult("Now TV")?.networkKey).toBe("sky")
    // substring collisions must NOT match
    expect(getNetworkSvgResult("Snowfall")).toBeNull()
    expect(getNetworkSvgResult("Nowhere")).toBeNull()
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
