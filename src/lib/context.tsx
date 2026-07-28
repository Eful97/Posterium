"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { SearchResult, TMDBImage, Mapping } from "./types"
import { posterUrl, titleOf, yearOf, STREAMING_PLATFORMS, getDomain } from "./utils"
import { findAccentColor, topEdgeAverage } from "./accent-color"
import { matchTMDBStudios } from "./awards"
import { setLang as setI18nLang, t } from "./i18n"
import type { EnrichedAnimeItem } from "./validation"
import { http } from "./http"
import { buildUrlPattern, buildPreviewUrl } from "./poster-url"
import { useTrending } from "./useTrending"
import { useSearch } from "./useSearch"
import { useNavigation } from "./useNavigation"
import { useMappingsStore } from "./useMappingsStore"
import { usePosterEditor, PosterEditorProvider } from "./contexts/PosterEditorContext"
import { usePosterSave } from "./usePosterSave"
import { computeLogoOffsetBounds } from "./logo-layout"
import { useOutsideDismiss } from "./useOutsideDismiss"
import type { PosteriumUserConfig } from "./config-token"
import { SearchProvider } from "./contexts/SearchContext"
import { SettingsProvider } from "./contexts/SettingsContext"
import { TranslationProvider } from "./contexts/TranslationContext"

export type ViewType = "search" | "myposters" | "edit" | "cataloghi"

export interface PosteriumCtx {
  selected: SearchResult | null
  setSelected: React.Dispatch<React.SetStateAction<SearchResult | null>>
  view: ViewType
  setView: React.Dispatch<React.SetStateAction<ViewType>>
  posters: TMDBImage[]
  loadingImages: boolean
  previewPoster: TMDBImage | null
  setPreviewPoster: React.Dispatch<React.SetStateAction<TMDBImage | null>>
  selectedLogo: TMDBImage | null
  setSelectedLogo: React.Dispatch<React.SetStateAction<TMDBImage | null>>
  logos: TMDBImage[]
  posterActivePath: string | null
  previewUrl: string
  urlPattern: string
  lang: string
  openSections: Record<string, boolean>
  toggleSection: (k: string) => void
  posterScrollRef: React.RefObject<HTMLDivElement | null>
  posterScrollInfo: { top: number; height: number }
  setPosterScrollInfo: React.Dispatch<React.SetStateAction<{ top: number; height: number }>>
  selectPoster: (img: TMDBImage) => Promise<void>
  selectLogo: (logo: TMDBImage) => Promise<void>
  removeLogo: () => Promise<void>
  logoBounds: { minX: number; maxX: number; minY: number; maxY: number }
  selectBackdrop: (img: TMDBImage) => void
  removeBackdrop: () => void
  trendRank: number | null
  mdblistMatch: { key: string; rank: number } | null
  /** Pre-resolved IMDb Top 250 membership for the current metaInfo. */
  imdbTop250: boolean
  metaInfo: { genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; first_air_date?: string; last_air_date?: string; next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons?: number; number_of_episodes?: number; awards?: string[]; nominations?: string[]; studios?: string[]; director?: string | null; keywords?: string[]; imdb_id?: string | null }
  previewId: string | null
  setPreviewId: React.Dispatch<React.SetStateAction<string | null>>
  saveConfig: () => Promise<void>
  removeMapping: (m: Mapping) => void
  mappingsMap: Map<string, Mapping>
  goHome: () => void
  navigateToPoster: (item: SearchResult, source?: string) => void
  refreshLists: () => Promise<void>
  tmdbKey: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  doSearch: (q?: string, page?: number) => Promise<void>
  loadMore: () => Promise<void>
  titleOf: (r: SearchResult) => string
  yearOf: (r: SearchResult) => string
  posterUrl: (path: string, size?: string) => string
  trending: (SearchResult & { rank: number })[]
  mdblistAnimeList: EnrichedAnimeItem[]
  streamingCharts: Record<string, import("./types").FlixPatrolChart>
  STREAMING_PLATFORMS: typeof STREAMING_PLATFORMS
  loadMappings: () => Promise<void>
  query: string
  results: SearchResult[]
  searching: boolean
  error: string | null
  setError: (v: string | null) => void
  totalResults: number
  totalPages: number
  searchPage: number
  recentSearches: string[]
  removeRecentSearch: (search: string) => void
  mappings: Mapping[]
  settingsRef: React.RefObject<HTMLDivElement | null>
  langRef: React.RefObject<HTMLDivElement | null>
  setLangOpen: React.Dispatch<React.SetStateAction<boolean>>
  langOpen: boolean
  pickLang: (l: string) => void
  settingsOpen: boolean
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>
  showLangPicker: boolean
  setShowLangPicker: React.Dispatch<React.SetStateAction<boolean>>
  t: (key: string, params?: Record<string, string | number>) => string
  tmdbKeyInput: string
  setTmdbKeyInput: React.Dispatch<React.SetStateAction<string>>
  showKey: boolean
  setShowKey: React.Dispatch<React.SetStateAction<boolean>>
  setTmdbKey: (v: string) => void
  mdblistApiKey: string
  setMdblistApiKey: (v: string) => void
  exportData: () => Promise<void>
  importData: () => void
  copyUrl: () => Promise<void>
  copied: boolean
  saveAndCopyProfileUrl: () => Promise<void>
  profileCopied: boolean
  profileId: string | null
  setProfileId: React.Dispatch<React.SetStateAction<string | null>>
  profilePassword: string
  setProfilePassword: (v: string) => void
  accentColor: string
  setAccentColor: (v: string) => void
topEdgeColor: string
  autoSaveExcludedPosters: (nextExcluded: string[], nextRotationPosters?: string[], nextPreviewPoster?: TMDBImage) => Promise<void>
  theme: "dark" | "light"
  setTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>
  uiAccent: boolean
  setUiAccent: React.Dispatch<React.SetStateAction<boolean>>
  serviceErrors: Record<string, boolean>
  setServiceErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  hasNetflixRank: boolean
}

const Ctx = createContext<PosteriumCtx | null>(null)
export const AppCtx = createContext<PosteriumCtx | null>(null)
export const EditCtx = createContext<PosteriumCtx | null>(null)

export function useAppCtx(): PosteriumCtx {
  const v = useContext(AppCtx)
  if (!v) throw new Error("useAppCtx must be inside PosteriumProvider")
  return v
}

export function useEditCtx(): PosteriumCtx {
  const v = useContext(EditCtx)
  if (!v) throw new Error("useEditCtx must be inside PosteriumProvider")
  return v
}

export function useP() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useP must be inside PosteriumProvider")
  return ctx
}

export function PosteriumProvider({ value, children }: { value: PosteriumCtx; children: React.ReactNode }) {
  return (
    <AppCtx.Provider value={value}>
      <EditCtx.Provider value={value}>
        <TranslationProvider value={value}>
          <SettingsProvider value={value}>
            <SearchProvider value={value}>
              <Ctx.Provider value={value}>{children}</Ctx.Provider>
            </SearchProvider>
          </SettingsProvider>
        </TranslationProvider>
      </EditCtx.Provider>
    </AppCtx.Provider>
  )
}

/**
 * PosteriumRoot — racchiude la creazione dello stato e la catena provider.
 * PosterEditorProvider wrappa l'esterno così usa useDefaults() in autonomia.
 * Il PosteriumProvider interno riceve tutto lo stato (inclusi editor fields
 * per backward compat via useP()).
 */
export function PosteriumRoot({ children }: { children: React.ReactNode }) {
  return (
    <PosterEditorProvider>
      <PosteriumRootInner>{children}</PosteriumRootInner>
    </PosterEditorProvider>
  )
}

function PosteriumRootInner({ children }: { children: React.ReactNode }) {
  const value = usePosterium()
  return <PosteriumProvider value={value}>{children}</PosteriumProvider>
}

export function usePosterium(): PosteriumCtx {
  const [lang, setLang] = useState("it")
  const [tmdbKey, setTmdbKeyState] = useState("")
  const [mdblistApiKey, setMdblistApiKey] = useState("")
  const [tmdbKeyInput, setTmdbKeyInput] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [uiAccent, setUiAccent] = useState(() => typeof window !== "undefined" && localStorage.getItem("posterium_ui_accent") === "true")
  useEffect(() => { localStorage.setItem("posterium_ui_accent", String(uiAccent)) }, [uiAccent])
  // Sync uiAccent toggle to <html> class
  useEffect(() => {
    document.documentElement.classList.toggle("ui-accent", uiAccent)
  }, [uiAccent])
  const keyInit = useRef(false)
  const langInit = useRef(false)

  const navigation = useNavigation()
  const trending = useTrending(tmdbKey, mdblistApiKey)
  const search = useSearch(tmdbKey, lang)
  const { mappings, mappingsMap, loadMappings, removeMapping, exportData, importData } = useMappingsStore()
  const editorCtx = usePosterEditor()
  const {
    // Badges
    globalBadges, setGlobalBadges,
    rankingBadges, setRankingBadges,
    badgeStyle, setBadgeStyle,
    rankingBadgeStyle, setRankingBadgeStyle,
    customBadge, setCustomBadge,
    networkLogo, setNetworkLogo,
    // Defaults
    defaultBadgeStyle, setDefaultBadgeStyle,
    defaultRankingBadgeStyle, setDefaultRankingBadgeStyle,
    defaultBlurEnabled, setDefaultBlurEnabled,
    defaultBlurIntensity, setDefaultBlurIntensity,
    defaultBlurFade, setDefaultBlurFade,
    defaultBlurDarkness, setDefaultBlurDarkness,
    defaultGradientHeight, setDefaultGradientHeight,
    defaultGlobalBadges, setDefaultGlobalBadges,
    defaultRankingBadges, setDefaultRankingBadges,
    defaultAutoRotateClean, setDefaultAutoRotateClean,
    defaultLogoFitEnabled, setDefaultLogoFitEnabled,
    defaultNetworkLogo, setDefaultNetworkLogo,
    loadDefaultsToState,
    // Blur
    blurEnabled, setBlurEnabled,
    blurIntensity, setBlurIntensity,
    blurFade, setBlurFade,
    blurDarkness, setBlurDarkness,
    // Gradient
    gradientHeight, setGradientHeight,
    // Logo
    logoScale, setLogoScale,
    logoOffsetX, setLogoOffsetX,
    logoOffsetY, setLogoOffsetY,
    logoDisabled, setLogoDisabled,
    // Backdrop
    backdrops, setBackdrops,
    selectedBackdrop, setSelectedBackdrop,
    backdropScale, setBackdropScale,
    backdropOffsetX, setBackdropOffsetX,
    backdropOffsetY, setBackdropOffsetY,
    // Editing UI
    editingValue, setEditingValue,
    editText, setEditText,
    // Rotation
    rotationPosters, setRotationPosters,
    autoRotateClean, setAutoRotateClean,
    excludedPosters, setExcludedPosters,
  } = editorCtx

  const [urlPattern, setUrlPattern] = useState("")
  const [copied, setCopied] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileCopied, setProfileCopied] = useState(false)
  const [profilePassword, setProfilePassword] = useState<string>("")
  const setProfilePasswordPersist = useCallback((v: string) => {
    setProfilePassword(v)
    try { localStorage.setItem("posterium_profile_password", v) } catch {}
  }, [])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [metaInfo, setMetaInfo] = useState<{ genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; first_air_date?: string; last_air_date?: string; next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons?: number; number_of_episodes?: number; awards?: string[]; nominations?: string[]; studios?: string[]; director?: string | null; keywords?: string[]; imdb_id?: string | null }>({ genres: [], voteAverage: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [trendRank, setTrendRank] = useState<number | null>(null)
  const [mdblistMatch, setMdblistMatch] = useState<{ key: string; rank: number } | null>(null)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [imdbTop250, setImdbTop250] = useState(false)
  const [accentColor, setAccentColor] = useState("#555555")
  const [topEdgeColor, setTopEdgeColor] = useState("#555555")
  const [serviceErrors, setServiceErrors] = useState<Record<string, boolean>>({})

  const [loadingImages, setLoadingImages] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const posterScrollRef = useRef<HTMLDivElement>(null)
  const [posterScrollInfo, setPosterScrollInfo] = useState({ top: 0, height: 100 })
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)


  // Appearance state (logo, backdrop, editing — owned by PosterEditorProvider via usePosterEditor())
  const hasBadges = globalBadges && metaInfo.genres.length > 0 && metaInfo.voteAverage > 0
  const hasNetflixRank = !!(trendRank || (navigation.selected && trending.mdblistAnimeList.some((a: EnrichedAnimeItem) => a.id === navigation.selected!.id)))

  // Auto-resolve IMDb Top 250 membership
  useEffect(() => {
    const imdbId = metaInfo.imdb_id
    if (!imdbId) { setImdbTop250(false); return }
    fetch(`/api/imdb-top250?imdbId=${encodeURIComponent(imdbId)}`)
      .then((r) => r.json())
      .then((d) => setImdbTop250(!!d.inTop250))
      .catch(() => setImdbTop250(false))
  }, [metaInfo.imdb_id])

  // Appearance state

  const logoBounds = useMemo(() => {
    if (!navigation.previewPoster || !navigation.selectedLogo) return { minX: -500, maxX: 500, minY: -500, maxY: 500 }
    return computeLogoOffsetBounds({
      posterW: navigation.previewPoster.width || 1000,
      posterH: navigation.previewPoster.height || 1500,
      logoW: navigation.selectedLogo.width || 1,
      logoH: navigation.selectedLogo.height || 1,
      logoScale,
      hasBadges,
    })
  }, [navigation.previewPoster, navigation.selectedLogo, logoScale, hasBadges])

  // --- Initialization ---
  useEffect(() => {
    if (keyInit.current) return
    keyInit.current = true
    const saved = localStorage.getItem("tmdb_key") || ""
    setTmdbKeyState(saved)
    setTmdbKeyInput(saved)
    const mdblistKey = localStorage.getItem("mdblist_key") || ""
    setMdblistApiKey(mdblistKey)
    const savedTheme = localStorage.getItem("posterium_theme")
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme)
    const savedProfileId = localStorage.getItem("posterium_profile_id")
    if (savedProfileId) setProfileId(savedProfileId)
    const savedProfilePassword = localStorage.getItem("posterium_profile_password")
    if (savedProfilePassword) setProfilePassword(savedProfilePassword)
  }, [])

  const setTmdbKey = (val: string) => {
    setTmdbKeyState(val)
    setTmdbKeyInput(val)
    localStorage.setItem("tmdb_key", val)
  }

  const setMdblistApiKeyFn = (val: string) => {
    setMdblistApiKey(val)
    localStorage.setItem("mdblist_key", val)
  }

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", theme === "light")
    localStorage.setItem("posterium_theme", theme)
  }, [theme])

  useEffect(() => {
    if (langInit.current) return
    langInit.current = true
    const saved = localStorage.getItem("preferred_lang")
    if (saved) {
      setLang(saved)
    } else {
      setShowLangPicker(true)
    }
  }, [])

  const pickLang = (l: string) => {
    setLang(l)
    setI18nLang(l)
    localStorage.setItem("preferred_lang", l)
    setShowLangPicker(false)
  }

  // --- Settings panels ---
  const dismissSettings = useCallback(() => setSettingsOpen(false), [])
  const ignoreMobileSettingsDismiss = useCallback(() => window.innerWidth < 768, [])
  const dismissLang = useCallback(() => setLangOpen(false), [])

  useOutsideDismiss({
    active: settingsOpen,
    ref: settingsRef,
    onDismiss: dismissSettings,
    eventName: "mousedown",
    shouldIgnore: ignoreMobileSettingsDismiss,
  })

  useOutsideDismiss({
    active: langOpen,
    ref: langRef,
    onDismiss: dismissLang,
  })

  // --- URL Pattern ---
  useEffect(() => {
    setUrlPattern(buildUrlPattern({
      globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle,
      customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo,
      tmdbKey, lang, profileId,
    }))
  }, [globalBadges, rankingBadges, networkLogo, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle, rankingBadgeStyle, tmdbKey, lang, profileId]) // eslint-disable-line react-hooks/exhaustive-deps -- customBadge intentionally excluded to avoid loop

  // Auto-sync profile configuration when profileId is active
  const lastSyncRef = useRef<string>("")
  useEffect(() => {
    if (!profileId) return
    const config = {
      globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle,
      blurEnabled, blurIntensity, blurFade, blurDarkness,
      gradientHeight, networkLogo, autoRotateClean, logoFitEnabled: defaultLogoFitEnabled,
      customBadge: customBadge || undefined,
    }
    const payloadStr = JSON.stringify({ config, profileId, tmdbKey, mdblistApiKey })
    if (lastSyncRef.current === payloadStr) return

    const timer = setTimeout(() => {
      lastSyncRef.current = payloadStr
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          profileId,
          password: profilePassword || undefined,
          apiKeys: { tmdbKey: tmdbKey || undefined, mdblistApiKey: mdblistApiKey || undefined },
        }),
      }).catch((e) => console.error("[profile] Auto-sync failed:", e))
    }, 1000)

    return () => clearTimeout(timer)
  }, [profileId, profilePassword, globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, networkLogo, autoRotateClean, defaultLogoFitEnabled, customBadge, tmdbKey, mdblistApiKey])

  // --- Preview URL ---
  const buildPreviewUrlCb = useCallback(() => {
    const url = buildPreviewUrl(
      {
        selected: navigation.selected,
        previewPoster: navigation.previewPoster,
        selectedLogo: navigation.selectedLogo,
        selectedBackdrop,
        logoScale, logoOffsetX, logoOffsetY,
        backdropScale, backdropOffsetX, backdropOffsetY,
        metaInfo, trendRank, mdblistAnimeList: trending.mdblistAnimeList,
        topEdgeColor, accentColor, lang, tmdbKey,
      },
      { globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo }
    )
    setPreviewUrl(url)
  }, [navigation.selected, navigation.previewPoster, navigation.selectedLogo, selectedBackdrop,
    logoScale, logoOffsetX, logoOffsetY, backdropScale, backdropOffsetX, backdropOffsetY,
    metaInfo, trendRank, trending.mdblistAnimeList, topEdgeColor, accentColor, lang, tmdbKey,
    globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo])

  useEffect(() => {
    if (!navigation.selected) { setPreviewUrl(""); return }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(buildPreviewUrlCb, 200)
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current) }
  }, [navigation.selected, buildPreviewUrlCb])

  useEffect(() => {
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current) }
  }, [])

  // --- Color detection ---
  useEffect(() => {
    const root = document.documentElement
    if (!navigation.previewPoster) {
      root.style.setProperty("--color-accent", "#555555")
      root.style.setProperty("--color-accent-r", "85")
      root.style.setProperty("--color-accent-g", "85")
      root.style.setProperty("--color-accent-b", "85")
      root.style.setProperty("--color-edge-r", "85")
      root.style.setProperty("--color-edge-g", "85")
      root.style.setProperty("--color-edge-b", "85")
      setAccentColor("#555555"); setTopEdgeColor("#555555"); return
    }
    const genreName = metaInfo.genres[0]?.name
    let cancelled = false
    const url = posterUrl(navigation.previewPoster.file_path, "w342") + `?cb=${Date.now()}`
    const img = new Image()
    img.crossOrigin = "anonymous"
    const setRootColors = (r: number, g: number, b: number, edgeR: number, edgeG: number, edgeB: number) => {
      const c = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      root.style.setProperty("--color-accent", c)
      root.style.setProperty("--color-accent-r", String(r))
      root.style.setProperty("--color-accent-g", String(g))
      root.style.setProperty("--color-accent-b", String(b))
      const edgeC = `#${edgeR.toString(16).padStart(2, '0')}${edgeG.toString(16).padStart(2, '0')}${edgeB.toString(16).padStart(2, '0')}`
      root.style.setProperty("--color-edge", edgeC)
      root.style.setProperty("--color-edge-r", String(edgeR))
      root.style.setProperty("--color-edge-g", String(edgeG))
      root.style.setProperty("--color-edge-b", String(edgeB))
      setAccentColor(c)
      setTopEdgeColor(edgeC)
    }
    img.onload = () => {
      if (cancelled) return
      try {
        const w = Math.min(img.naturalWidth, 342)
        const h = Math.round(w * img.naturalHeight / img.naturalWidth)
        if (!w || !h) return
        const canvas = document.createElement("canvas")
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext("2d")!
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, w, h)
        const pixels = ctx.getImageData(0, 0, w, h).data
        const result = findAccentColor(pixels, w, h, genreName || '')
        const edge = topEdgeAverage(pixels, w, h)

        setRootColors(result.r, result.g, result.b, edge.r, edge.g, edge.b)
      } catch { /* color detection is non-critical */ }
    }
    img.onerror = () => { if (!cancelled) { setRootColors(85, 85, 85, 85, 85, 85) } }
    img.src = url
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- color detection runs only when poster changes
  }, [navigation.previewPoster])

  // --- Poster image refresh ---
  useEffect(() => {
    if (!navigation.selected || !tmdbKey) return
    const itemId = navigation.selected.id
    const itemType = navigation.selected.media_type
    const fetchId = navigation.incrementFetchId()
    http<{ posters: TMDBImage[]; logos: TMDBImage[]; backdrops: TMDBImage[] }>(`/api/tmdb/${itemId}/images?type=${itemType}&languages=${lang},en,null&api_key=${tmdbKey}`, { timeout: 30000 }).then((data) => {
      if (navigation.fetchIdRef.current !== fetchId) return
      navigation.setPosters(data.posters || [])
      navigation.setLogos(data.logos || [])
      setBackdrops(data.backdrops || [])
      if (navigation.previewPoster) {
        const match = (data.posters || []).find((p: TMDBImage) => p.file_path === navigation.previewPoster!.file_path)
        if (!match) {
          const clean = data.posters?.find((p: TMDBImage) => p.iso_639_1 === null)
          const langPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === lang)
          const firstPoster = data.posters?.[0]
          if (clean) {
            const langLogo = data.logos?.find((l: TMDBImage) => l.iso_639_1 === lang)
            const itLogo = lang !== "it" ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === "it") : undefined
            const enLogo = lang !== "en" ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === "en") : undefined
            const firstLogo = data.logos?.[0]
            const autoLogo = langLogo || itLogo || enLogo || firstLogo
            if (autoLogo) {
              navigation.setPreviewPoster({ file_path: clean.file_path, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
              setGradientHeight(30)
            } else {
              const itPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "it")
              const enPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "en")
              navigation.setPreviewPoster(itPoster || enPoster || langPoster || firstPoster || navigation.previewPoster)
              setGradientHeight(15)
            }
          } else {
            navigation.setPreviewPoster(langPoster || firstPoster || navigation.previewPoster)
            setGradientHeight(15)
          }
        }
      }
      if (navigation.previewPoster?.iso_639_1 === null && navigation.selectedLogo) {
        const match = (data.logos || []).find((l: TMDBImage) => l.file_path === navigation.selectedLogo!.file_path)
        if (!match) {
          const langLogo = data.logos?.find((l: TMDBImage) => l.iso_639_1 === lang)
          const itLogo = lang !== "it" ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === "it") : undefined
          const enLogo = lang !== "en" ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === "en") : undefined
          const firstLogo = data.logos?.[0]
          navigation.setSelectedLogo(langLogo || itLogo || enLogo || firstLogo || navigation.selectedLogo)
        }
      }
    }).catch((e) => { console.error("[posterium] Poster image refresh failed:", e) })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on lang change; others set inside
  }, [lang])

  const openPosterBrowser = async (item: SearchResult) => {
    const itemId = item.id
    const itemType = item.media_type
    const fetchId = navigation.incrementFetchId()
    navigation.setSelected(item)
    navigation.setSelectedLogo(null)
    setSelectedBackdrop(null)
    navigation.setPreviewPoster(null)
    setMetaInfo({ genres: [], voteAverage: 0 })
    setLoadingImages(true)
    setOpenSections({})
    navigation.setPreviewId(`${itemType}:${itemId}`)
    navigation.setView("edit")

    // Imposta stili subito (sync) prima delle chiamate async
    // per evitare race condition: se l'utente cambia opzioni mentre
    // i dati sono in caricamento, la vecchia fetch non deve sovrascrivere
    const existing = mappingsMap.get(`${itemType}:${itemId}`)
    if (existing) {
      setBadgeStyle(existing.badgeStyle ?? defaultBadgeStyle)
      setRankingBadgeStyle(existing.rankingBadgeStyle ?? defaultRankingBadgeStyle)
      setGlobalBadges(existing.showBadges ?? true)
      setRankingBadges(existing.rankingBadges ?? true)
      setGradientHeight(existing.gradientHeight ?? defaultGradientHeight)
      setBlurIntensity(existing.blurIntensity ?? defaultBlurIntensity)
      setBlurFade(existing.blurFade ?? defaultBlurFade)
      setBlurDarkness(existing.blurDarkness ?? defaultBlurDarkness)
      setBlurEnabled(existing.blurEnabled ?? defaultBlurEnabled)
      setCustomBadge(existing.customBadge ?? null)
      setRotationPosters(existing.cleanPosters || [])
      setAutoRotateClean(existing.autoRotateClean ?? false)
      setExcludedPosters(existing.excludedPosters || [])
      setLogoDisabled(existing.logoDisabled ?? false)
      setLogoOffsetX(existing.logoOffsetX ?? 0)
      setLogoOffsetY(existing.logoOffsetY ?? 0)
      setBackdropScale(existing.backdropScale ?? 100)
      setBackdropOffsetX(existing.backdropOffsetX ?? 0)
      setBackdropOffsetY(existing.backdropOffsetY ?? 0)
    } else {
      setCustomBadge(null)
      setRotationPosters([])
      setAutoRotateClean(false)
      setExcludedPosters([])
      setLogoDisabled(false)
      setLogoOffsetX(0)
      setLogoOffsetY(0)
      setSelectedBackdrop(null)
      setBackdropScale(100)
      setBackdropOffsetX(0)
      setBackdropOffsetY(0)
    }

    try {
      const mdblistParam = mdblistApiKey ? "&mdblist_key=" + encodeURIComponent(mdblistApiKey) : ""
      const detailsUrl = `/api/tmdb/${itemId}/details?type=${itemType}&language=${lang}&api_key=${tmdbKey}${mdblistParam}`
      const [details, rankData, awardData] = await Promise.all([
        http<{ genres: { id: number; name: string }[]; voteAverage: number; voteCount: number; status: string | null; type: string | null; release_date: string | null; first_air_date: string | null; last_air_date: string | null; next_episode_to_air: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons: number | null; number_of_episodes: number | null; title: string | null; name: string | null; imdb_id: string | null; networks: { name: string }[]; production_companies: { name: string }[]; original_language: string }>(detailsUrl, { timeout: 30000 }).catch((e) => { console.error("[posterium] Details fetch failed:", e); setServiceErrors((prev) => ({ ...prev, tmdb: true })); return { genres: [] as { id: number; name: string }[], voteAverage: 0, voteCount: 0, status: null, type: null, release_date: null, first_air_date: null, last_air_date: null, next_episode_to_air: null, number_of_seasons: null, number_of_episodes: null, title: null, name: null, imdb_id: null, networks: [] as { name: string }[], production_companies: [] as { name: string }[], original_language: "en" } }),
        http<{ rank: number | null }>(`/api/trending/rank?type=${itemType}&id=${itemId}&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 15000 }).catch(() => ({ rank: null })),
        http<{ awards: string[]; nominations: string[]; studios: string[]; director: string | null; keywords: string[] }>(`/api/awards/${itemType}/${itemId}?api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 15000 }).catch(() => ({ awards: [] as string[], nominations: [] as string[], studios: [] as string[], director: null, keywords: [] as string[] })),
      ])
      const origLang = details.original_language
      const imageLangs = origLang && origLang !== lang && origLang !== "en" ? `${lang},en,null,${origLang}` : `${lang},en,null`
      const data = await http<{ posters: TMDBImage[]; logos: TMDBImage[]; backdrops: TMDBImage[] }>(`/api/tmdb/${itemId}/images?type=${itemType}&languages=${imageLangs}&api_key=${tmdbKey}`, { timeout: 30000 }).catch(() => ({ posters: [] as TMDBImage[], logos: [] as TMDBImage[], backdrops: [] as TMDBImage[] }))
      if (navigation.fetchIdRef.current !== fetchId) return
      navigation.setSelected({ ...item, imdb_id: details.imdb_id })
      navigation.setPosters(data.posters || [])
      navigation.setLogos(data.logos || [])
      setBackdrops(data.backdrops || [])
      if (details.title) navigation.setSelected((prev) => ({ ...prev!, title: details.title! }))
      if (details.name) navigation.setSelected((prev) => ({ ...prev!, name: details.name! }))
      const tmdbNetworks = itemType === "tv" ? (details.networks || []).map((n: { name: string }) => n.name) : (details.production_companies || []).map((c: { name: string }) => c.name)
      setMetaInfo({ genres: details.genres || [], voteAverage: details.voteAverage || 0, imdb_id: details.imdb_id ?? undefined, type: details.type ?? undefined, status: details.status ?? undefined, release_date: details.release_date ?? undefined, first_air_date: details.first_air_date ?? undefined, last_air_date: details.last_air_date ?? undefined, next_episode_to_air: details.next_episode_to_air ?? undefined, number_of_seasons: details.number_of_seasons ?? undefined, number_of_episodes: details.number_of_episodes ?? undefined, awards: awardData?.awards || [], nominations: awardData?.nominations || [], studios: matchTMDBStudios(tmdbNetworks).length ? matchTMDBStudios(tmdbNetworks) : (awardData?.studios || []), director: awardData?.director || null, keywords: awardData?.keywords || [] })
      setTrendRank(rankData.rank || null)
      const extImdbId = item.imdb_id || details.imdb_id
      if (extImdbId) {
        http<{ match?: { key: string; rank: number } }>(`/api/mdblist?imdb=${extImdbId}&api_key=${mdblistApiKey}`, { timeout: 15000 }).then((d) => {
          if (d?.match) {
            setMdblistMatch(d.match)
          }
        }).catch((e) => { console.error("[posterium] MDBList lookup failed:", e) })
      }
      if (!item.poster_path && data.posters?.length > 0) {
        const first = data.posters.find((p: TMDBImage) => p.iso_639_1) || data.posters[0]
        navigation.setSelected((prev) => ({ ...prev!, poster_path: first.file_path }))
      }
      const existing = mappingsMap.get(`${itemType}:${itemId}`)
      if (existing) {
        const foundPoster = (data.posters || []).find((p: TMDBImage) => p.file_path === existing.posterPath)
        navigation.setPreviewPoster(foundPoster ? { file_path: foundPoster.file_path, iso_639_1: foundPoster.iso_639_1, vote_average: 0, width: foundPoster.width, height: foundPoster.height } : { file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        let foundLogo: TMDBImage | undefined
        if (existing.logoPath) {
          foundLogo = (data.logos || []).find((l: TMDBImage) => l.file_path === existing.logoPath)
          navigation.setSelectedLogo(foundLogo ? { file_path: foundLogo.file_path, iso_639_1: existing.language, vote_average: 0, width: foundLogo.width, height: foundLogo.height } : { file_path: existing.logoPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        } else if (!existing.logoDisabled) {
          const langLogo = (data.logos || []).find((l: TMDBImage) => l.iso_639_1 === lang)
          const itLogo = lang !== "it" ? (data.logos || []).find((l: TMDBImage) => l.iso_639_1 === "it") : undefined
          const enLogo = lang !== "en" ? (data.logos || []).find((l: TMDBImage) => l.iso_639_1 === "en") : undefined
          const origLogo = details.original_language && details.original_language !== lang ? (data.logos || []).find((l: TMDBImage) => l.iso_639_1 === details.original_language) : undefined
          const firstLogo = (data.logos || [])[0]
          const autoLogo = langLogo || itLogo || enLogo || origLogo || firstLogo
          if (autoLogo && !langLogo && !itLogo && !enLogo && origLogo) {
            console.warn(`[posterium] Logo fallback to original_language "${details.original_language}" for ${itemType}/${itemId}`)
          } else if (autoLogo && !langLogo && !itLogo && !enLogo && !origLogo) {
            console.warn(`[posterium] Logo fallback to any (first available) for ${itemType}/${itemId}`)
          } else if (!autoLogo) {
            console.warn(`[posterium] No logo available for ${itemType}/${itemId}`)
          }
          if (autoLogo) {
            navigation.setSelectedLogo({ file_path: autoLogo.file_path, iso_639_1: autoLogo.iso_639_1, vote_average: 0, width: autoLogo.width, height: autoLogo.height })
            if (autoLogo.width && autoLogo.height) {
              const maxH = Math.round(1500 * 0.25)
              const effW = Math.round(maxH * autoLogo.width / autoLogo.height)
              setLogoScale(Math.min(Math.round(effW / 1000 * 100), 75))
            }
          }
        }
        setLogoScale(existing.logoScale ?? 75)
        if (existing.backdropPath && data.backdrops) {
          const foundBackdrop = data.backdrops.find((b: TMDBImage) => b.file_path === existing.backdropPath)
          setSelectedBackdrop(foundBackdrop || { file_path: existing.backdropPath, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
        }
        setTrendRank(rankData.rank ?? existing.trendRank ?? null)
        setNetworkLogo(existing.networkLogo ?? defaultNetworkLogo)
      } else {
        setLogoDisabled(false)
        setNetworkLogo(defaultNetworkLogo)
        const clean = data.posters?.find((p: TMDBImage) => p.iso_639_1 === null)
        const langPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === lang)
        const firstPoster = data.posters?.[0]
        if (clean) {
          const langLogo = data.logos?.find((l: TMDBImage) => l.iso_639_1 === lang)
          const itLogo = lang !== "it" ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === "it") : undefined
          const enLogo = lang !== "en" ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === "en") : undefined
          const origLogo = details.original_language && details.original_language !== lang ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === details.original_language) : undefined
          const firstLogo = data.logos?.[0]
          const autoLogo = langLogo || itLogo || enLogo || origLogo || firstLogo
          if (autoLogo && !langLogo && !itLogo && !enLogo && origLogo) {
            console.warn(`[posterium] Logo fallback to original_language "${details.original_language}" for ${itemType}/${itemId}`)
          } else if (autoLogo && !langLogo && !itLogo && !enLogo && !origLogo) {
            console.warn(`[posterium] Logo fallback to any (first available) for ${itemType}/${itemId}`)
          } else if (!autoLogo) {
            console.warn(`[posterium] No logo available for ${itemType}/${itemId}`)
          }
          if (autoLogo) {
            navigation.setPreviewPoster({ file_path: clean.file_path, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
            navigation.setSelectedLogo({ file_path: autoLogo.file_path, iso_639_1: autoLogo.iso_639_1, vote_average: 0, width: autoLogo.width, height: autoLogo.height })
            if (autoLogo.width && autoLogo.height) {
              const alw = autoLogo.width
              const alh = autoLogo.height
              const maxH = Math.round(1500 * 0.25)
              const effW = Math.round(maxH * alw / alh)
              setLogoScale(Math.min(Math.round(effW / 1000 * 100), 75))
            }
          } else {
            const itPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "it")
            const enPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "en")
            const origPoster = details.original_language ? data.posters?.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
            const fallbackPoster = itPoster || enPoster || origPoster || firstPoster
            if (fallbackPoster) {
              navigation.setPreviewPoster({ file_path: fallbackPoster.file_path, iso_639_1: fallbackPoster.iso_639_1, vote_average: 0, width: 0, height: 0 })
            }
          }
        } else if (langPoster) {
          navigation.setPreviewPoster({ file_path: langPoster.file_path, iso_639_1: lang, vote_average: 0, width: 0, height: 0 })
        } else {
          const origPoster = details.original_language ? data.posters?.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
          const fallbackPoster = origPoster || firstPoster
          if (fallbackPoster) {
            navigation.setPreviewPoster({ file_path: fallbackPoster.file_path, iso_639_1: fallbackPoster.iso_639_1, vote_average: 0, width: 0, height: 0 })
          }
        }
        loadDefaultsToState()
      }
    } finally {
      setLoadingImages(false)
    }
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(urlPattern)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveAndCopyProfileUrl = useCallback(async () => {
    const config: PosteriumUserConfig = {
      globalBadges,
      rankingBadges,
      badgeStyle: badgeStyle as PosteriumUserConfig["badgeStyle"],
      rankingBadgeStyle: rankingBadgeStyle as PosteriumUserConfig["rankingBadgeStyle"],
      blurEnabled,
      blurIntensity,
      blurFade,
      blurDarkness,
      gradientHeight,
      networkLogo,
      autoRotateClean,
      logoFitEnabled: defaultLogoFitEnabled,
      customBadge: customBadge || undefined,
    }
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, profileId: profileId || undefined, password: profilePassword || undefined }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const newProfileId = data.profileId as string
      setProfileId(newProfileId)
      try { localStorage.setItem("posterium_profile_id", newProfileId) } catch {}
      const url = `${getDomain()}/api/poster/:type/:id?u=${newProfileId}`
      await navigator.clipboard.writeText(url)
      setProfileCopied(true)
      setTimeout(() => setProfileCopied(false), 2000)
    } catch (e) {
      console.error("[posterium] Failed to save profile:", e)
      import("sonner").then(({ toast }) => toast.error("Errore nel salvare il profilo"))
    }
  }, [globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, networkLogo, autoRotateClean, defaultLogoFitEnabled, customBadge, profileId, profilePassword])

  const posterActivePath = navigation.previewPoster?.file_path

  const { selectPoster, selectLogo, removeLogo, selectBackdrop, removeBackdrop, saveConfig: savePosterConfig } = usePosterSave({
    selected: navigation.selected, previewPoster: navigation.previewPoster, selectedLogo: navigation.selectedLogo,
    setSelectedLogo: navigation.setSelectedLogo, setPreviewPoster: navigation.setPreviewPoster, setPreviewId: navigation.setPreviewId,
    posters: navigation.posters, metaInfo, trendRank, mdblistAnimeList: trending.mdblistAnimeList,
    mappingsMap, loadMappings, logoScale, logoOffsetX, logoOffsetY,
    selectedBackdrop, setSelectedBackdrop: setSelectedBackdrop, backdropScale, backdropOffsetX, backdropOffsetY,
    setBackdropScale, setBackdropOffsetX, setBackdropOffsetY,
    globalBadges, rankingBadges, customBadge, badgeStyle, rankingBadgeStyle,
    defaultBadgeStyle, defaultRankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight,
    rotationPosters, autoRotateClean, defaultAutoRotateClean, excludedPosters, accentColor, logoDisabled, setLogoDisabled,
    setLogoScale, setLogoOffsetX, setLogoOffsetY, networkLogo, lang, profileId,
  })

  const saveConfig = useCallback(async () => {
    await savePosterConfig()
  }, [savePosterConfig])

  const autoSaveExcludedPosters = useCallback(async (nextExcluded: string[], nextRotationPosters?: string[], nextPreviewPoster?: TMDBImage) => {
    await savePosterConfig({
      excludedPosters: nextExcluded,
      rotationPosters: nextRotationPosters ?? rotationPosters,
      previewPoster: nextPreviewPoster,
      silent: true,
    })
  }, [savePosterConfig, rotationPosters])

  return useMemo(() => ({
    selected: navigation.selected, setSelected: navigation.setSelected,
    view: navigation.view, setView: navigation.setView as React.Dispatch<React.SetStateAction<ViewType>>,
    posters: navigation.posters, loadingImages,
    previewPoster: navigation.previewPoster, setPreviewPoster: navigation.setPreviewPoster,
    selectedLogo: navigation.selectedLogo, setSelectedLogo: navigation.setSelectedLogo,
    logos: navigation.logos,
    posterActivePath: posterActivePath ?? null,
    previewUrl, urlPattern, lang,
    openSections, toggleSection: (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !(prev[key] ?? true) })),
    posterScrollRef, posterScrollInfo, setPosterScrollInfo,
    selectPoster, selectLogo, removeLogo,
    logoBounds,
    selectBackdrop, removeBackdrop,
    trendRank,
    mdblistMatch,
    imdbTop250,
    metaInfo,
    previewId: navigation.previewId, setPreviewId: navigation.setPreviewId,
    saveConfig, removeMapping, mappingsMap,
    goHome: navigation.goHome, navigateToPoster: (item: SearchResult, source?: string) => { navigation.navigateToPoster(item, source); openPosterBrowser(item) },
    refreshLists: trending.refreshLists,
    tmdbKey, setQuery: search.setQuery, doSearch: search.doSearch, loadMore: search.loadMore,
    titleOf, yearOf, posterUrl,
    trending: trending.trending, streamingCharts: trending.streamingCharts, mdblistAnimeList: trending.mdblistAnimeList,
    STREAMING_PLATFORMS, loadMappings,
    query: search.query, results: search.results, searching: search.searching, error: search.error, setError: search.setError, totalResults: search.totalResults, totalPages: search.totalPages, searchPage: search.searchPage, recentSearches: search.recentSearches, mappings,
    settingsRef, langRef,
    setLangOpen, langOpen, pickLang,
    settingsOpen, setSettingsOpen,
    showLangPicker, setShowLangPicker,
    tmdbKeyInput, setTmdbKeyInput,
    showKey, setShowKey, setTmdbKey,
    mdblistApiKey, setMdblistApiKey: setMdblistApiKeyFn,
    exportData, importData, removeRecentSearch: search.removeRecentSearch,
    copyUrl, copied, saveAndCopyProfileUrl, profileCopied, profileId, setProfileId,
    profilePassword, setProfilePassword: setProfilePasswordPersist,
    accentColor, setAccentColor,
    topEdgeColor,
    autoSaveExcludedPosters,
    theme, setTheme,
    uiAccent, setUiAccent,
    serviceErrors, setServiceErrors,
    hasNetflixRank,
    t,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- context value deps intentionally stable to prevent re-render cascades
  }), [
    navigation.selected, navigation.view, navigation.posters, loadingImages, navigation.previewPoster, navigation.selectedLogo,
    navigation.logos, posterActivePath, previewUrl, urlPattern, lang,
    openSections, posterScrollInfo, logoBounds,
    trendRank, mdblistMatch, imdbTop250, metaInfo, navigation.previewId,
    selectPoster, selectLogo, saveConfig, removeLogo,
    mappingsMap, tmdbKey, search.query, search.results, search.searching, search.totalResults, search.totalPages, search.searchPage, search.recentSearches, mappings,
    langOpen, settingsOpen, showLangPicker,
    tmdbKeyInput, showKey, copied, profileCopied, profileId,
    accentColor, setAccentColor,
    topEdgeColor, autoSaveExcludedPosters,
    trending.trending, trending.streamingCharts, trending.mdblistAnimeList,
    trending.refreshLists,
    theme, uiAccent, serviceErrors, hasNetflixRank,
  ])
}
