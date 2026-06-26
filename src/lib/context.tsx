"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { SearchResult, TMDBImage, Mapping, FlixPatrolChart } from "./types"
import { getDomain, posterUrl, titleOf, yearOf, api, STREAMING_PLATFORMS } from "./utils"
import { findAccentColor, topEdgeAverage } from "./accent-color"
import { getAwardBadgeLabel, getNominationBadgeLabel, matchTMDBStudios } from "./awards"
import { computeBadge, computeExtraFallback } from "./badge-priority"
import { setLang as setI18nLang, getLang, t, resolveLabel, isRankKey, isPrefixedKey, badgeKey } from "./i18n"
import type { EnrichedAnimeItem } from "./validation"

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
  streamingCharts: Record<string, FlixPatrolChart>
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
  toastRef: React.RefObject<HTMLDivElement | null>
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
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [searchPage, setSearchPage] = useState(1)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("recent_searches") || "[]") } catch { return [] }
  })
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [posters, setPosters] = useState<TMDBImage[]>([])
  const [logos, setLogos] = useState<TMDBImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [selectedLogo, setSelectedLogo] = useState<TMDBImage | null>(null)
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [lang, setLang] = useState("it")
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [urlPattern, setUrlPattern] = useState("")
  const [copied, setCopied] = useState(false)
  const toastRef = useRef<HTMLDivElement>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [previewPoster, setPreviewPoster] = useState<TMDBImage | null>(null)
  const [metaInfo, setMetaInfo] = useState<{ genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; first_air_date?: string; last_air_date?: string; next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons?: number; number_of_episodes?: number; awards?: string[]; nominations?: string[]; studios?: string[]; franchise?: string | null; basedOn?: string | null; director?: string | null }>({ genres: [], voteAverage: 0 })
  const [view, setView] = useState<"edit" | "search" | "myposters">("edit")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [trending, setTrending] = useState<Array<SearchResult & { rank: number }>>([])
  const [mdblistAnimeList, setMdblistAnimeList] = useState<EnrichedAnimeItem[]>([])
  const [streamingCharts, setStreamingCharts] = useState<Record<string, FlixPatrolChart>>({})

  const [tmdbKey, setTmdbKeyState] = useState("")
  const [mdblistApiKey, setMdblistApiKey] = useState("")
  const [tmdbKeyInput, setTmdbKeyInput] = useState("")
  const [showKey, setShowKey] = useState(false)
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
  const [trendRank, setTrendRank] = useState<number | null>(null)
  const [mdblistMatch, setMdblistMatch] = useState<{ key: string; rank: number } | null>(null)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [accentColor, setAccentColor] = useState("#555555")
  const [topEdgeColor, setTopEdgeColor] = useState("#555555")
  const [rotationPosters, setRotationPosters] = useState<string[]>([])
  const [autoRotateClean, setAutoRotateClean] = useState(false)
  const keyInit = useRef(false)
  const langInit = useRef(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const posterScrollRef = useRef<HTMLDivElement>(null)
  const [posterScrollInfo, setPosterScrollInfo] = useState({ top: 0, height: 100 })
  const fetchIdRef = useRef(0)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasBadges = globalBadges && metaInfo.genres.length > 0 && metaInfo.voteAverage > 0

  const mappingsMap = useMemo(() => {
    const map = new Map<string, Mapping>()
    for (const m of mappings) {
      map.set(`${m.mediaType}:${m.tmdbId}`, m)
    }
    return map
  }, [mappings])

  const logoBounds = useMemo(() => {
    if (!previewPoster || !selectedLogo) return { minX: -500, maxX: 500, minY: -500, maxY: 500 }
    const pw = previewPoster.width || 1000
    const ph = previewPoster.height || 1500
    const lw = selectedLogo.width || 1
    const lh = selectedLogo.height || 1
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
  }, [previewPoster, selectedLogo, logoScale, hasBadges])

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
    } catch {}
  }, [])

  const pickLang = (l: string) => {
    setLang(l)
    setI18nLang(l)
    localStorage.setItem("preferred_lang", l)
    setShowLangPicker(false)
  }

  const loadMappings = useCallback(async () => {
    try {
      const data = await api("/api/mappings")
      setMappings(data.mappings)
    } catch (e) { console.error("[posterium] Failed to load mappings:", e) }
  }, [])

  useEffect(() => { loadMappings() }, [loadMappings])

  const lastRefreshRef = useRef(0)

  const showToast = (msg: string) => {
    const el = toastRef.current
    if (el) {
      el.textContent = msg
      el.classList.remove("opacity-0", "animate-toast-in")
      el.classList.add("opacity-100")
      void el.offsetWidth
      el.classList.add("animate-toast-in")
      if (el.dataset.timer) clearTimeout(Number(el.dataset.timer))
      const timer = window.setTimeout(() => {
        el.classList.remove("opacity-100", "animate-toast-in")
        el.classList.add("opacity-0")
      }, 2500)
      el.dataset.timer = String(timer)
    }
  }

  const refreshLists = useCallback(async () => {
    if (!tmdbKey) return
    const now = Date.now()
    if (now - lastRefreshRef.current < 10 * 60 * 1000) {
      showToast(t("ui.refreshRateLimit"))
      return
    }
    lastRefreshRef.current = now
    try {
      const [trendingData, animeData] = await Promise.all([
        api(`/api/tmdb/trending?api_key=${tmdbKey}`),
        mdblistApiKey ? api(`/api/mdblist/anime?mdblist_key=${mdblistApiKey}&api_key=${tmdbKey}`).catch(() => null) : Promise.resolve(null),
      ])
      setTrending([...(trendingData.movies || []), ...(trendingData.tv || [])])
      if (animeData) setMdblistAnimeList(animeData)
    } catch (e) { console.error("[posterium] Failed to load trending:", e) }
    for (const p of STREAMING_PLATFORMS) {
      api(`/api/flixpatrol/top10?platform=${p.slug}&country=italy&api_key=${encodeURIComponent(tmdbKey)}`).then((data) => {
        setStreamingCharts((prev) => ({ ...prev, [p.slug]: data }))
      }).catch(() => {})
    }
    showToast(t("ui.listsRefreshed"))
  }, [tmdbKey, mdblistApiKey, showToast])

  useEffect(() => {
    if (!tmdbKey) return
    api(`/api/tmdb/trending?api_key=${tmdbKey}`).then((data) => {
      setTrending([...(data.movies || []), ...(data.tv || [])])
    }).catch(() => {})
    if (mdblistApiKey) {
      api(`/api/mdblist/anime?mdblist_key=${mdblistApiKey}&api_key=${tmdbKey}`).then(setMdblistAnimeList).catch(() => {})
    }
  }, [tmdbKey, mdblistApiKey])

  useEffect(() => {
    if (!tmdbKey) return
    for (const p of STREAMING_PLATFORMS) {
      api(`/api/flixpatrol/top10?platform=${p.slug}&country=italy&api_key=${encodeURIComponent(tmdbKey)}`).then((data) => {
        setStreamingCharts((prev) => ({ ...prev, [p.slug]: data }))
      }).catch((e) => { console.error("[posterium] FlixPatrol fetch failed for", p.slug, e) })
    }
  }, [tmdbKey])

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const source = e.state?.source
      if (source === "myposters") {
        setView("myposters")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
      } else if (e.state?.view === "search") {
        setView("search")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
      } else if (e.state?.view === "myposters") {
        setView("myposters")
      } else {
        ++fetchIdRef.current
        setView("edit")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
        setPosters([])
        setLogos([])
        setMetaInfo({ genres: [], voteAverage: 0 })
        setTrendRank(null)
        setResults([])
        setQuery("")
      }
    }
    addEventListener("popstate", handler)
    return () => removeEventListener("popstate", handler)
  }, [])

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

  useEffect(() => {
    if (!selected || !tmdbKey) return
    const itemId = selected.id
    const itemType = selected.media_type
    const fetchId = ++fetchIdRef.current
    api(`/api/tmdb/${itemId}/images?type=${itemType}&languages=${lang},en,null&api_key=${tmdbKey}`).then((data) => {
      if (fetchIdRef.current !== fetchId) return
      setPosters(data.posters || [])
      setLogos(data.logos || [])
      setBackdrops(data.backdrops || [])
      if (previewPoster) {
        const match = (data.posters || []).find((p: TMDBImage) => p.file_path === previewPoster.file_path)
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
              setPreviewPoster({ file_path: clean.file_path, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
              setGradientHeight(30)
            } else {
              const itPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "it")
              const enPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "en")
              setPreviewPoster(itPoster || enPoster || langPoster || firstPoster || previewPoster)
              setGradientHeight(15)
            }
          } else {
            setPreviewPoster(langPoster || firstPoster || previewPoster)
            setGradientHeight(15)
          }
        }
      }
    if (previewPoster?.iso_639_1 === null && selectedLogo) {
        const match = (data.logos || []).find((l: TMDBImage) => l.file_path === selectedLogo.file_path)
        if (!match) {
          const langLogo = data.logos?.find((l: TMDBImage) => l.iso_639_1 === lang)
          const itLogo = lang !== "it" ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === "it") : undefined
          const enLogo = lang !== "en" ? data.logos?.find((l: TMDBImage) => l.iso_639_1 === "en") : undefined
          const firstLogo = data.logos?.[0]
          setSelectedLogo(langLogo || itLogo || enLogo || firstLogo || selectedLogo)
        }
      }
    }).catch(() => {})
  }, [lang])

  useEffect(() => {
    let url = `${getDomain()}/api/poster/{type}/{tmdb_id}`
    const params: string[] = []
    if (tmdbKey) params.push(`api_key=${encodeURIComponent(tmdbKey)}`)
    if (!globalBadges) params.push("badges=0")
    if (!rankingBadges) params.push("ranking=0")
    if (lang) params.push(`lang=${encodeURIComponent(lang)}`)
    if (!blurEnabled) params.push("be=0")
    params.push(`gradHeight=${gradientHeight}`)
    params.push(`blur=${blurIntensity}`)
    params.push(`bf=${blurFade}`)
    params.push(`bd=${blurDarkness}`)
    params.push(`bs=${badgeStyle}`)
    params.push(`rs=${rankingBadgeStyle}`)
    params.push("rv=55")
    url += "?" + params.join("&")
    setUrlPattern(url)
  }, [globalBadges, rankingBadges, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle, tmdbKey, lang])


  const buildPreviewUrl = useCallback(() => {
    if (!selected) { setPreviewUrl(""); return }
    const params: string[] = []
    if (tmdbKey) params.push(`api_key=${encodeURIComponent(tmdbKey)}`)
    if (!globalBadges) params.push("badges=0")
    if (!rankingBadges) params.push("ranking=0")
    if (previewPoster) {
      params.push(`poster=${encodeURIComponent(previewPoster.file_path)}`)
      const genre = metaInfo.genres[0]?.name
      if (genre) params.push(`genreName=${encodeURIComponent(genre)}`)
      if (metaInfo.voteAverage > 0) params.push(`voteAverage=${metaInfo.voteAverage}`)
    }
    if (selectedLogo) {
      params.push(`logo=${encodeURIComponent(selectedLogo.file_path)}`)
      params.push(`scale=${logoScale}`)
      params.push(`ox=${logoOffsetX}`)
      params.push(`oy=${logoOffsetY}`)
    }
    if (selectedBackdrop) {
      params.push(`backdrop=${encodeURIComponent(selectedBackdrop.file_path)}`)
      params.push(`bscale=${backdropScale}`)
      params.push(`box=${backdropOffsetX}`)
      params.push(`boy=${backdropOffsetY}`)
    }
    if (lang) params.push(`lang=${lang}`)
    params.push(`gradHeight=${gradientHeight}`)
    params.push(`blur=${blurIntensity}`)
    params.push(`bf=${blurFade}`)
    params.push(`bd=${blurDarkness}`)
    params.push(`bs=${badgeStyle}`)
    params.push(`rs=${rankingBadgeStyle}`)
    if (!blurEnabled) params.push("be=0")
    if (rankingBadges) {
      const edgeLum = (() => {
        const h = topEdgeColor
        if (h.length < 7) return null
        if (h === "#555555") return null
        const r = parseInt(h.slice(1, 3), 16) / 255
        const g = parseInt(h.slice(3, 5), 16) / 255
        const b = parseInt(h.slice(5, 7), 16) / 255
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      })()
      const topLight = edgeLum !== null ? edgeLum > 0.60 : true
      params.push(`tl=${topLight ? "1" : "0"}`)
      const now = Date.now()
      const twoWeeks = 14 * 24 * 60 * 60 * 1000
const isNewMovie = selected?.media_type === "movie" && metaInfo.release_date ? (now - new Date(metaInfo.release_date).getTime()) < twoWeeks : false
        const isNewSeries = selected?.media_type === "tv" && metaInfo.first_air_date ? (now - new Date(metaInfo.first_air_date).getTime()) < twoWeeks : false
      const award = metaInfo.awards?.length ? getAwardBadgeLabel(metaInfo.awards) : null
      const nomination = !award && metaInfo.nominations?.length ? getNominationBadgeLabel(metaInfo.nominations) : null
      const animeRank = selected && mdblistAnimeList.length > 0 ? (mdblistAnimeList.find((a) => a.id === selected.id)?.rank ?? null) : null
      const studio = metaInfo.studios?.length ? metaInfo.studios[0] : null
      const tvType = selected?.media_type === "tv" ? metaInfo.type : null
      const tvStatus = selected?.media_type === "tv" ? metaInfo.status : null
      const extra = computeExtraFallback({ mediaType: selected?.media_type === "tv" ? "tv" : "movie", voteAverage: metaInfo.voteAverage, tvType, tvStatus }, t)
      if (customBadge) {
        const rankKey = isRankKey(customBadge)
        if (rankKey === "badge.today" && trendRank) params.push(`rank=${trendRank}&label=${encodeURIComponent(t("badge.today"))}`)
        else if (rankKey === "badge.anime" && animeRank) params.push(`rank=${animeRank}&label=${encodeURIComponent(t("badge.anime"))}`)
        else params.push(`extra=${encodeURIComponent(resolveLabel(customBadge))}`)
      } else {
        const badge = computeBadge({ isNewMovie, isNewSeries, animeRank, trendRank: trendRank, award, franchise: metaInfo.franchise || null, nomination, studio, director: metaInfo.director || null, extra }, t)
        if (badge) {
          if (badge.type === "extra") params.push(`extra=${encodeURIComponent(badge.label)}`)
          else params.push(`rank=${badge.rank}&label=${encodeURIComponent(badge.rankLabel || badge.label)}`)
        }
      }
    }
    const v = Date.now()
    params.push(`v=${v}`)
    const qs = params.length > 0 ? "?" + params.join("&") : ""
    setPreviewUrl(`${getDomain()}/api/poster/${selected.media_type}/${selected.id}${qs}`)
  }, [selected, previewPoster, metaInfo, logoScale, logoOffsetX, logoOffsetY, globalBadges, rankingBadges, selectedLogo, selectedBackdrop, backdropScale, backdropOffsetX, backdropOffsetY, lang, tmdbKey, accentColor, topEdgeColor, trendRank, mdblistAnimeList, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle, rankingBadgeStyle])

  useEffect(() => {
    if (!selected) { setPreviewUrl(""); return }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(buildPreviewUrl, 200)
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current) }
  }, [selected, buildPreviewUrl])

  useEffect(() => {
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current) }
  }, [])
  useEffect(() => {
    const root = document.documentElement
    if (!previewPoster) {
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
    const url = posterUrl(previewPoster.file_path, "w342") + `?cb=${Date.now()}`
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
      } catch {}
    }
    img.onerror = () => { if (!cancelled) { setRootColors(85, 85, 85, 85, 85, 85) } }
    img.src = url
    return () => { cancelled = true }
  }, [previewPoster])

  const navigateToPoster = (item: SearchResult, source?: string) => {
    window.history.pushState({ source: source || null }, "", window.location.href)
    openPosterBrowser(item)
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }))
  }

  const doSearch = useCallback(async (q?: string, page = 1) => {
    const searchQuery = q ?? query
    if (searchQuery.length < 2 || !tmdbKey) return
    setSearching(true)
    if (page === 1) setSearchPage(1)
    try {
      const data = await api(`/api/tmdb/search?q=${encodeURIComponent(searchQuery)}&language=${lang}&api_key=${tmdbKey}&page=${page}`)
      const newResults = data.results || []
      setResults(page === 1 ? newResults : (prev) => [...prev, ...newResults])
      setTotalResults(data.total_results || 0)
      setTotalPages(data.total_pages || 0)
      if (page === 1) {
        setSearchPage(1)
        setRecentSearches((prev) => {
          const next = [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 5)
          localStorage.setItem("recent_searches", JSON.stringify(next))
          return next
        })
      }
    } catch {
    } finally {
      setSearching(false)
    }
  }, [query, tmdbKey, lang])

  const loadMore = useCallback(async () => {
    if (searching || searchPage >= totalPages) return
    const nextPage = searchPage + 1
    setSearchPage(nextPage)
    await doSearch(query, nextPage)
  }, [query, searchPage, totalPages, searching, doSearch])

  const openPosterBrowser = async (item: SearchResult) => {
    const itemId = item.id
    const itemType = item.media_type
    const fetchId = ++fetchIdRef.current
    setSelected(item)
    setSelectedLogo(null)
    setSelectedBackdrop(null)
    setPreviewPoster(null)
    setLoadingImages(true)
    setOpenSections({})
    setPreviewId(`${itemType}:${itemId}`)
    setView("edit")
    try {
      const [data, details, rankData, awardData] = await Promise.all([
        api(`/api/tmdb/${itemId}/images?type=${itemType}&languages=${lang},en,null&api_key=${tmdbKey}`).catch(() => ({ posters: [], logos: [], backdrops: [] })),
        api(`/api/tmdb/${itemId}/details?type=${itemType}&language=${lang}&api_key=${tmdbKey}${mdblistApiKey ? `&mdblist_key=${encodeURIComponent(mdblistApiKey)}` : ""}`).catch(() => ({ genres: [], voteAverage: 0, voteCount: 0, status: null, type: null, release_date: null, first_air_date: null, last_air_date: null, next_episode_to_air: null, number_of_seasons: null, number_of_episodes: null, title: null, name: null, imdb_id: null, networks: [], production_companies: [], original_language: "en" })),
        api(`/api/trending/rank?type=${itemType}&id=${itemId}&api_key=${encodeURIComponent(tmdbKey)}`).catch(() => ({ rank: null })),
        api(`/api/awards/${itemType}/${itemId}`).catch(() => ({ awards: [] })),
      ])
      if (fetchIdRef.current !== fetchId) return
      setSelected({ ...item, imdb_id: details.imdb_id })
      setPosters(data.posters || [])
      setLogos(data.logos || [])
      setBackdrops(data.backdrops || [])
      if (details.title) setSelected((prev) => ({ ...prev!, title: details.title }))
      if (details.name) setSelected((prev) => ({ ...prev!, name: details.name }))
      const tmdbNetworks = itemType === "tv" ? (details.networks || []).map((n: any) => n.name) : (details.production_companies || []).map((c: any) => c.name)
      setMetaInfo({ genres: details.genres || [], voteAverage: details.voteAverage || 0, type: details.type, status: details.status, release_date: details.release_date, first_air_date: details.first_air_date, last_air_date: details.last_air_date, next_episode_to_air: details.next_episode_to_air, number_of_seasons: details.number_of_seasons, number_of_episodes: details.number_of_episodes, awards: awardData?.awards || [], nominations: awardData?.nominations || [], studios: matchTMDBStudios(tmdbNetworks), franchise: awardData?.franchise || null, basedOn: awardData?.basedOn || null, director: awardData?.director || null })
      setTrendRank(rankData.rank || null)
      const extImdbId = item.imdb_id || details.imdb_id
      if (extImdbId && mdblistApiKey) {
        api(`/api/mdblist?imdb=${extImdbId}&api_key=${mdblistApiKey}`).then((d) => {
          if (d?.match) {
            setMdblistMatch(d.match)
          }
      }).catch(() => {})
      }
      if (!item.poster_path && data.posters?.length > 0) {
        const first = data.posters.find((p: TMDBImage) => p.iso_639_1) || data.posters[0]
        setSelected((prev) => ({ ...prev!, poster_path: first.file_path }))
      }
      const existing = mappingsMap.get(`${itemType}:${itemId}`)
      if (existing) {
        const foundPoster = (data.posters || []).find((p: TMDBImage) => p.file_path === existing.posterPath)
        setPreviewPoster(foundPoster ? { file_path: foundPoster.file_path, iso_639_1: existing.language, vote_average: 0, width: foundPoster.width, height: foundPoster.height } : { file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        let foundLogo: TMDBImage | undefined
        if (existing.logoPath) {
          foundLogo = (data.logos || []).find((l: TMDBImage) => l.file_path === existing.logoPath)
          setSelectedLogo(foundLogo ? { file_path: foundLogo.file_path, iso_639_1: existing.language, vote_average: 0, width: foundLogo.width, height: foundLogo.height } : { file_path: existing.logoPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
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
        setRankingBadgeStyle((existing as any).rankingBadgeStyle ?? defaultRankingBadgeStyle)
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
            setPreviewPoster({ file_path: clean.file_path, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
            setSelectedLogo({ file_path: autoLogo.file_path, iso_639_1: autoLogo.iso_639_1, vote_average: 0, width: autoLogo.width, height: autoLogo.height })
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
              setPreviewPoster({ file_path: fallbackPoster.file_path, iso_639_1: fallbackPoster.iso_639_1, vote_average: 0, width: 0, height: 0 })
            }
          }
        } else if (langPoster) {
          setPreviewPoster({ file_path: langPoster.file_path, iso_639_1: lang, vote_average: 0, width: 0, height: 0 })
        } else {
          const origPoster = details.original_language ? data.posters?.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
          const fallbackPoster = origPoster || firstPoster
          if (fallbackPoster) {
            setPreviewPoster({ file_path: fallbackPoster.file_path, iso_639_1: fallbackPoster.iso_639_1, vote_average: 0, width: 0, height: 0 })
          }
        }
        loadDefaultsToState()
      }
    } finally {
      setLoadingImages(false)
    }
  }

  const selectPoster = useCallback(async (image: TMDBImage) => {
    if (!selected) return
    setPreviewPoster(image)
    setPreviewId(`${selected.media_type}:${selected.id}`)
  }, [selected])

  const selectLogo = useCallback(async (logo: TMDBImage) => {
    setSelectedLogo(logo)
    if (logo.width && logo.height) {
      const maxH = Math.round(1500 * 0.25)
      const effW = Math.round(maxH * logo.width / logo.height)
      setLogoScale(Math.min(Math.round(effW / 1000 * 100), 75))
    } else {
      setLogoScale(75)
    }
    setLogoOffsetX(0)
    setLogoOffsetY(0)
    if (!previewPoster && selected) {
      const existing = mappingsMap.get(`${selected.media_type}:${selected.id}`)
      if (existing) {
        setPreviewPoster({ file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
      } else if (posters.length > 0) {
        setPreviewPoster(posters[0])
      }
    }
    if (selected) setPreviewId(`${selected.media_type}:${selected.id}`)
  }, [selected, previewPoster, mappingsMap, posters])

  const saveConfig = useCallback(async () => {
    if (!selected || !previewPoster) return
    const now = Date.now()
    const twoWeeks = 14 * 24 * 60 * 60 * 1000
    const isNewMovie = selected.media_type === "movie" && metaInfo.release_date ? (now - new Date(metaInfo.release_date).getTime()) < twoWeeks : false
    const isNewSeries = selected.media_type === "tv" && metaInfo.first_air_date ? (now - new Date(metaInfo.first_air_date).getTime()) < twoWeeks : false
    const award = metaInfo.awards?.length ? getAwardBadgeLabel(metaInfo.awards, t) : null
    const nomination = !award && metaInfo.nominations?.length ? getNominationBadgeLabel(metaInfo.nominations, t) : null
    const animeRankData = mdblistAnimeList?.find((a: any) => a.id === selected.id)
    const tvType = selected.media_type === "tv" ? metaInfo.type : null
    const tvStatus = selected.media_type === "tv" ? metaInfo.status : null
    const extra = computeExtraFallback({ mediaType: selected.media_type === "tv" ? "tv" : "movie", voteAverage: metaInfo.voteAverage, tvType, tvStatus }, t)
    const studio = metaInfo.studios?.length ? metaInfo.studios[0] : null
    const badge = computeBadge({ isNewMovie, isNewSeries, animeRank: animeRankData?.rank ?? null, trendRank, award, franchise: metaInfo.franchise || null, nomination, studio, director: metaInfo.director || null, extra }, t)
    const badgeExtra = badge?.type === "extra" ? badge.label : undefined
    const badgeRank = (!badgeExtra && rankingBadges) ? (badge?.type === "rank" ? badge.rank : trendRank || undefined) : undefined
    const badgeLabel = (!badgeExtra && animeRankData) ? t("badge.anime") : (!badgeExtra && badge?.type === "rank") ? (badge.rankLabel || t("badge.today")) : undefined
    const isClean = previewPoster.iso_639_1 === null
    const isNewMapping = !mappingsMap.has(`${selected.media_type}:${selected.id}`)
    const effectiveRotationPosters = defaultAutoRotateClean && isClean && isNewMapping
      ? posters.filter(p => p.iso_639_1 === null).map(p => p.file_path)
      : rotationPosters
    try {
      await api("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id,
          mediaType: selected.media_type,
          title: titleOf(selected),
          posterPath: previewPoster.file_path,
          logoPath: selectedLogo?.file_path || null,
          originalPosterPath: selected.poster_path,
          language: previewPoster.iso_639_1,
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
          badgeStyle,
          rankingBadgeStyle,
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
      setPreviewId(`${selected.media_type}:${selected.id}`)
      showToast(t("ui.saveSuccess"))
      loadMappings()
    } catch {
      showToast(t("ui.saveError"))
    }
  }, [selected, previewPoster, selectedLogo, metaInfo, logoScale, logoOffsetX, logoOffsetY, trendRank, globalBadges, rankingBadges, mdblistAnimeList, loadMappings, customBadge, badgeStyle, rankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, rotationPosters, autoRotateClean, defaultAutoRotateClean, posters, mappingsMap])

  const removeLogo = useCallback(async () => {
    setSelectedLogo(null)
    if (!selected) return
    const key = `${selected.media_type}:${selected.id}`
    const existing = mappingsMap.get(key)
    if (!existing) {
      showToast(t("ui.noMappingUpdate"))
      return
    }
    await api(`/api/mappings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: selected.id, mediaType: selected.media_type, title: titleOf(selected),
        posterPath: previewPoster?.file_path || selected.poster_path!, logoPath: null,
        originalPosterPath: selected.poster_path, language: previewPoster?.iso_639_1 || null,
        logoScale, logoOffsetX, logoOffsetY,
        genreName: metaInfo.genres[0]?.name || null,
        voteAverage: metaInfo.voteAverage || null,
        trendRank: trendRank ?? null,
      }),
    })
    showToast(t("ui.logoRemoved"))
    loadMappings()
    if (selected) setPreviewId(`${selected.media_type}:${selected.id}`)
  }, [selected, previewPoster, logoScale, logoOffsetX, logoOffsetY, metaInfo, trendRank, mappingsMap, loadMappings])

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
    await api(`/api/mappings/${m.mediaType}:${m.tmdbId}`, { method: "DELETE" })
    setMappings((prev) => prev.filter((x) => !(x.tmdbId === m.tmdbId && x.mediaType === m.mediaType)))
    showToast(t("ui.mappingRemoved"))
  }, [])

  const exportData = async () => {
    const data = await api("/api/mappings/export")
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
        await api("/api/mappings/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings: data.mappings || data }),
        })
        loadMappings()
        showToast(t("ui.importSuccess", { count: data.mappings?.length || data.length }))
      } catch {
        showToast(t("ui.importError"))
      }
    }
    input.click()
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(urlPattern)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const goHome = () => {
    setView("edit")
    setSelected(null)
    setPreviewPoster(null)
    setSelectedLogo(null)
    setPreviewId(null)
    setResults([])
    setQuery("")
  }

  const removeRecentSearch = (search: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== search)
      localStorage.setItem("recent_searches", JSON.stringify(next))
      return next
    })
  }

  const posterActivePath = previewPoster?.file_path

  return useMemo(() => ({
    selected, setSelected,
    view, setView: setView as React.Dispatch<React.SetStateAction<string>>,
    posters, loadingImages,
    previewPoster, setPreviewPoster,
    selectedLogo, setSelectedLogo,
    logos,
    posterActivePath: posterActivePath ?? null,
    previewUrl, urlPattern, lang,
    openSections, toggleSection,
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
    previewId, setPreviewId,
    saveConfig, removeMapping, mappingsMap,
    goHome, navigateToPoster,
    refreshLists,
    tmdbKey, setQuery, doSearch, loadMore,
    titleOf, yearOf, posterUrl,
    trending, streamingCharts, mdblistAnimeList,
    STREAMING_PLATFORMS, loadMappings,
    query, results, searching, totalResults, totalPages, searchPage, recentSearches, mappings,
    toastRef, settingsRef, langRef,
    setLangOpen, langOpen, pickLang,
    settingsOpen, setSettingsOpen,
    showLangPicker, setShowLangPicker,
    tmdbKeyInput, setTmdbKeyInput,
    showKey, setShowKey, setTmdbKey,
    mdblistApiKey, setMdblistApiKey: setMdblistApiKeyFn,
    exportData, importData, removeRecentSearch,
    copyUrl, copied,
    accentColor,
    topEdgeColor,
    rotationPosters, setRotationPosters,
    autoRotateClean, setAutoRotateClean,
    t,
  }), [
    selected, view, posters, loadingImages, previewPoster, selectedLogo,
    logos, posterActivePath, previewUrl, urlPattern, lang,
    openSections, posterScrollInfo, logoBounds, logoScale,
    logoOffsetX, logoOffsetY, editingValue, editText,
    globalBadges, rankingBadges, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle,
    rankingBadgeStyle,
    defaultBadgeStyle, defaultRankingBadgeStyle, defaultBlurEnabled, defaultBlurIntensity, defaultBlurFade, defaultBlurDarkness, defaultGradientHeight,
    defaultGlobalBadges, defaultRankingBadges, defaultAutoRotateClean,
    trendRank, mdblistMatch, metaInfo, previewId,
    selectPoster, selectLogo, saveConfig, removeLogo,
    mappingsMap, tmdbKey, query, results, searching, totalResults, totalPages, searchPage, recentSearches, mappings,
    langOpen, settingsOpen, showLangPicker,
    tmdbKeyInput, showKey, copied,
    accentColor,
    topEdgeColor,
    rotationPosters, autoRotateClean,
    trending, streamingCharts, mdblistAnimeList,
    refreshLists,
  ])
}
