"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { SearchResult, TMDBImage, Mapping, FlixPatrolChart } from "./types"
import { getDomain, posterUrl, titleOf, yearOf, api, STREAMING_PLATFORMS } from "./utils"
import { extractColor, averageTopColor } from "./color"
import { getAwardBadgeLabel } from "./awards"

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
  editingValue: string | null
  setEditingValue: React.Dispatch<React.SetStateAction<string | null>>
  editText: string
  setEditText: React.Dispatch<React.SetStateAction<string>>
  globalBadges: boolean
  setGlobalBadges: React.Dispatch<React.SetStateAction<boolean>>
  rankingBadges: boolean
  setRankingBadges: React.Dispatch<React.SetStateAction<boolean>>
  trendRank: number | null
  metaInfo: { genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; last_air_date?: string; next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons?: number; number_of_episodes?: number; awards?: string[] }
  previewId: string | null
  setPreviewId: React.Dispatch<React.SetStateAction<string | null>>
  saveConfig: () => Promise<void>
  removeMapping: (m: Mapping) => void
  mappingsMap: Map<string, Mapping>
  goHome: () => void
  navigateToPoster: (item: SearchResult) => void
  tmdbKey: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  doSearch: (q?: string, page?: number) => Promise<void>
  loadMore: () => Promise<void>
  titleOf: (r: SearchResult) => string
  yearOf: (r: SearchResult) => string
  posterUrl: (path: string, size?: string) => string
  trending: (SearchResult & { rank: number })[]
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
  tmdbKeyInput: string
  setTmdbKeyInput: React.Dispatch<React.SetStateAction<string>>
  showKey: boolean
  setShowKey: React.Dispatch<React.SetStateAction<boolean>>
  setTmdbKey: (v: string) => void
  exportData: () => Promise<void>
  importData: () => void
  copyUrl: () => Promise<void>
  copied: boolean
  accentColor: string
  badgeBgColor: string
  isTendenza: boolean
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
  const [metaInfo, setMetaInfo] = useState<{ genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; last_air_date?: string; next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons?: number; number_of_episodes?: number; awards?: string[] }>({ genres: [], voteAverage: 0 })
  const [view, setView] = useState<"edit" | "search" | "myposters">("edit")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [trending, setTrending] = useState<Array<SearchResult & { rank: number }>>([])
  const [streamingCharts, setStreamingCharts] = useState<Record<string, FlixPatrolChart>>({})

  const [tmdbKey, setTmdbKeyState] = useState("")
  const [tmdbKeyInput, setTmdbKeyInput] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [logoScale, setLogoScale] = useState(75)
  const [logoOffsetX, setLogoOffsetX] = useState(0)
  const [logoOffsetY, setLogoOffsetY] = useState(0)
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  const [globalBadges, setGlobalBadges] = useState(true)
  const [rankingBadges, setRankingBadges] = useState(true)
  const [trendRank, setTrendRank] = useState<number | null>(null)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [accentColor, setAccentColor] = useState("#ffffff")
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
    const finW = Math.min(Math.round(pw * logoScale / 100), pw)
    const hVal = Math.round(lh * (finW / lw))
    const logoH = Math.min(hVal, ph)
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
  }, [])

  const setTmdbKey = (val: string) => {
    setTmdbKeyState(val)
    setTmdbKeyInput(val)
    localStorage.setItem("tmdb_key", val)
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
    const gb = localStorage.getItem("global_badges")
    if (gb !== null) setGlobalBadges(gb === "1")
    const rb = localStorage.getItem("ranking_badges")
    if (rb !== null) setRankingBadges(rb === "1")
  }, [])

  const pickLang = (l: string) => {
    setLang(l)
    localStorage.setItem("preferred_lang", l)
    setShowLangPicker(false)
  }

  const loadMappings = useCallback(async () => {
    try {
      const data = await api("/api/mappings")
      setMappings(data.mappings)
    } catch {}
  }, [])

  useEffect(() => { loadMappings() }, [loadMappings])

  useEffect(() => {
    if (!tmdbKey) return
    api(`/api/tmdb/trending?api_key=${tmdbKey}`).then((data) => {
      setTrending([...(data.movies || []), ...(data.tv || [])])
    }).catch(() => {})
  }, [tmdbKey])

  useEffect(() => {
    if (!tmdbKey) return
    for (const p of STREAMING_PLATFORMS) {
      api(`/api/flixpatrol/top10?platform=${p.slug}&country=italy&api_key=${encodeURIComponent(tmdbKey)}`).then((data) => {
        setStreamingCharts((prev) => ({ ...prev, [p.slug]: data }))
      }).catch(() => {})
    }
  }, [tmdbKey])

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const view = e.state?.view
      if (view === "search") {
        setView("search")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
      } else if (view === "myposters") {
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
      if (previewPoster) {
        const match = (data.posters || []).find((p: TMDBImage) => p.file_path === previewPoster.file_path)
        if (!match) {
          const clean = data.posters?.find((p: TMDBImage) => p.iso_639_1 === null)
          const langPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === lang)
          const firstPoster = data.posters?.[0]
          setPreviewPoster(clean || langPoster || firstPoster || previewPoster)
        }
      }
    if (previewPoster?.iso_639_1 === null && selectedLogo) {
        const match = (data.logos || []).find((l: TMDBImage) => l.file_path === selectedLogo.file_path)
        if (!match) {
          const langLogo = data.logos?.find((l: TMDBImage) => l.iso_639_1 === lang)
          const enLogo = data.logos?.find((l: TMDBImage) => l.iso_639_1 === "en")
          const firstLogo = data.logos?.[0]
          setSelectedLogo(langLogo || enLogo || firstLogo || selectedLogo)
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
    if (params.length > 0) url += "?" + params.join("&")
    setUrlPattern(url)
  }, [globalBadges, rankingBadges, tmdbKey])

  const [badgeBgColor, setBadgeBgColor] = useState("")

  useEffect(() => {
    if (!previewPoster) { setBadgeBgColor(""); return }
    let cancelled = false
    const url = posterUrl(previewPoster.file_path, "w342")
    averageTopColor(url).then((color) => {
      if (!cancelled) setBadgeBgColor(color || "")
    })
    return () => { cancelled = true }
  }, [previewPoster])

  const isTendenza = useMemo(() => {
    if (!selected) return false
    const inTrending = trending.some((t) => t.id === selected.id)
    const inCharts = Object.values(streamingCharts).some((chart) =>
      [...(chart.movies || []), ...(chart.tv || [])].some((item) => item.tmdbId === selected.id)
    )
    return inTrending || inCharts
  }, [selected, trending, streamingCharts])

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
    if (lang) params.push(`lang=${lang}`)
    if (badgeBgColor) params.push(`badgeColor=${encodeURIComponent(badgeBgColor)}`)
    else params.push(`badgeColor=%23999999`)
    if (rankingBadges) {
      const currYear = new Date().getFullYear().toString()
      const isNewMovie = selected?.media_type === "movie" && selected?.release_date?.startsWith(currYear)
      const isNewSeries = selected?.media_type === "tv" && selected?.first_air_date?.startsWith(currYear)
      const now = Date.now()
      const twoMonths = 60 * 24 * 60 * 60 * 1000
      const twoWeeks = 14 * 24 * 60 * 60 * 1000
      const award = metaInfo.awards?.length ? getAwardBadgeLabel(metaInfo.awards) : null

      if (isNewMovie) { params.push(`extra=${encodeURIComponent("Nuovo film")}`) }
      else if (isNewSeries) { params.push(`extra=${encodeURIComponent("Nuova serie")}`) }
      else if (award) { params.push(`extra=${encodeURIComponent(award)}`) }
      else if (selected?.media_type === "movie" && selected?.release_date) {
        const rd = new Date(selected.release_date).getTime()
        if (rd < now && now - rd < twoMonths) { params.push(`extra=${encodeURIComponent("Al cinema")}`) }
      }
      else if (selected?.media_type === "tv" && metaInfo.last_air_date && now - new Date(metaInfo.last_air_date).getTime() < twoMonths) {
        params.push(`extra=${encodeURIComponent("Finale stagione")}`)
      }
      else if (selected?.media_type === "tv" && metaInfo.next_episode_to_air?.air_date) {
        const nextAir = new Date(metaInfo.next_episode_to_air.air_date).getTime()
        if (nextAir > now && nextAir - now < twoWeeks) { params.push(`extra=${encodeURIComponent("Nuova stagione")}`) }
      }
      else if (!trendRank && isTendenza) { params.push(`extra=${encodeURIComponent("Di Tendenza")}`) }
      else {
        const tvType = selected?.media_type === "tv" ? metaInfo.type : null
        const tvStatus = selected?.media_type === "tv" ? metaInfo.status : null
        const extra = tvType === "Miniseries" ? "Miniserie" : tvStatus === "Returning Series" ? "Ritorna" : metaInfo.voteAverage >= 8 ? "Da divorare" : null
        if (extra) params.push(`extra=${encodeURIComponent(extra)}`)
      }
    }
    const v = Date.now()
    params.push(`v=${v}`)
    const qs = params.length > 0 ? "?" + params.join("&") : ""
    setPreviewUrl(`${getDomain()}/api/poster/${selected.media_type}/${selected.id}${qs}`)
  }, [selected, previewPoster, metaInfo, logoScale, logoOffsetX, logoOffsetY, globalBadges, rankingBadges, selectedLogo, lang, tmdbKey, badgeBgColor, accentColor, isTendenza, trendRank])

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
    if (!previewPoster) { root.style.setProperty("--color-accent", "#ffffff"); setAccentColor("#ffffff"); return }
    let cancelled = false
    const url = posterUrl(previewPoster.file_path, "w342")
    extractColor(url).then((color) => {
      if (!cancelled) {
        const c = color || "#ffffff"
        root.style.setProperty("--color-accent", c)
        setAccentColor(c)
      }
    })
    return () => { cancelled = true }
  }, [previewPoster])

  const navigateToPoster = (item: SearchResult) => {
    window.history.pushState({ view }, "", window.location.href)
    openPosterBrowser(item)
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: prev[key] !== true }))
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
    setPreviewPoster(null)
    setLoadingImages(true)
    setOpenSections({})
    setPreviewId(`${itemType}:${itemId}`)
    setView("edit")
    try {
      const [data, extIds, details, rankData, awardData] = await Promise.all([
        api(`/api/tmdb/${itemId}/images?type=${itemType}&languages=${lang},en,null&api_key=${tmdbKey}`),
        api(`/api/tmdb/${itemId}/external_ids?type=${itemType}&api_key=${tmdbKey}`),
        api(`/api/tmdb/${itemId}/details?type=${itemType}&language=${lang}&api_key=${tmdbKey}`),
        api(`/api/trending/rank?type=${itemType}&id=${itemId}&api_key=${encodeURIComponent(tmdbKey)}`).catch(() => ({ rank: null })),
        api(`/api/awards/${itemType}/${itemId}`).catch(() => ({ awards: [] })),
      ])
      if (fetchIdRef.current !== fetchId) return
      setSelected({ ...item, imdb_id: extIds.imdb_id })
      setPosters(data.posters || [])
      setLogos(data.logos || [])
      if (details.title) setSelected((prev) => ({ ...prev!, title: details.title }))
      if (details.name) setSelected((prev) => ({ ...prev!, name: details.name }))
      setMetaInfo({ genres: details.genres || [], voteAverage: details.voteAverage || 0, type: details.type, status: details.status, release_date: details.release_date, last_air_date: details.last_air_date, next_episode_to_air: details.next_episode_to_air, number_of_seasons: details.number_of_seasons, number_of_episodes: details.number_of_episodes, awards: awardData?.awards || [] })
      setTrendRank(rankData.rank || null)
      if (!item.poster_path && data.posters?.length > 0) {
        const first = data.posters.find((p: TMDBImage) => p.iso_639_1) || data.posters[0]
        setSelected((prev) => ({ ...prev!, poster_path: first.file_path }))
      }
      const existing = mappingsMap.get(`${itemType}:${itemId}`)
      if (existing) {
        setPreviewPoster({ file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        if (existing.logoPath) {
          setSelectedLogo({ file_path: existing.logoPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        }
        setLogoScale(existing.logoScale ?? 75)
        setLogoOffsetX(existing.logoOffsetX ?? 0)
        setLogoOffsetY(existing.logoOffsetY ?? 0)
        setTrendRank(rankData.rank ?? existing.trendRank ?? null)
      } else {
        setLogoScale(75)
        setLogoOffsetX(0)
        setLogoOffsetY(0)
        const clean = data.posters?.find((p: TMDBImage) => p.iso_639_1 === null)
        const langPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === lang)
        const firstPoster = data.posters?.[0]
        if (clean) setPreviewPoster({ file_path: clean.file_path, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
        else if (langPoster) setPreviewPoster({ file_path: langPoster.file_path, iso_639_1: lang, vote_average: 0, width: 0, height: 0 })
        else if (firstPoster) setPreviewPoster({ file_path: firstPoster.file_path, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
        const langLogo = data.logos?.find((l: TMDBImage) => l.iso_639_1 === lang)
        const enLogo = data.logos?.find((l: TMDBImage) => l.iso_639_1 === "en")
        const firstLogo = data.logos?.[0]
        const autoLogo = langLogo || enLogo || firstLogo
        if (autoLogo) setSelectedLogo({ file_path: autoLogo.file_path, iso_639_1: autoLogo.iso_639_1, vote_average: 0, width: 0, height: 0 })
      }
    } finally {
      setLoadingImages(false)
    }
  }

  const selectPoster = async (image: TMDBImage) => {
    if (!selected) return
    setPreviewPoster(image)
    setPreviewId(`${selected.media_type}:${selected.id}`)
  }

  const selectLogo = async (logo: TMDBImage) => {
    setSelectedLogo(logo)
    if (!previewPoster && selected) {
      const existing = mappingsMap.get(`${selected.media_type}:${selected.id}`)
      if (existing) {
        setPreviewPoster({ file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
      } else if (posters.length > 0) {
        setPreviewPoster(posters[0])
      }
    }
    if (selected) setPreviewId(`${selected.media_type}:${selected.id}`)
  }

  const saveConfig = async () => {
    if (!selected || !previewPoster) return
    try {
      await api("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id,
          mediaType: selected.media_type,
          title: titleOf(selected),
          posterPath: previewPoster.file_path,
          logoPath: previewPoster.iso_639_1 === null ? (selectedLogo?.file_path || null) : null,
          originalPosterPath: selected.poster_path,
          language: previewPoster.iso_639_1,
          logoScale, logoOffsetX, logoOffsetY,
          genreName: metaInfo.genres[0]?.name || null,
          voteAverage: metaInfo.voteAverage || null,
          trendRank: trendRank ?? undefined,
          trendPeriod: "day",
        }),
      })
      setPreviewId(`${selected.media_type}:${selected.id}`)
      showToast("Configurazione salvata!")
      loadMappings()
    } catch {
      showToast("Errore nel salvataggio")
    }
  }

  const removeLogo = async () => {
    setSelectedLogo(null)
    if (!selected) return
    await api(`/api/mappings/${selected.media_type}:${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: selected.id, mediaType: selected.media_type, title: titleOf(selected),
        posterPath: previewPoster?.file_path || selected.poster_path, logoPath: null,
        originalPosterPath: selected.poster_path, language: previewPoster?.iso_639_1 || null,
        logoScale, logoOffsetX, logoOffsetY,
        genreName: metaInfo.genres[0]?.name || null,
        voteAverage: metaInfo.voteAverage || null,
        trendRank: trendRank ?? null,
      }),
    })
    showToast("Logo rimosso!")
    if (selected) setPreviewId(`${selected.media_type}:${selected.id}`)
  }

  const removeMapping = useCallback(async (m: Mapping) => {
    await api(`/api/mappings/${m.mediaType}:${m.tmdbId}`, { method: "DELETE" })
    setMappings((prev) => prev.filter((x) => !(x.tmdbId === m.tmdbId && x.mediaType === m.mediaType)))
    showToast("Rimosso")
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
        showToast(`Importati ${data.mappings?.length || data.length} poster`)
      } catch {
        showToast("File JSON non valido")
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

  const showToast = (msg: string) => {
    const el = toastRef.current
    if (el) {
      el.textContent = msg
      el.classList.remove("opacity-0", "animate-slide-up")
      el.classList.add("opacity-100")
      void el.offsetWidth
      el.classList.add("animate-slide-up")
      if (el.dataset.timer) clearTimeout(Number(el.dataset.timer))
      const timer = window.setTimeout(() => {
        el.classList.remove("opacity-100", "animate-slide-up")
        el.classList.add("opacity-0")
      }, 2500)
      el.dataset.timer = String(timer)
    }
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
    editingValue, setEditingValue, editText, setEditText,
    globalBadges, setGlobalBadges,
    rankingBadges, setRankingBadges,
    trendRank,
    metaInfo,
    previewId, setPreviewId,
    saveConfig, removeMapping, mappingsMap,
    goHome, navigateToPoster,
    tmdbKey, setQuery, doSearch, loadMore,
    titleOf, yearOf, posterUrl,
    trending, streamingCharts,
    STREAMING_PLATFORMS, loadMappings,
    query, results, searching, totalResults, totalPages, searchPage, recentSearches, mappings,
    toastRef, settingsRef, langRef,
    setLangOpen, langOpen, pickLang,
    settingsOpen, setSettingsOpen,
    showLangPicker, setShowLangPicker,
    tmdbKeyInput, setTmdbKeyInput,
    showKey, setShowKey, setTmdbKey,
    exportData, importData, removeRecentSearch,
    copyUrl, copied,
    accentColor,
    badgeBgColor,
    isTendenza,
  }), [
    selected, view, posters, loadingImages, previewPoster, selectedLogo,
    logos, posterActivePath, previewUrl, urlPattern, lang,
    openSections, posterScrollInfo, logoBounds, logoScale,
    logoOffsetX, logoOffsetY, editingValue, editText,
    globalBadges, rankingBadges, trendRank, metaInfo, previewId,
    mappingsMap, tmdbKey, query, results, searching, totalResults, totalPages, searchPage, recentSearches, mappings,
    langOpen, settingsOpen, showLangPicker,
    tmdbKeyInput, showKey, copied,
    accentColor,
    badgeBgColor,
    isTendenza,
    trending, streamingCharts,
  ])
}
