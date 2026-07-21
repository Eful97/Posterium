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
    const mediaset = getNetworkSvgResult("Mediaset", 500)
    expect(mediaset).toBeNull()

    const hulu = getNetworkSvgResult("Hulu", 500)
    expect(hulu).toBeNull()

    const peacock = getNetworkSvgResult("Peacock", 500)
    expect(peacock).toBeNull()

    const res = getNetworkSvgResult("Unknown Indie Studio", 500)
    expect(res).toBeNull()
  })

  it("renders network PNG buffer without throwing", async () => {
    const res = await renderNetworkLogoBadge("Netflix", 500)
    expect(res).not.toBeNull()
    expect(res!.png).toBeInstanceOf(Buffer)
    expect(res!.w).toBeGreaterThan(0)
    expect(res!.h).toBeGreaterThan(0)
  })
})
