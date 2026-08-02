import { describe, expect, it } from "vitest"
import { resolvePosterRenderConfig, clamp, type PosterRenderConfigInput } from "@/lib/poster-config"
import type { Mapping } from "@/lib/types"
import type { PosteriumUserConfig } from "@/lib/config-token"

function baseInput(overrides: Partial<PosterRenderConfigInput> = {}): PosterRenderConfigInput {
  return {
    searchParams: new URLSearchParams(),
    mapping: null,
    configOverride: null,
    sd: {},
    hasQuery: true,
    showBadges: true,
    rankingBadges: true,
    animeRank: null,
    rankingResult: null,
    finalRank: null,
    ...overrides,
  }
}

const mapping = (partial: Partial<Mapping> = {}): Mapping => ({
  tmdbId: 1, mediaType: "movie", title: "T", posterPath: "/p.jpg",
  logoPath: null, originalPosterPath: null, language: null, updatedAt: "2026-01-01",
  ...partial,
})

const config = (partial: Partial<PosteriumUserConfig> = {}): PosteriumUserConfig => ({
  globalBadges: true,
  rankingBadges: true,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
  blurEnabled: true,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  gradientHeight: 30,
  networkLogo: true,
  autoRotateClean: false,
  logoFitEnabled: false,
  ...partial,
})

describe("clamp", () => {
  it("bounds values within [min, max]", () => {
    expect(clamp(150, 5, 100)).toBe(100)
    expect(clamp(-3, 5, 100)).toBe(5)
    expect(clamp(42, 5, 100)).toBe(42)
  })
})

describe("resolvePosterRenderConfig", () => {
  it("uses defaults when nothing is provided", () => {
    const r = resolvePosterRenderConfig(baseInput())
    expect(r.badgeStyle).toBe("shadow")
    expect(r.rankingBadgeStyle).toBe("default")
    expect(r.blurEnabled).toBe(true)
    expect(r.blurHeight).toBe(30)
    expect(r.blurIntensity).toBe(5)
    expect(r.blurFade).toBe(60)
    expect(r.blurDarkness).toBe(40)
    expect(r.badgesEnabled).toBe(true)
    expect(r.rankingEnabled).toBe(true)
    expect(r.ribbonSide).toBe("left")
    expect(r.queryExtra).toBeNull()
  })

  it("query bs beats mapping, config token and server defaults", () => {
    const r = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ bs: "pill" }),
      mapping: mapping({ badgeStyle: "colored" }),
      configOverride: config({ badgeStyle: "bar" }),
      sd: { badgeStyle: "bordo" },
    }))
    expect(r.badgeStyle).toBe("pill")
  })

  it("invalid query value does not leak to the renderer (falls back to default rendering)", () => {
    // Fedele all'originale: la query invalida vince sul `||` e il renderer la
    // trattava come default — con i tipi union il confine la converte a "shadow".
    const r = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ bs: "garbage" }),
      sd: { badgeStyle: "vetro" },
    }))
    expect(r.badgeStyle).toBe("shadow")
  })

  it("auto-detect: default ranking style becomes netflix when a rank exists", () => {
    const r = resolvePosterRenderConfig(baseInput({ finalRank: 3 }))
    expect(r.rankingBadgeStyle).toBe("netflix")
  })

  it("auto-detect: explicit netflix reverts to default without a rank", () => {
    const r = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ rs: "netflix" }),
    }))
    expect(r.rankingBadgeStyle).toBe("default")
  })

  it("explicit non-default ranking style is preserved regardless of rank", () => {
    const withRank = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ rs: "colored" }),
      finalRank: 7,
    }))
    expect(withRank.rankingBadgeStyle).toBe("colored")
    const withoutRank = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ rs: "colored" }),
    }))
    expect(withoutRank.rankingBadgeStyle).toBe("colored")
  })

  it("clamps out-of-range blur/gradient query values", () => {
    const r = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ blur: "999", bf: "-5", bd: "250", gradHeight: "0" }),
    }))
    expect(r.blurIntensity).toBe(100)
    expect(r.blurFade).toBe(0)
    expect(r.blurDarkness).toBe(100)
    expect(r.blurHeight).toBe(5)
  })

  it("non-finite numeric query falls back to config/default", () => {
    const r = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ blur: "abc", gradHeight: "1e999" }),
      configOverride: config({ blurIntensity: 12, gradientHeight: 40 }),
    }))
    expect(r.blurIntensity).toBe(12)
    expect(r.blurHeight).toBe(40)
  })

  it("badges=0 and ranking=0 disable badges (query mode)", () => {
    const r = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ badges: "0", ranking: "0" }),
    }))
    expect(r.badgesEnabled).toBe(false)
    expect(r.rankingEnabled).toBe(false)
  })

  it("be=0 disables blur; blur defaults respect config token when set", () => {
    const r = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ be: "0" }),
    }))
    expect(r.blurEnabled).toBe(false)
    const r2 = resolvePosterRenderConfig(baseInput({
      configOverride: config({ blurEnabled: false, networkLogo: false }),
    }))
    expect(r2.blurEnabled).toBe(false)
    expect(r2.qNetLogo).toBe("0")
  })

  it("ribbonSide: query side=right wins, then mapping, then config token", () => {
    expect(resolvePosterRenderConfig(baseInput({ searchParams: new URLSearchParams({ side: "right" }) })).ribbonSide).toBe("right")
    expect(resolvePosterRenderConfig(baseInput({ mapping: mapping({ ribbonSide: "right" }) })).ribbonSide).toBe("right")
    expect(resolvePosterRenderConfig(baseInput({ configOverride: config({ ribbonSide: "right" }) })).ribbonSide).toBe("right")
    expect(resolvePosterRenderConfig(baseInput()).ribbonSide).toBe("left")
  })

  it("queryExtra picks up extra param or config customBadge", () => {
    expect(resolvePosterRenderConfig(baseInput({ searchParams: new URLSearchParams({ extra: "Oggi" }) })).queryExtra).toBe("Oggi")
    expect(resolvePosterRenderConfig(baseInput({ configOverride: config({ customBadge: "Cult" }) })).queryExtra).toBe("Cult")
  })

  it("logo scale/offsets: query overrides mapping", () => {
    const r = resolvePosterRenderConfig(baseInput({
      searchParams: new URLSearchParams({ scale: "120", ox: "5", oy: "-3" }),
      mapping: mapping({ logoScale: 80, logoOffsetX: 1, logoOffsetY: 2 }),
    }))
    expect(r.logoScale).toBe(120)
    expect(r.logoOffsetX).toBe(5)
    expect(r.logoOffsetY).toBe(-3)
    const r2 = resolvePosterRenderConfig(baseInput({ mapping: mapping({ logoScale: 80, logoOffsetX: 1, logoOffsetY: 2 }) }))
    expect(r2.logoScale).toBe(80)
    expect(r2.logoOffsetX).toBe(1)
    expect(r2.logoOffsetY).toBe(2)
  })
})
