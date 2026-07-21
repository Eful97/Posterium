import { describe, expect, it } from "vitest"
import { getNetworkSvgResult, renderNetworkLogoBadge } from "@/lib/network-svgs"

describe("network-svgs", () => {
  it("matches Netflix network and returns red N SVG", () => {
    const res = getNetworkSvgResult("Netflix", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("netflix")
    expect(res!.svg).toContain("#E50914")
    expect(res!.svg).toContain("#B81D24")
  })

  it("matches HBO and returns HBO SVG", () => {
    const res = getNetworkSvgResult("HBO Max", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("hbo")
    expect(res!.svg).toContain("HBO")
  })

  it("matches Disney+ and returns Disney SVG", () => {
    const res = getNetworkSvgResult("Walt Disney Pictures", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("disney")
    expect(res!.svg).toContain("Disney")
  })

  it("matches Prime Video and returns prime SVG", () => {
    const res = getNetworkSvgResult("Amazon Prime Video", 500)
    expect(res).not.toBeNull()
    expect(res!.networkKey).toBe("prime")
    expect(res!.svg).toContain("prime video")
  })

  it("matches Apple TV+ and returns apple SVG", () => {
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
