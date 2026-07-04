import { describe, it, expect } from "vitest"
import { buildPreviewUrl, buildUrlPattern } from "@/lib/poster-url"
import { POSTER_URL_VERSION } from "@/lib/render-version"

const baseBadgeParams = {
  globalBadges: true,
  rankingBadges: true,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
  customBadge: null,
  gradientHeight: 30,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  blurEnabled: true,
}

const basePosterState = {
  selected: { id: 123, media_type: "movie" as const, title: "Test Movie", poster_path: "/poster.jpg" },
  previewPoster: { file_path: "/poster.jpg", iso_639_1: "it", vote_average: 7.5, width: 500, height: 750 },
  selectedLogo: null,
  selectedBackdrop: null,
  logoScale: 75,
  logoOffsetX: 0,
  logoOffsetY: 0,
  backdropScale: 100,
  backdropOffsetX: 0,
  backdropOffsetY: 0,
  metaInfo: {
    genres: [{ id: 1, name: "Azione" }],
    voteAverage: 7.5,
  },
  trendRank: null,
  mdblistAnimeList: [],
  topEdgeColor: "#555555",
  lang: "it",
  tmdbKey: "test-key",
}

describe("buildUrlPattern", () => {
  it("contains domain and route pattern", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "key", lang: "it" })
    expect(url).toContain("/api/poster/{type}/{tmdb_id}")
  })

  it("includes api_key param", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "abc123", lang: "it" })
    expect(url).toContain("api_key=abc123")
  })

  it("includes badges=0 when globalBadges is false", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, globalBadges: false, tmdbKey: "k", lang: "it" })
    expect(url).toContain("badges=0")
  })

  it("includes ranking=0 when rankingBadges is false", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, rankingBadges: false, tmdbKey: "k", lang: "it" })
    expect(url).toContain("ranking=0")
  })

  it("includes be=0 when blurEnabled is false", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, blurEnabled: false, tmdbKey: "k", lang: "it" })
    expect(url).toContain("be=0")
  })

  it("does not include badges=0 when globalBadges is true", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, globalBadges: true, tmdbKey: "k", lang: "it" })
    expect(url).not.toContain("badges=0")
  })

  it("always includes the shared poster URL version", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "k", lang: "it" })
    expect(url).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("includes gradientHeight, blur, bf, bd, bs, rs params", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "k", lang: "it", gradientHeight: 50, blurIntensity: 8, blurFade: 70, blurDarkness: 50, badgeStyle: "pill", rankingBadgeStyle: "bar" })
    expect(url).toContain("gradHeight=50")
    expect(url).toContain("blur=8")
    expect(url).toContain("bf=70")
    expect(url).toContain("bd=50")
    expect(url).toContain("bs=pill")
    expect(url).toContain("rs=bar")
  })

  it("encodes lang param", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "k", lang: "it" })
    expect(url).toContain("lang=it")
  })
})

describe("buildPreviewUrl", () => {
  it("returns empty string when no item selected", () => {
    const url = buildPreviewUrl({ ...basePosterState, selected: null }, baseBadgeParams)
    expect(url).toBe("")
  })

  it("contains movie type and id in URL path", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("/api/poster/movie/123")
  })

  it("contains tv type for tv items", () => {
    const url = buildPreviewUrl({ ...basePosterState, selected: { ...basePosterState.selected!, media_type: "tv" } }, baseBadgeParams)
    expect(url).toContain("/api/poster/tv/123")
  })

  it("includes api_key", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("api_key=test-key")
  })

  it("includes poster param from previewPoster", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("poster=%2Fposter.jpg")
  })

  it("includes genreName from metaInfo", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("genreName=Azione")
  })

  it("includes voteAverage when > 0", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("voteAverage=7.5")
  })

  it("does not include voteAverage when 0", () => {
    const url = buildPreviewUrl({ ...basePosterState, metaInfo: { ...basePosterState.metaInfo, voteAverage: 0 } }, baseBadgeParams)
    expect(url).not.toContain("voteAverage=")
  })

  it("includes logo params when logo selected on clean poster", () => {
    const url = buildPreviewUrl({
      ...basePosterState,
      previewPoster: { file_path: "/poster.jpg", iso_639_1: null, vote_average: 7.5, width: 500, height: 750 },
      selectedLogo: { file_path: "/logo.png", iso_639_1: "it", vote_average: 1, width: 200, height: 80 },
      logoScale: 60,
      logoOffsetX: 5,
      logoOffsetY: -3,
    }, baseBadgeParams)
    expect(url).toContain("logo=%2Flogo.png")
    expect(url).toContain("scale=60")
    expect(url).toContain("ox=5")
    expect(url).toContain("oy=-3")
  })

  it("does not include logo params when poster is not clean", () => {
    const url = buildPreviewUrl({
      ...basePosterState,
      selectedLogo: { file_path: "/logo.png", iso_639_1: "it", vote_average: 1, width: 200, height: 80 },
      logoScale: 60,
      logoOffsetX: 5,
      logoOffsetY: -3,
    }, baseBadgeParams)
    expect(url).not.toContain("logo=")
  })

  it("includes backdrop params when backdrop selected", () => {
    const url = buildPreviewUrl({
      ...basePosterState,
      selectedBackdrop: { file_path: "/backdrop.jpg", iso_639_1: null, vote_average: 0, width: 1920, height: 1080 },
      backdropScale: 120,
      backdropOffsetX: 10,
      backdropOffsetY: 20,
    }, baseBadgeParams)
    expect(url).toContain("backdrop=%2Fbackdrop.jpg")
    expect(url).toContain("bscale=120")
    expect(url).toContain("box=10")
    expect(url).toContain("boy=20")
  })

  it("includes lang param", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("lang=it")
  })

  it("includes gradHeight, blur, bf, bd, bs, rs", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, gradientHeight: 50, blurIntensity: 8, blurFade: 70, blurDarkness: 50, badgeStyle: "pill", rankingBadgeStyle: "bar" })
    expect(url).toContain("gradHeight=50")
    expect(url).toContain("blur=8")
    expect(url).toContain("bf=70")
    expect(url).toContain("bd=50")
    expect(url).toContain("bs=pill")
    expect(url).toContain("rs=bar")
  })

  it("includes be=0 when blurEnabled is false", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, blurEnabled: false })
    expect(url).toContain("be=0")
  })

  it("does not include be=0 when blurEnabled is true", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, blurEnabled: true })
    expect(url).not.toContain("be=0")
  })

  it("always includes tl param", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, rankingBadges: false })
    expect(url).toMatch(/tl=[01]/)
  })

  it("includes ac param when accentColor is set", () => {
    const url = buildPreviewUrl({ ...basePosterState, accentColor: "#ff0000" }, baseBadgeParams)
    expect(url).toContain("ac=%23ff0000")
  })

  it("does not include ac param when accentColor is default", () => {
    const url = buildPreviewUrl({ ...basePosterState, accentColor: "#555555" }, baseBadgeParams)
    expect(url).not.toContain("ac=")
  })

  it("does not include badges=0 when globalBadges is true", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, globalBadges: true })
    expect(url).not.toContain("badges=0")
  })

  it("includes badges=0 when globalBadges is false", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, globalBadges: false })
    expect(url).toContain("badges=0")
  })

  it("includes ranking=0 when rankingBadges is false", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, rankingBadges: false })
    expect(url).toContain("ranking=0")
  })

  it("does not include v= cache-busting param", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).not.toMatch(/v=\d+/)
  })

  it("includes customBadge as extra param", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, customBadge: "Custom Label" })
    expect(url).toContain("extra=Custom%20Label")
  })
})
