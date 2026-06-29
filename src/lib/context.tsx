"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { SearchResult, TMDBImage, Mapping } from "./types"
import { posterUrl, titleOf, yearOf, api, STREAMING_PLATFORMS } from "./utils"
import { findAccentColor, topEdgeAverage } from "./accent-color"
import { getAwardBadgeLabel, getNominationBadgeLabel, matchTMDBStudios } from "./awards"
import { computeBadge, computeExtraFallback } from "./badge-priority"
import { setLang as setI18nLang, t } from "./i18n"
import type { EnrichedAnimeItem } from "./validation"
import { http } from "./http"
import { buildUrlPattern, buildPreviewUrl } from "./poster-url"
import { useTrending } from "./useTrending"
import { useSearch } from "./useSearch"
import { useNavigation } from "./useNavigation"

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
  const keyInit = useRef(false)
  const langInit = useRef(false)

  const navigation = useNavigation()
  const trending = useTrending(tmdbKey, mdblistApiKey)
  const search = useSearch(tmdbKey, lang)

  const [mappings, setMappings] = useState<Mapping[]>([])
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

  // Badge state
  const [globalBadges, setGlobalBadges] = useState(true)
  const [rankingBadges, setRankingBadges] = useState(true)
  const [customBadge, setCustomBadge] = useState<string | null>(null)
  const [gradientHeight, setGradientHeight] = useState(30)
  const [blurIntensity, setBlurIntensity] = useState(5)
  const [blurFade, setBlurFade] = useState(60)
  const [blurDarkness, setBlurDarkness] = useState(40)
  const [blurEnabled, setBlurEnabled] = useState(true)
  const [badgeStyle, setBadgeStyle] = useState("shadow")
  const [rankingBadgeStyle, setRankingBadgeStyle] = useState("default")

  // Default state
  const [defaultBadgeStyle, setDefaultBadgeStyle] = useState("shadow")
  const [defaultBlurEnabled, setDefaultBlurEnabled] = useState(true)
  const [defaultBlurIntensity, setDefaultBlurIntensity] = useState(5)
  const [defaultBlurFade, setDefaultBlurFade] = useState(60)
  const [defaultBlurDarkness, setDefaultBlurDarkness] = useState(40)
  const [defaultGradientHeight, setDefaultGradientHeight] = useState(30)
  const [defaultGlobalBadges, setDefaultGlobalBadges] = useState(true)
  const [defaultRankingBadges, setDefaultRankingBadges] = useState(true)
  const [defaultRankingBadgeStyle, setDefaultRankingBadgeStyle] = useState("default")
  const [defaultAutoRotateClean, setDefaultAutoRotateClean] = useState(false)

  const hasBadges = globalBadges && metaInfo.genres.length > 0 && metaInfo.voteAverage > 0

  const mappingsMap = useMemo(() => {
    const map = new Map<string, Mapping>()
    for (const m of mappings) {
      map.set(`${m.mediaType}:${m.tmdbId}`, m)
    }
    return map
  }, [mappings])

  const logoBounds = useMemo(() => {
    if (!navigation.previewPoster || !navigation.selectedLogo) return { minX: -500, maxX: 500, minY: -500, maxY: 500 }
    const pw = navigation.previewPoster.width || 1000
    const ph = navigation.previewPoster.height || 1500
    const lw = navigation.selectedLogo.width || 1
    const lh = navigation.selectedLogo.height || 1
    const maxLogoH = Math.round(ph * 0.25)
    let finW = Math.min(Math.round(pw * logoScale / 100), pw)
    let logoH = Math.round(lh * (finW / lw))
    if (logoH > maxLogoH) {
      const ratio = maxLogoH / logoH
      finW = Math.round(finW * ratio)
      logoH = maxLogoH
    }
    const s = ph / 1500
    const badgeOff = hasBadges ? 0 : Math.round(40 * s)
    const halfX = Math.round((pw - finW) / 2)
    const minY = Math.round(ph - logoH - ph * 0.1 + badgeOff)
    const maxY = Math.round(ph * 0.1 - badgeOff)
    if (!isFinite(Number(halfX)) || !isFinite(Number(minY)) || !isFinite(Number(maxY))) return { minX: -500, maxX: 500, minY: -500, maxY: 500 }
    return { minX: -halfX, maxX: halfX, minY: -minY, maxY }
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

  const loadDefaultsToState = useCallback(() => {
    try {
      const raw = localStorage.getItem("badgeDefaults")
      if (raw) {
        const d = JSON.parse(raw)
        setGlobalBadges(d.globalBadges ?? true)
        setRankingBadges(d.rankingBadges ?? true)
        setGradientHeight(d.gradientHeight ?? 30)
        setBlurIntensity(d.blurIntensity ?? 5)
        setBlurFade(d.blurFade ?? 60)
        setBlurDarkness(d.blurDarkness ?? 40)
        setBlurEnabled(d.blurEnabled ?? true)
        setBadgeStyle(d.badgeStyle ?? "shadow")
        setRankingBadgeStyle(d.rankingBadgeStyle ?? "default")
      } else {
        setGlobalBadges(true)
        setRankingBadges(true)
        setGradientHeight(30)
        setBlurIntensity(5)
        setBlurFade(60)
        setBlurDarkness(40)
        setBlurEnabled(true)
        setBadgeStyle("shadow")
        setRankingBadgeStyle("default")
      }
    } catch {
      setGlobalBadges(true)
      setRankingBadges(true)
      setGradientHeight(30)
      setBlurIntensity(5)
      setBlurFade(60)
      setBlurDarkness(40)
      setBlurEnabled(true)
      setBadgeStyle("shadow")
      setRankingBadgeStyle("default")
    }
  }, [])

  useEffect(() => {
    if (langInit.current) return
    langInit.current = true
    const saved = localStorage.getItem("preferred_lang")
    if (saved) {
      setLang(saved)
    } else {
      setShowLangPicker(true)
    }
    try {
      const raw = localStorage.getItem("badgeDefaults")
      if (raw) {
        const d = JSON.parse(raw)
        setDefaultGlobalBadges(d.globalBadges ?? true)
        setDefaultRankingBadges(d.rankingBadges ?? true)
        setGlobalBadges(d.globalBadges ?? true)
        setRankingBadges(d.rankingBadges ?? true)
        setDefaultBadgeStyle(d.badgeStyle ?? "shadow")
        setDefaultRankingBadgeStyle(d.rankingBadgeStyle ?? "default")
        setDefaultBlurEnabled(d.blurEnabled ?? true)
        setDefaultBlurIntensity(d.blurIntensity ?? 5)
        setDefaultBlurFade(d.blurFade ?? 60)
        setDefaultBlurDarkness(d.blurDarkness ?? 40)
        setDefaultGradientHeight(d.gradientHeight ?? 30)
        setDefaultAutoRotateClean(d.autoRotateClean ?? false)
        setGradientHeight(d.gradientHeight ?? 30)
        setBlurIntensity(d.blurIntensity ?? 5)
        setBlurFade(d.blurFade ?? 60)
        setBlurDarkness(d.blurDarkness ?? 40)
        setBlurEnabled(d.blurEnabled ?? true)
        setBadgeStyle(d.badgeStyle ?? "shadow")
        setRankingBadgeStyle(d.rankingBadgeStyle ?? "default")
      }
    } catch (e) { console.error("[posterium] Load server defaults failed:", e) }
  }, [])

  const pickLang = (l: string) => {
    setLang(l)
    setI18nLang(l)
    localStorage.setItem("preferred_lang", l)
    setShowLangPicker(false)
  }

  // --- Mappings ---
  const loadMappings = useCallback(async () => {
    try {
      const data = await api("/api/mappings")
      setMappings(data.mappings)
    } catch (e) { console.error("[posterium] Failed to load mappings:", e) }
  }, [])

  useEffect(() => { loadMappings() }, [loadMappings])

  // --- Settings panels ---
  useEffect(() => {
    if (!settingsOpen) return
    const handler = (e: MouseEvent) => {
      if (window.innerWidth < 768) return
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [settingsOpen])

  useEffect(() => {
    if (!langOpen) return
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    const timer = setTimeout(() => document.addEventListener("click", handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("click", handler)
    }
  }, [langOpen])

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
        topEdgeColor, lang, tmdbKey,
      },
      { globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled }
    )
    setPreviewUrl(url)
  }, [navigation.selected, navigation.previewPoster, navigation.selectedLogo, selectedBackdrop,
    logoScale, logoOffsetX, logoOffsetY, backdropScale, backdropOffsetX, backdropOffsetY,
    metaInfo, trendRank, trending.mdblistAnimeList, topEdgeColor, lang, tmdbKey,
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
      const [data, details, rankData, awardData] = await Promise.all([
        http<{ posters: TMDBImage[]; logos: TMDBImage[]; backdrops: TMDBImage[] }>(`/api/tmdb/${itemId}/images?type=${itemType}&languages=${lang},en,null&api_key=${tmdbKey}`, { timeout: 30000 }).catch(() => ({ posters: [] as TMDBImage[], logos: [] as TMDBImage[], backdrops: [] as TMDBImage[] })),
        http<{ genres: { id: number; name: string }[]; voteAverage: number; voteCount: number; status: string | null; type: string | null; release_date: string | null; first_air_date: string | null; last_air_date: string | null; next_episode_to_air: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons: number | null; number_of_episodes: number | null; title: string | null; name: string | null; imdb_id: string | null; networks: { name: string }[]; production_companies: { name: string }[]; original_language: string }>(`/api/tmdb/${itemId}/details?type=${itemType}&language=${lang}&api_key=${tmdbKey}${mdblistApiKey ? `&mdblist_key=${encodeURIComponent(mdblistApiKey)}` : ""}`, { timeout: 30000 }).catch(() => ({ genres: [] as { id: number; name: string }[], voteAverage: 0, voteCount: 0, status: null, type: null, release_date: null, first_air_date: null, last_air_date: null, next_episode_to_air: null, number_of_seasons: null, number_of_episodes: null, title: null, name: null, imdb_id: null, networks: [] as { name: string }[], production_companies: [] as { name: string }[], original_language: "en" })),
        http<{ rank: number | null }>(`/api/trending/rank?type=${itemType}&id=${itemId}&api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 15000 }).catch(() => ({ rank: null })),
        http<{ awards: string[]; nominations: string[]; franchise: string | null; basedOn: string | null; director: string | null }>(`/api/awards/${itemType}/${itemId}`, { timeout: 15000 }).catch(() => ({ awards: [] as string[], nominations: [] as string[], franchise: null, basedOn: null, director: null })),
      ])
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
      if (extImdbId && mdblistApiKey) {
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
        navigation.setPreviewPoster(foundPoster ? { file_path: foundPoster.file_path, iso_639_1: existing.language, vote_average: 0, width: foundPoster.width, height: foundPoster.height } : { file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        let foundLogo: TMDBImage | undefined
        if (existing.logoPath) {
          foundLogo = (data.logos || []).find((l: TMDBImage) => l.file_path === existing.logoPath)
          navigation.setSelectedLogo(foundLogo ? { file_path: foundLogo.file_path, iso_639_1: existing.language, vote_average: 0, width: foundLogo.width, height: foundLogo.height } : { file_path: existing.logoPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
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
      } else {
        setCustomBadge(null)
        setRotationPosters([])
        setAutoRotateClean(false)
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
          const firstLogo = data.logos?.[0]
          const autoLogo = langLogo || itLogo || enLogo || firstLogo
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

  const selectPoster = useCallback(async (image: TMDBImage) => {
    if (!navigation.selected) return
    navigation.setPreviewPoster(image)
    navigation.setPreviewId(`${navigation.selected.media_type}:${navigation.selected.id}`)
  }, [navigation.selected]) // eslint-disable-line react-hooks/exhaustive-deps -- navigation setter refs are stable

  const selectLogo = useCallback(async (logo: TMDBImage) => {
    navigation.setSelectedLogo(logo)
    if (logo.width && logo.height) {
      const maxH = Math.round(1500 * 0.25)
      const effW = Math.round(maxH * logo.width / logo.height)
      setLogoScale(Math.min(Math.round(effW / 1000 * 100), 75))
    } else {
      setLogoScale(75)
    }
    setLogoOffsetX(0)
    setLogoOffsetY(0)
    if (!navigation.previewPoster && navigation.selected) {
      const existing = mappingsMap.get(`${navigation.selected.media_type}:${navigation.selected.id}`)
      if (existing) {
        navigation.setPreviewPoster({ file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
      } else if (navigation.posters.length > 0) {
        navigation.setPreviewPoster(navigation.posters[0])
      }
    }
    if (navigation.selected) navigation.setPreviewId(`${navigation.selected.media_type}:${navigation.selected.id}`)
  }, [navigation.selected, navigation.previewPoster, mappingsMap, navigation.posters]) // eslint-disable-line react-hooks/exhaustive-deps -- navigation setter refs are stable

  const saveConfig = useCallback(async () => {
    if (!navigation.selected || !navigation.previewPoster) return
    const now = Date.now()
    const twoWeeks = 14 * 24 * 60 * 60 * 1000
    const isNewMovie = navigation.selected.media_type === "movie" && metaInfo.release_date ? (now - new Date(metaInfo.release_date).getTime()) < twoWeeks : false
    const isNewSeries = navigation.selected.media_type === "tv" && metaInfo.first_air_date ? (now - new Date(metaInfo.first_air_date).getTime()) < twoWeeks : false
    const award = metaInfo.awards?.length ? getAwardBadgeLabel(metaInfo.awards, t) : null
    const nomination = !award && metaInfo.nominations?.length ? getNominationBadgeLabel(metaInfo.nominations, t) : null
    const animeRankData = trending.mdblistAnimeList?.find((a: EnrichedAnimeItem) => a.id === navigation.selected!.id)
    const tvType = navigation.selected.media_type === "tv" ? metaInfo.type : null
    const tvStatus = navigation.selected.media_type === "tv" ? metaInfo.status : null
    const extra = computeExtraFallback({ mediaType: navigation.selected.media_type === "tv" ? "tv" : "movie", voteAverage: metaInfo.voteAverage, tvType, tvStatus }, t)
    const studio = metaInfo.studios?.length ? metaInfo.studios[0] : null
    const badge = computeBadge({ isNewMovie, isNewSeries, animeRank: animeRankData?.rank ?? null, trendRank, award, franchise: metaInfo.franchise || null, nomination, studio, director: metaInfo.director || null, extra }, t)
    const badgeExtra = badge?.type === "extra" ? badge.label : undefined
    const badgeRank = (!badgeExtra && rankingBadges) ? (badge?.type === "rank" ? badge.rank : trendRank || undefined) : undefined
    const badgeLabel = (!badgeExtra && animeRankData) ? t("badge.anime") : (!badgeExtra && badge?.type === "rank") ? (badge.rankLabel || t("badge.today")) : undefined
    const isClean = navigation.previewPoster.iso_639_1 === null
    const isNewMapping = !mappingsMap.has(`${navigation.selected.media_type}:${navigation.selected.id}`)
    const effectiveRotationPosters = defaultAutoRotateClean && isClean && isNewMapping
      ? navigation.posters.filter(p => p.iso_639_1 === null).map(p => p.file_path)
      : rotationPosters
    try {
      await http("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: navigation.selected.id,
          mediaType: navigation.selected.media_type,
          title: titleOf(navigation.selected),
          posterPath: navigation.previewPoster.file_path,
          logoPath: navigation.selectedLogo?.file_path || null,
          originalPosterPath: navigation.selected.poster_path,
          language: navigation.previewPoster.iso_639_1,
          logoScale, logoOffsetX, logoOffsetY,
          backdropPath: selectedBackdrop?.file_path || null,
          backdropScale, backdropOffsetX, backdropOffsetY,
          genreName: metaInfo.genres[0]?.name || null,
          voteAverage: metaInfo.voteAverage || null,
          trendRank: trendRank ?? undefined,
          trendPeriod: "day",
          accentColor: accentColor !== '#ffffff' ? accentColor : undefined,
          showBadges: globalBadges,
          rankingBadges,
          tvType: metaInfo.type || null,
          tvStatus: metaInfo.status || null,
          releaseDate: metaInfo.release_date || null,
          firstAirDate: metaInfo.first_air_date || null,
          badgeExtra,
          badgeRank,
          badgeLabel,
          customBadge,
          badgeStyle: badgeStyle !== defaultBadgeStyle ? badgeStyle : undefined,
          rankingBadgeStyle: rankingBadgeStyle !== defaultRankingBadgeStyle ? rankingBadgeStyle : undefined,
          defaultBadgeStyle,
          defaultRankingBadgeStyle,
          blurEnabled,
          blurIntensity,
          blurFade,
          blurDarkness,
          gradientHeight,
          cleanPosters: effectiveRotationPosters.length > 0 ? effectiveRotationPosters : undefined,
          cleanPosterIndex: 0,
          cleanPosterUpdatedAt: new Date().toISOString(),
          autoRotateClean: effectiveRotationPosters.length > 1 ? (defaultAutoRotateClean && isClean && isNewMapping ? true : autoRotateClean) : undefined,
        }),
      })
      navigation.setPreviewId(`${navigation.selected.media_type}:${navigation.selected.id}`)
      import("sonner").then(({ toast }) => toast(t("ui.saveSuccess")))
      loadMappings()
      fetch(`/api/poster/${navigation.selected.media_type}/${navigation.selected.id}`, { signal: AbortSignal.timeout(30000) }).catch(() => { /* poster warming is fire-and-forget */ })
    } catch {
      import("sonner").then(({ toast }) => toast(t("ui.saveError")))
    }
  }, [navigation.selected, navigation.previewPoster, navigation.selectedLogo, metaInfo, logoScale, logoOffsetX, logoOffsetY, trendRank, globalBadges, rankingBadges, trending.mdblistAnimeList, loadMappings, customBadge, badgeStyle, rankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, rotationPosters, autoRotateClean, defaultAutoRotateClean, defaultBadgeStyle, defaultRankingBadgeStyle, navigation.posters, mappingsMap, accentColor, backdropOffsetX, backdropOffsetY, backdropScale, selectedBackdrop]) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally complete to save all poster state

  const removeLogo = useCallback(async () => {
    navigation.setSelectedLogo(null)
    if (!navigation.selected) return
    const key = `${navigation.selected.media_type}:${navigation.selected.id}`
    const existing = mappingsMap.get(key)
    if (!existing) {
      import("sonner").then(({ toast }) => toast(t("ui.noMappingUpdate")))
      return
    }
    await http(`/api/mappings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: navigation.selected.id, mediaType: navigation.selected.media_type, title: titleOf(navigation.selected),
        posterPath: navigation.previewPoster?.file_path || navigation.selected.poster_path!, logoPath: null,
        originalPosterPath: navigation.selected.poster_path, language: navigation.previewPoster?.iso_639_1 || null,
        logoScale, logoOffsetX, logoOffsetY,
        genreName: metaInfo.genres[0]?.name || null,
        voteAverage: metaInfo.voteAverage || null,
        trendRank: trendRank ?? null,
      }),
    })
    import("sonner").then(({ toast }) => toast(t("ui.logoRemoved")))
    loadMappings()
    if (navigation.selected) navigation.setPreviewId(`${navigation.selected.media_type}:${navigation.selected.id}`)
  }, [navigation.selected, navigation.previewPoster, logoScale, logoOffsetX, logoOffsetY, metaInfo, trendRank, mappingsMap, loadMappings]) // eslint-disable-line react-hooks/exhaustive-deps -- navigation setter refs are stable

  const selectBackdrop = useCallback((img: TMDBImage) => {
    setSelectedBackdrop(img)
    setBackdropScale(100)
    setBackdropOffsetX(0)
    setBackdropOffsetY(0)
  }, [])

  const removeBackdrop = useCallback(() => {
    setSelectedBackdrop(null)
  }, [])

  const removeMapping = useCallback(async (m: Mapping) => {
    await http(`/api/mappings/${m.mediaType}:${m.tmdbId}`, { method: "DELETE" })
    setMappings((prev) => prev.filter((x) => !(x.tmdbId === m.tmdbId && x.mediaType === m.mediaType)))
    import("sonner").then(({ toast }) => toast(t("ui.mappingRemoved")))
  }, [])

  const exportData = async () => {
    const data = await http("/api/mappings/export")
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "posterium-mappings.json"; a.click()
    URL.revokeObjectURL(url)
  }

  const importData = () => {
    const input = document.createElement("input")
    input.type = "file"; input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        await http("/api/mappings/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings: data.mappings || data }),
        })
        loadMappings()
        import("sonner").then(({ toast }) => toast(t("ui.importSuccess", { count: data.mappings?.length || data.length })))
      } catch {
        import("sonner").then(({ toast }) => toast(t("ui.importError")))
      }
    }
    input.click()
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(urlPattern)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const posterActivePath = navigation.previewPoster?.file_path

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
    query: search.query, results: search.results, searching: search.searching, totalResults: search.totalResults, totalPages: search.totalPages, searchPage: search.searchPage, recentSearches: search.recentSearches, mappings,
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
    defaultGlobalBadges, defaultRankingBadges, defaultAutoRotateClean,
    trendRank, mdblistMatch, metaInfo, navigation.previewId,
    selectPoster, selectLogo, saveConfig, removeLogo,
    mappingsMap, tmdbKey, search.query, search.results, search.searching, search.totalResults, search.totalPages, search.searchPage, search.recentSearches, mappings,
    langOpen, settingsOpen, showLangPicker,
    tmdbKeyInput, showKey, copied,
    accentColor,
    topEdgeColor, rotationPosters, autoRotateClean,
    trending.trending, trending.streamingCharts, trending.mdblistAnimeList,
    trending.refreshLists,
  ])
}
