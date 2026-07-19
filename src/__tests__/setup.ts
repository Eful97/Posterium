import { expect, afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import * as matchers from "@testing-library/jest-dom/matchers"

expect.extend(matchers)

afterEach(() => {
  cleanup()
})

const itDict: Record<string, string> = {
  "badge.newMovie": "Nuovo film",
  "badge.newSeries": "Nuova serie",
  "badge.anime": "Anime",
  "badge.today": "Oggi",
  "badge.week": "Settimana",
  "badge.topRated": "Il più votato",
  "badge.miniseries": "Miniserie",
  "badge.returning": "Ritorna",
  "badge.bingeWorthy": "Da divorare",
  "badge.trending": "Di tendenza",
  "badge.trendingSeries": "Serie di tendenza",
  "badge.trendingAnime": "Anime di tendenza",
  "badge.director": "Di {name}",
  "badge.basedOn.novel": "Dal romanzo",
  "badge.basedOn.comic": "Dal fumetto",
  "badge.basedOn.videogame": "Dal videogioco",
  "badge.basedOn.trueStory": "Tratto da una storia vera",
  "badge.basedOn.story": "Da un racconto",
  "badge.basedOn.theater": "Dal teatro",
  "badge.basedOn.poetry": "Dalla poesia",
  "badge.basedOn.fallback": "Tratto da",
  "badge.winner": "Vincitore {name}",
  "badge.nominee": "Candidato {name}",
  "award.oscar": "Oscar",
  "award.bafta": "BAFTA",
  "award.golden_globe": "Golden Globe",
  "award.emmy": "Emmy",
  "award.david": "David",
  "award.venezia": "Venezia",
  "award.cannes": "Cannes",
  "franchise.mcu": "MCU",
  "franchise.dc_extended_universe": "DC Extended Universe",
  "franchise.star_wars": "Star Wars",
}

function mockT(key: string, params?: Record<string, string | number>): string {
  let val = itDict[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(`{${k}}`, String(v))
    }
  }
  return val
}

vi.mock("@/lib/i18n", () => ({
  t: mockT,
  createT: () => mockT,
  setLang: vi.fn(),
  getLang: () => "it",
  isPrefixedKey: (val: string) => val.startsWith("__"),
  badgeKey: (val: string) => val.startsWith("__") ? val.slice(2) : val,
  resolveLabel: (val: string) => mockT(val.startsWith("__") ? val.slice(2) : val),
  resolveLabelFor: (val: string, lang: string) => mockT(val.startsWith("__") ? val.slice(2) : val),
  isRankKey: () => null,
  BADGE_KEY_PREFIX: "__",
}))
