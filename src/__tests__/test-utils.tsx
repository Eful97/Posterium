import type { ReactNode } from "react"
import { render } from "@testing-library/react"
import { PosteriumProvider } from "@/lib/context"
import type { PosteriumCtx } from "@/lib/context"
import { PosterEditorProvider } from "@/lib/contexts/PosterEditorContext"
import { t } from "@/lib/i18n"
import { STREAMING_PLATFORMS } from "@/lib/utils"

function stubFn() {}
async function asyncStubFn() {}

export const MOCK_CTX: PosteriumCtx = {
  selected: null,
  setSelected: stubFn,
  view: "search",
  setView: stubFn,
  posters: [],
  loadingImages: false,
  previewPoster: null,
  setPreviewPoster: stubFn,
  selectedLogo: null,
  setSelectedLogo: stubFn,
  logos: [],
  posterActivePath: null,
  previewUrl: "",
  urlPattern: "",
  lang: "it",
  openSections: {},
  toggleSection: stubFn,
  posterScrollRef: { current: null },
  posterScrollInfo: { top: 0, height: 100 },
  setPosterScrollInfo: stubFn,
  selectPoster: asyncStubFn,
  selectLogo: asyncStubFn,
  removeLogo: asyncStubFn,
  logoBounds: { minX: -500, maxX: 500, minY: -500, maxY: 500 },
  selectBackdrop: stubFn,
  removeBackdrop: stubFn,
  trendRank: null,
  mdblistMatch: null,
  metaInfo: { genres: [], voteAverage: 0, awards: [], nominations: [], studios: [], director: null, imdb_id: null }, imdbTop250: false,
  previewId: null,
  setPreviewId: stubFn,
  saveConfig: asyncStubFn,
  removeMapping: stubFn,
  mappingsMap: new Map(),
  goHome: stubFn,
  navigateToPoster: stubFn,
  refreshLists: asyncStubFn,
  tmdbKey: "test-key",
  setQuery: stubFn,
  doSearch: asyncStubFn,
  loadMore: asyncStubFn,
  titleOf: (r) => r.title || r.name || "",
  yearOf: (_r) => "",
  posterUrl: (path) => `https://image.tmdb.org/t/p/w500${path}`,
  trending: [],
  mdblistAnimeList: [],
  streamingCharts: {},
  STREAMING_PLATFORMS,
  loadMappings: asyncStubFn,
  query: "",
  results: [],
  searching: false,
  error: null,
  setError: stubFn,
  totalResults: 0,
  totalPages: 0,
  searchPage: 1,
  recentSearches: [],
  removeRecentSearch: stubFn,
  mappings: [],
  settingsRef: { current: null },
  langRef: { current: null },
  setLangOpen: stubFn,
  langOpen: false,
  pickLang: stubFn,
  settingsOpen: false,
  setSettingsOpen: stubFn,
  showLangPicker: false,
  setShowLangPicker: stubFn,
  t,
  tmdbKeyInput: "",
  setTmdbKeyInput: stubFn,
  showKey: false,
  setShowKey: stubFn,
  setTmdbKey: stubFn,
  mdblistApiKey: "",
  setMdblistApiKey: stubFn,
  exportData: asyncStubFn,
  importData: stubFn,
  copyUrl: asyncStubFn,
  copied: false,
  saveAndCopyProfileUrl: asyncStubFn,
  profileCopied: false,
  profileId: null,
  setProfileId: stubFn,
  profilePassword: "",
  setProfilePassword: stubFn,
  accentColor: null,
  setAccentColor: stubFn,
  topEdgeColor: null,
  autoSaveExcludedPosters: asyncStubFn,
  theme: "dark",
  setTheme: stubFn,
  uiAccent: false,
  setUiAccent: stubFn,
  serviceErrors: {},
  setServiceErrors: stubFn,
  hasNetflixRank: false,
  sourceView: null,
}

export function createWrapper(overrides?: Partial<PosteriumCtx>) {
  const ctx = { ...MOCK_CTX, ...overrides }
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PosterEditorProvider>
        <PosteriumProvider value={ctx}>{children}</PosteriumProvider>
      </PosterEditorProvider>
    )
  }
}

export function renderWithCtx(ui: ReactNode, overrides?: Partial<PosteriumCtx>) {
  return render(ui, { wrapper: createWrapper(overrides) })
}
