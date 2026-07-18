"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { SearchResult, TMDBImage, Mapping } from "./types"
import { posterUrl, titleOf, yearOf, STREAMING_PLATFORMS } from "./utils"
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
import { useDefaults } from "./useDefaults"
import { usePosterSave } from "./usePosterSave"
import { computeLogoOffsetBounds } from "./logo-layout"
import { useOutsideDismiss } from "./useOutsideDismiss"

export interface PosteriumCtx {
  selected: SearchResult | null
  setSelected: React.Dispatch<React.SetStateAction<SearchResult | null>>
  view: string
  setView: React.Dispatch<React.SetStateAction<string>>
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
  logoScale: number
  setLogoScale: React.Dispatch<React.SetStateAction<number>>
  logoOffsetX: number
  setLogoOffsetX: React.Dispatch<React.SetStateAction<number>>
  logoOffsetY: number
  setLogoOffsetY: React.Dispatch<React.SetStateAction<number>>
  backdrops: TMDBImage[]
  selectedBackdrop: TMDBImage | null
  setSelectedBackdrop: React.Dispatch<React.SetStateAction<TMDBImage | null>>
  backdropScale: number
  setBackdropScale: React.Dispatch<React.SetStateAction<number>>
  backdropOffsetX: number
  setBackdropOffsetX: React.Dispatch<React.SetStateAction<number>>
  backdropOffsetY: number
  setBackdropOffsetY: React.Dispatch<React.SetStateAction<number>>
  selectBackdrop: (img: TMDBImage) => void
  removeBackdrop: () => void
  editingValue: string | null
  setEditingValue: React.Dispatch<React.SetStateAction<string | null>>
  editText: string
  setEditText: React.Dispatch<React.SetStateAction<string>>
  globalBadges: boolean
  setGlobalBadges: React.Dispatch<React.SetStateAction<boolean>>
  rankingBadges: boolean
  setRankingBadges: React.Dispatch<React.SetStateAction<boolean>>
  customBadge: string | null
  setCustomBadge: React.Dispatch<React.SetStateAction<string | null>>
  gradientHeight: number
  setGradientHeight: React.Dispatch<React.SetStateAction<number>>
  blurIntensity: number
  setBlurIntensity: React.Dispatch<React.SetStateAction<number>>
  blurFade: number
  setBlurFade: React.Dispatch<React.SetStateAction<number>>
  blurDarkness: number
  setBlurDarkness: React.Dispatch<React.SetStateAction<number>>
  blurEnabled: boolean
  setBlurEnabled: React.Dispatch<React.SetStateAction<boolean>>
  badgeStyle: string
  setBadgeStyle: React.Dispatch<React.SetStateAction<string>>
  rankingBadgeStyle: string
  setRankingBadgeStyle: React.Dispatch<React.SetStateAction<string>>
  defaultBadgeStyle: string
  setDefaultBadgeStyle: React.Dispatch<React.SetStateAction<string>>
  defaultRankingBadgeStyle: string
  setDefaultRankingBadgeStyle: React.Dispatch<React.SetStateAction<string>>
  defaultBlurEnabled: boolean
  setDefaultBlurEnabled: React.Dispatch<React.SetStateAction<boolean>>
  defaultBlurIntensity: number
  setDefaultBlurIntensity: React.Dispatch<React.SetStateAction<number>>
  defaultBlurFade: number
  setDefaultBlurFade: React.Dispatch<React.SetStateAction<number>>
  defaultBlurDarkness: number
  setDefaultBlurDarkness: React.Dispatch<React.SetStateAction<number>>
  defaultGradientHeight: number
  setDefaultGradientHeight: React.Dispatch<React.SetStateAction<number>>
  defaultGlobalBadges: boolean
  setDefaultGlobalBadges: React.Dispatch<React.SetStateAction<boolean>>
  defaultRankingBadges: boolean
  setDefaultRankingBadges: React.Dispatch<React.SetStateAction<boolean>>
  defaultAutoRotateClean: boolean
  setDefaultAutoRotateClean: React.Dispatch<React.SetStateAction<boolean>>
  defaultLogoFitEnabled: boolean
  setDefaultLogoFitEnabled: React.Dispatch<React.SetStateAction<boolean>>
  trendRank: number | null
  mdblistMatch: { key: string; rank: number } | null
  metaInfo: { genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; first_air_date?: string; last_air_date?: string; next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons?: number; number_of_episodes?: number; awards?: string[]; nominations?: string[]; studios?: string[]; franchise?: string | null; basedOn?: string | null; director?: string | null }
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
  accentColor: string
topEdgeColor: string
  rotationPosters: string[]
  setRotationPosters: React.Dispatch<React.SetStateAction<string[]>>
  autoRotateClean: boolean
  setAutoRotateClean: React.Dispatch<React.SetStateAction<boolean>>
  excludedPosters: string[]
  setExcludedPosters: React.Dispatch<React.SetStateAction<string[]>>
  logoDisabled: boolean
  setLogoDisabled: React.Dispatch<React.SetStateAction<boolean>>
  autoSaveExcludedPosters: (nextExcluded: string[], nextRotationPosters?: string[], nextPreviewPoster?: TMDBImage) => Promise<void>
  theme: "dark" | "light"
  setTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>
}

const Ctx = createContext<PosteriumCtx | null>(null)

export function useP() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useP must be inside PosteriumProvider")
  return ctx
}

export function PosteriumProvider({ value, children }: { value: PosteriumCtx; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePosterium(): PosteriumCtx {
  const [lang, setLang] = useState("it")
  const [tmdbKey, setTmdbKeyState] = useState("")
  const [mdblistApiKey, setMdblistApiKey] = useState("")
  const [tmdbKeyInput, setTmdbKeyInput] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const keyInit = useRef(false)
  const langInit = useRef(false)

  const navigation = useNavigation()
  const trending = useTrending(tmdbKey, mdblistApiKey)
  const search = useSearch(tmdbKey, lang)
  const { mappings, mappingsMap, loadMappings, removeMapping, exportData, importData } = useMappingsStore()
  const defaults = useDefaults()

  const [urlPattern, setUrlPattern] = useState("")
  const [copied, setCopied] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [metaInfo, setMetaInfo] = useState<{ genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; first_air_date?: string; last_air_date?: string; next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons?: number; number_of_episodes?: number; awards?: string[]; nominations?: string[]; studios?: string[]; franchise?: string | null; basedOn?: string | null; director?: string | null }>({ genres: [], voteAverage: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [trendRank, setTrendRank] = useState<number | null>(null)
  const [mdblistMatch, setMdblistMatch] = useState<{ key: string; rank: number } | null>(null)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [accentColor, setAccentColor] = useState("#555555")
  const [topEdgeColor, setTopEdgeColor] = useState("#555555")
  const [rotationPosters, setRotationPosters] = useState<string[]>([])
  const [autoRotateClean, setAutoRotateClean] = useState(false)
  const [excludedPosters, setExcludedPosters] = useState<string[]>([])
  const [logoDisabled, setLogoDisabled] = useState(false)

  const [loadingImages, setLoadingImages] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const posterScrollRef = useRef<HTMLDivElement>(null)
  const [posterScrollInfo, setPosterScrollInfo] = useState({ top: 0, height: 100 })
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Appearance state
  const [logoScale, setLogoScale] = useState(75)
  const [logoOffsetX, setLogoOffsetX] = useState(0)
  const [logoOffsetY, setLogoOffsetY] = useState(0)
  const [backdrops, setBackdrops] = useState<TMDBImage[]>([])
  const [selectedBackdrop, setSelectedBackdrop] = useState<TMDBImage | null>(null)
  const [backdropScale, setBackdropScale] = useState(100)
  const [backdropOffsetX, setBackdropOffsetX] = useState(0)
  const [backdropOffsetY, setBackdropOffsetY] = useState(0)
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // Badge state (delegated to useDefaults)
  const { globalBadges, rankingBadges, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle, rankingBadgeStyle, defaultBadgeStyle, defaultRankingBadgeStyle, defaultBlurEnabled, defaultBlurIntensity, defaultBlurFade, defaultBlurDarkness, defaultGradientHeight, defaultGlobalBadges, defaultRankingBadges, defaultAutoRotateClean, defaultLogoFitEnabled, loadDefaultsToState } = defaults
  const [customBadge, setCustomBadge] = useState<string | null>(null)
  const setGlobalBadges = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(globalBadges) : v; defaults.update({ globalBadges: next }) }
  const setRankingBadges = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(rankingBadges) : v; defaults.update({ rankingBadges: next }) }
  const setGradientHeight = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(gradientHeight) : v; defaults.update({ gradientHeight: next }) }
  const setBlurIntensity = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(blurIntensity) : v; defaults.update({ blurIntensity: next }) }
  const setBlurFade = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(blurFade) : v; defaults.update({ blurFade: next }) }
  const setBlurDarkness = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(blurDarkness) : v; defaults.update({ blurDarkness: next }) }
  const setBlurEnabled = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(blurEnabled) : v; defaults.update({ blurEnabled: next }) }
  const setBadgeStyle = (v: string | ((prev: string) => string)) => { const next = typeof v === "function" ? v(badgeStyle) : v; defaults.update({ badgeStyle: next }) }
  const setRankingBadgeStyle = (v: string | ((prev: string) => string)) => { const next = typeof v === "function" ? v(rankingBadgeStyle) : v; defaults.update({ rankingBadgeStyle: next }) }
  const setDefaultBadgeStyle = (v: string | ((prev: string) => string)) => { const next = typeof v === "function" ? v(defaultBadgeStyle) : v; defaults.update({ defaultBadgeStyle: next }) }
  const setDefaultRankingBadgeStyle = (v: string | ((prev: string) => string)) => { const next = typeof v === "function" ? v(defaultRankingBadgeStyle) : v; defaults.update({ defaultRankingBadgeStyle: next }) }
  const setDefaultBlurEnabled = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultBlurEnabled) : v; defaults.update({ defaultBlurEnabled: next }) }
  const setDefaultBlurIntensity = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(defaultBlurIntensity) : v; defaults.update({ defaultBlurIntensity: next }) }
  const setDefaultBlurFade = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(defaultBlurFade) : v; defaults.update({ defaultBlurFade: next }) }
  const setDefaultBlurDarkness = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(defaultBlurDarkness) : v; defaults.update({ defaultBlurDarkness: next }) }
  const setDefaultGradientHeight = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(defaultGradientHeight) : v; defaults.update({ defaultGradientHeight: next }) }
  const setDefaultGlobalBadges = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultGlobalBadges) : v; defaults.update({ defaultGlobalBadges: next }) }
  const setDefaultRankingBadges = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultRankingBadges) : v; defaults.update({ defaultRankingBadges: next }) }
  const setDefaultAutoRotateClean = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultAutoRotateClean) : v; defaults.update({ defaultAutoRotateClean: next }) }
  const setDefaultLogoFitEnabled = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultLogoFitEnabled) : v; defaults.update({ defaultLogoFitEnabled: next }) }

  const hasBadges = globalBadges && metaInfo.genres.length > 0 && metaInfo.voteAverage > 0

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
      customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled,
      tmdbKey, lang,
    }))
  }, [globalBadges, rankingBadges, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle, rankingBadgeStyle, tmdbKey, lang]) // eslint-disable-line react-hooks/exhaustive-deps -- customBadge intentionally excluded to avoid loop

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
      { globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled }
    )
    setPreviewUrl(url)
  }, [navigation.selected, navigation.previewPoster, navigation.selectedLogo, selectedBackdrop,
    logoScale, logoOffsetX, logoOffsetY, backdropScale, backdropOffsetX, backdropOffsetY,
    metaInfo, trendRank, trending.mdblistAnimeList, topEdgeColor, accentColor, lang, tmdbKey,
    globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled])

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
    setLoadingImages(true)
    setOpenSections({})
    navigation.setPreviewId(`${itemType}:${itemId}`)
    navigation.setView("edit")
    try {
      const [details, rankData, awardData] = await Promise.all([
        http<{ genres: { id: number; name: string }[]; voteAverage: number; voteCount: number; status: string | null; type: string | null; release_date: string | null; first_air_date: string | null; last_air_date: string | null; next_episode_to_air: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons: number | null; number_of_episodes: number | null; title: string | null; name: string | null; imdb_id: string | null; networks: { name: string }[]; production_companies: { name: string }[]; original_language: string }>(`/api/tmdb/${itemId}/details?type=${itemType}&language=${lang}&api_key=${tmdbKey}${mdblistApiKey ? `&mdblist_key=${encodeURIComponent(mdblistApiKey)}` : ""}`, { timeout: 30000 }).catch(() => ({ genres: [] as { id: number; name: string }[], voteAverage: 0, voteCount: 0, status: null, type: null, release_date: null, first_air_date: null, last_air_date: null, next_episode_to_air: null, number_of_seasons: null, number_of_episodes: null, title: null, name: null, imdb_id: null, networks: [] as { name: string }[], production_companies: [] as { name: string }[], original_language: "en" })),
        http<{ rank: number | null }>(`/api/trending/rank?type=${itemType}&id=${itemId}&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 15000 }).catch(() => ({ rank: null })),
        http<{ awards: string[]; nominations: string[]; franchise: string | null; basedOn: string | null; director: string | null }>(`/api/awards/${itemType}/${itemId}`, { timeout: 15000 }).catch(() => ({ awards: [] as string[], nominations: [] as string[], franchise: null, basedOn: null, director: null })),
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
      setMetaInfo({ genres: details.genres || [], voteAverage: details.voteAverage || 0, type: details.type ?? undefined, status: details.status ?? undefined, release_date: details.release_date ?? undefined, first_air_date: details.first_air_date ?? undefined, last_air_date: details.last_air_date ?? undefined, next_episode_to_air: details.next_episode_to_air ?? undefined, number_of_seasons: details.number_of_seasons ?? undefined, number_of_episodes: details.number_of_episodes ?? undefined, awards: awardData?.awards || [], nominations: awardData?.nominations || [], studios: matchTMDBStudios(tmdbNetworks), franchise: awardData?.franchise || null, basedOn: awardData?.basedOn || null, director: awardData?.director || null })
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
        setLogoOffsetX(existing.logoOffsetX ?? 0)
        setLogoOffsetY(existing.logoOffsetY ?? 0)
        if (existing.backdropPath) {
          const foundBackdrop = (data.backdrops || []).find((b: TMDBImage) => b.file_path === existing.backdropPath)
          setSelectedBackdrop(foundBackdrop || { file_path: existing.backdropPath, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
          setBackdropScale(existing.backdropScale ?? 100)
          setBackdropOffsetX(existing.backdropOffsetX ?? 0)
          setBackdropOffsetY(existing.backdropOffsetY ?? 0)
        }
        setCustomBadge(existing.customBadge ?? null)
        setTrendRank(rankData.rank ?? existing.trendRank ?? null)
        setGlobalBadges(existing.showBadges ?? true)
        setRankingBadges(existing.rankingBadges ?? true)
        setGradientHeight(existing.gradientHeight ?? defaultGradientHeight)
        setBlurIntensity(existing.blurIntensity ?? defaultBlurIntensity)
        setBlurFade(existing.blurFade ?? defaultBlurFade)
        setBlurDarkness(existing.blurDarkness ?? defaultBlurDarkness)
        setBlurEnabled(existing.blurEnabled ?? defaultBlurEnabled)
        setBadgeStyle(existing.badgeStyle ?? defaultBadgeStyle)
        setRankingBadgeStyle(existing.rankingBadgeStyle ?? defaultRankingBadgeStyle)
        setRotationPosters(existing.cleanPosters || [])
        setAutoRotateClean(existing.autoRotateClean ?? false)
        setExcludedPosters(existing.excludedPosters || [])
        setLogoDisabled(existing.logoDisabled ?? false)
      } else {
        setCustomBadge(null)
        setRotationPosters([])
        setAutoRotateClean(false)
        setExcludedPosters([])
        setLogoDisabled(false)
        setLogoScale(75)
        setLogoOffsetX(0)
        setLogoOffsetY(0)
        setSelectedBackdrop(null)
        setBackdropScale(100)
        setBackdropOffsetX(0)
        setBackdropOffsetY(0)
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
    setLogoScale, setLogoOffsetX, setLogoOffsetY, lang,
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
    view: navigation.view, setView: navigation.setView as React.Dispatch<React.SetStateAction<string>>,
    posters: navigation.posters, loadingImages,
    previewPoster: navigation.previewPoster, setPreviewPoster: navigation.setPreviewPoster,
    selectedLogo: navigation.selectedLogo, setSelectedLogo: navigation.setSelectedLogo,
    logos: navigation.logos,
    posterActivePath: posterActivePath ?? null,
    previewUrl, urlPattern, lang,
    openSections, toggleSection: (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !(prev[key] ?? true) })),
    posterScrollRef, posterScrollInfo, setPosterScrollInfo,
    selectPoster, selectLogo, removeLogo,
    logoBounds, logoScale, setLogoScale,
    logoOffsetX, setLogoOffsetX, logoOffsetY, setLogoOffsetY,
    backdrops, selectedBackdrop, setSelectedBackdrop,
    backdropScale, setBackdropScale,
    backdropOffsetX, setBackdropOffsetX,
    backdropOffsetY, setBackdropOffsetY,
    selectBackdrop, removeBackdrop,
    editingValue, setEditingValue, editText, setEditText,
    globalBadges, setGlobalBadges,
    rankingBadges, setRankingBadges,
    customBadge, setCustomBadge,
    gradientHeight, setGradientHeight,
    blurIntensity, setBlurIntensity,
    blurFade, setBlurFade,
    blurDarkness, setBlurDarkness,
    blurEnabled, setBlurEnabled,
    badgeStyle, setBadgeStyle,
    rankingBadgeStyle, setRankingBadgeStyle,
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
    trendRank,
    mdblistMatch,
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
    copyUrl, copied,
    accentColor,
    topEdgeColor,
    rotationPosters, setRotationPosters,
    autoRotateClean, setAutoRotateClean,
    excludedPosters, setExcludedPosters,
    logoDisabled, setLogoDisabled,
    autoSaveExcludedPosters,
    theme, setTheme,
    t,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- context value deps intentionally stable to prevent re-render cascades
  }), [
    navigation.selected, navigation.view, navigation.posters, loadingImages, navigation.previewPoster, navigation.selectedLogo,
    navigation.logos, posterActivePath, previewUrl, urlPattern, lang,
    openSections, posterScrollInfo, logoBounds, logoScale,
    logoOffsetX, logoOffsetY, editingValue, editText,
    globalBadges, rankingBadges, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle,
    rankingBadgeStyle,
    defaultBadgeStyle, defaultRankingBadgeStyle, defaultBlurEnabled, defaultBlurIntensity, defaultBlurFade, defaultBlurDarkness, defaultGradientHeight,
    defaultGlobalBadges, defaultRankingBadges, defaultAutoRotateClean, defaultLogoFitEnabled,
    trendRank, mdblistMatch, metaInfo, navigation.previewId,
    selectPoster, selectLogo, saveConfig, removeLogo,
    mappingsMap, tmdbKey, search.query, search.results, search.searching, search.totalResults, search.totalPages, search.searchPage, search.recentSearches, mappings,
    langOpen, settingsOpen, showLangPicker,
    tmdbKeyInput, showKey, copied,
    accentColor,
    topEdgeColor, rotationPosters, autoRotateClean, excludedPosters, logoDisabled, setLogoDisabled, autoSaveExcludedPosters,
    trending.trending, trending.streamingCharts, trending.mdblistAnimeList,
    trending.refreshLists,
    theme,
  ])
}
