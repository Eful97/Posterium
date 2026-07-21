import { describe, expect, it } from "vitest"
import { buildStremioPosterSearchParams } from "@/lib/stremio-poster-params"
import { POSTER_URL_VERSION, RENDER_VERSION } from "@/lib/render-version"

describe("buildStremioPosterSearchParams", () => {
  it("builds the exact visual params used by Stremio poster URLs", () => {
    const params = buildStremioPosterSearchParams({
      apiKey: "tmdb-key",
      lang: "it",
      globalBadges: false,
      rankingBadges: false,
      badgeStyle: "pill",
      gradientHeight: 42,
      blurIntensity: 6,
      blurDarkness: 35,
      blurEnabled: false,
    })

    expect(params.get("api_key")).toBe("tmdb-key")
    expect(params.get("lang")).toBe("it")
    expect(params.get("badges")).toBe("0")
    expect(params.get("ranking")).toBe("0")
    expect(params.get("be")).toBe("0")
    expect(params.get("gradHeight")).toBe("42")
    expect(params.get("gradHeight")).toBe("42")
    expect(params.get("blur")).toBe("6")
    expect(params.get("bs")).toBe("pill")
  })

  it("uses production defaults when optional settings are missing", () => {
    const params = buildStremioPosterSearchParams({})

    expect(params.get("lang")).toBe("it")
    expect(params.has("badges")).toBe(false)
    expect(params.has("ranking")).toBe(false)
    expect(params.has("be")).toBe(false)
    expect(params.get("gradHeight")).toBe("30")
    expect(params.get("blur")).toBe("5")
    expect(params.get("bf")).toBe("60")
    expect(params.get("bd")).toBe("40")
    expect(params.get("bs")).toBe("shadow")
  })

  it("keeps the public Stremio poster URL version in sync with renderer changes", () => {
    expect(POSTER_URL_VERSION).toBe(RENDER_VERSION)
  })
})
