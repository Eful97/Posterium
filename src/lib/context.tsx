"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from "react"
import type { SearchResult, TMDBImage, Mapping } from "./types"
import { posterUrl, titleOf, yearOf, STREAMING_PLATFORMS, getDomain } from "./utils"
import { matchTMDBStudios } from "./awards"
import { setLang as setI18nLang, t } from "./i18n"
import type { EnrichedAnimeItem } from "./validation"
import { http } from "./http"
import { useRootColors } from "./useRootColors"
import { buildUrlPattern, buildPreviewUrl } from "./poster-url"
import { selectBestLogo, logoBestLogoFallbackReason } from "./logo-selection"
import { useTrending } from "./useTrending"
import { useSearch } from "./useSearch"
import { useNavigation } from "./useNavigation"
import { useMappingsStore } from "./useMappingsStore"
import { usePosterEditor, PosterEditorProvider } from "./contexts/PosterEditorContext"
import { usePosterSave } from "./usePosterSave"
import { defaultGradientHeightForPoster } from "./gradient-defaults"
import { computeLogoOffsetBounds } from "./logo-layout"
import { useOutsideDismiss } from "./useOutsideDismiss"
import type { PosteriumUserConfig } from "./config-token"
import { SearchProvider } from "./contexts/SearchContext"
import { SettingsProvider } from "./contexts/SettingsContext"
import { TranslationProvider } from "./contexts/TranslationContext"

export type ViewType = "search" | "myposters" | "edit" | "cataloghi"

export interface MetaInfo {
  genres: { id: number; name: string }[]
  voteAverage: number
  type?: string
  status?: string
  release_date?: string
  first_air_date?: string
  last_air_date?: string
  next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null
  number_of_seasons?: number
  number_of_episodes?: number
  awards?: string[]
  nominations?: string[]
  studios?: string[]
  director?: string | null
  keywords?: string[]
  imdb_id?: string | null
}

export interface PosteriumCtx {
  selected: SearchResult | null
  setSelected: React.Dispatch<React.SetStateAction<SearchResult | null>>
  view: ViewType
  setView: React.Dispatch<React.SetStateAction<ViewType>>
  /** Navigazione centralizzata (push/replace/back). */
  router: { push: (v: ViewType) => void; replace: (v: ViewType) => void; back: () => void }
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
  metaInfo: MetaInfo
  previewId: string | null
  setPreviewId: React.Dispatch<React.SetStateAction<string | null>>
  saveConfig: () => Promise<void>
  removeMapping: (m: Mapping) => Promise<void>
  mappingsMap: Map<string, Mapping>
  goHome: () => void
  sourceView: "edit" | "search" | "myposters" | "cataloghi" | null
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
  accentColor: string | null
  setAccentColor: (v: string | null) => void
  topEdgeColor: string | null
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

// Store scoped al provider per la subscription ottimizzata (usePSelector):
// ogni PosteriumProvider ha il proprio store, così i test restano isolati e i
// selettori ri-renderizzano SOLO quando lo slice selezionato cambia (Object.is).
interface SelectorStore {
  value: PosteriumCtx | null
  listeners: Set<() => void>
}
const SelectorStoreCtx = createContext<SelectorStore | null>(null)

/**
 * Consuma solo lo slice richiesto del contesto Posterium. Il componente
 * ri-renderizza SOLO quando il valore selezionato cambia (Object.is), non a
 * ogni aggiornamento di qualsiasi slice. Il selettore DEVE restituire un
 * riferimento stabile (primitiva o campo di stato esistente), mai un oggetto
 * nuovo creato inline, altrimenti il confronto fallisce.
 */
export function usePSelector<T>(selector: (v: PosteriumCtx) => T): T {
  const store = useContext(SelectorStoreCtx)
  if (!store) throw new Error("usePSelector must be inside PosteriumProvider")
  const get = (): T | undefined => (store.value ? selector(store.value) : undefined)
  return useSyncExternalStore(
    (cb) => {
      store.listeners.add(cb)
      return () => { store.listeners.delete(cb) }
    },
    get,
    get,
  ) as T
}

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
  const storeRef = useRef<SelectorStore | null>(null)
  if (!storeRef.current) storeRef.current = { value: null, listeners: new Set() }
  const store = storeRef.current
  // Aggiorna lo store durante il render per coerenza del getSnapshot
  store.value = value
  useEffect(() => {
    store.listeners.forEach((l) => l())
  }, [value, store])
  return (
    <SelectorStoreCtx.Provider value={store}>
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
    </SelectorStoreCtx.Provider>
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
  // Helper per localStorage: evita crash in Safari ITP / Brave Shield / Firefox Strict
  const safeGetItem = useCallback((key: string): string | null => {
    try { return localStorage.getItem(key) } catch { return null }
  }, [])
  const safeSetItem = useCallback((key: string, val: string): void => {
    try { localStorage.setItem(key, val) } catch { /* localStorage non disponibile */ }
  }, [])

  const [lang, setLang] = useState("it")
  const [tmdbKey, setTmdbKeyState] = useState("")
  const [mdblistApiKey, setMdblistApiKey] = useState("")
  const [tmdbKeyInput, setTmdbKeyInput] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  // Lettura differita in useEffect per evitare hydration mismatch client/server
  const [uiAccent, setUiAccent] = useState(false)
  useEffect(() => {
    const saved = safeGetItem("posterium_ui_accent")
    if (saved === "true") setUiAccent(true)
  }, [safeGetItem])
  useEffect(() => { safeSetItem("posterium_ui_accent", String(uiAccent)) }, [uiAccent, safeSetItem])
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
    badgeGenre, setBadgeGenre,
    badgeYear, setBadgeYear,
    badgeRating, setBadgeRating,
    badgeStyle, setBadgeStyle,
    rankingBadgeStyle, setRankingBadgeStyle,
    customBadge, setCustomBadge,
    networkLogo, setNetworkLogo,
    ribbonSide,
    // Defaults
    defaultBadgeStyle,
    defaultRankingBadgeStyle,
    defaultBlurEnabled,
    defaultBlurIntensity,
    defaultBlurFade,
    defaultBlurDarkness,
    defaultGradientHeight,
    defaultAutoRotateClean,
    defaultLogoFitEnabled,
    defaultNetworkLogo,
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
    setBackdrops,
    selectedBackdrop, setSelectedBackdrop,
    backdropScale, setBackdropScale,
    backdropOffsetX, setBackdropOffsetX,
    backdropOffsetY, setBackdropOffsetY,
    // Editing UI
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
    safeSetItem("posterium_profile_password", v)
  }, [safeSetItem])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [metaInfo, setMetaInfo] = useState<MetaInfo>({ genres: [], voteAverage: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [trendRank, setTrendRank] = useState<number | null>(null)
  const [mdblistMatch, setMdblistMatch] = useState<{ key: string; rank: number } | null>(null)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [imdbTop250, setImdbTop250] = useState(false)
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [topEdgeColor, setTopEdgeColor] = useState<string | null>(null)
  const [serviceErrors, setServiceErrors] = useState<Record<string, boolean>>({})

  const [loadingImages, setLoadingImages] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const posterScrollRef = useRef<HTMLDivElement>(null)
  const [posterScrollInfo, setPosterScrollInfo] = useState({ top: 0, height: 100 })
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)


  // Appearance state (logo, backdrop, editing — owned by PosterEditorProvider via usePosterEditor())
  // Specchio client di hasGenreBadge (server): il badge è visibile se almeno uno dei
  // 3 componenti (genere/anno/voto) è abilitato E disponibile.
  const metaYear = (metaInfo.release_date || metaInfo.first_air_date || "").slice(0, 4)
  const genreAvailable = metaInfo.genres.length > 0
  const ratingAvailable = metaInfo.voteAverage > 0
  const yearAvailable = !!metaYear
  const hasBadges = globalBadges
    && ((genreAvailable && badgeGenre) || (ratingAvailable && badgeRating) || (yearAvailable && badgeYear))
  const hasNetflixRank = !!(trendRank || (navigation.selected && trending.mdblistAnimeList.some((a: EnrichedAnimeItem) => a.id === navigation.selected!.id)))

  // Auto-resolve IMDb Top 250 membership.
  // Guard di race: se metaInfo.imdb_id cambia mentre una fetch è in flight,
  // la risposta stale per l'id precedente NON deve sovrascrivere lo stato
  // corrente. fetchIdRef traccia quale id è quello "attivo"; l'AbortController
  // cancella fisicamente la richiesta precedente.
  const fetchIdRef = useRef<string | null>(null)
  useEffect(() => {
    const imdbId = metaInfo.imdb_id
    if (!imdbId) { fetchIdRef.current = null; setImdbTop250(false); return }
    fetchIdRef.current = imdbId
    const ac = new AbortController()
    fetch(`/api/imdb-top250?imdbId=${encodeURIComponent(imdbId)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (fetchIdRef.current === imdbId) setImdbTop250(!!d.inTop250)
      })
      .catch(() => {
        if (ac.signal.aborted || fetchIdRef.current !== imdbId) return
        setImdbTop250(false)
      })
    return () => { ac.abort(); if (fetchIdRef.current === imdbId) fetchIdRef.current = null }
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
    const saved = safeGetItem("tmdb_key") || ""
    setTmdbKeyState(saved)
    setTmdbKeyInput(saved)
    const mdblistKey = safeGetItem("mdblist_key") || ""
    setMdblistApiKey(mdblistKey)
    const savedTheme = safeGetItem("posterium_theme")
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme)
    const savedProfileId = safeGetItem("posterium_profile_id")
    if (savedProfileId) setProfileId(savedProfileId)
    const savedProfilePassword = safeGetItem("posterium_profile_password")
    if (savedProfilePassword) setProfilePassword(savedProfilePassword)
  }, [safeGetItem])

  const setTmdbKey = (val: string) => {
    setTmdbKeyState(val)
    setTmdbKeyInput(val)
    safeSetItem("tmdb_key", val)
  }

  const setMdblistApiKeyFn = (val: string) => {
    setMdblistApiKey(val)
    safeSetItem("mdblist_key", val)
  }

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", theme === "light")
    safeSetItem("posterium_theme", theme)
  }, [theme, safeSetItem])

  useEffect(() => {
    if (langInit.current) return
    langInit.current = true
    const saved = safeGetItem("preferred_lang")
    if (saved) {
      setLang(saved)
    } else {
      setShowLangPicker(true)
    }
  }, [safeGetItem])

  const pickLang = (l: string) => {
    setLang(l)
    setI18nLang(l)
    safeSetItem("preferred_lang", l)
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
      badgeGenre, badgeYear, badgeRating,
      customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo, ribbonSide,
      tmdbKey, lang, profileId,
    }))
  }, [globalBadges, rankingBadges, badgeGenre, badgeYear, badgeRating, networkLogo, ribbonSide, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle, rankingBadgeStyle, tmdbKey, lang, profileId]) // eslint-disable-line react-hooks/exhaustive-deps -- customBadge intentionally excluded to avoid loop

  // Auto-sync profile configuration when profileId is active
  const lastSyncRef = useRef<string>("")
  useEffect(() => {
    if (!profileId) return
    const config = {
      globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle,
      badgeGenre: badgeGenre === false ? false : undefined,
      badgeYear: badgeYear === false ? false : undefined,
      badgeRating: badgeRating === false ? false : undefined,
      blurEnabled, blurIntensity, blurFade, blurDarkness,
      gradientHeight, networkLogo, ribbonSide, autoRotateClean, logoFitEnabled: defaultLogoFitEnabled,
      customBadge: customBadge || undefined,
    }
    // `profilePassword` è nella chiave di dedup: è una dependency dell'effetto ma non
    // parte di `config`, quindi senza include un cambio password durante il debounce
    // veniva perso (l'effetto ripartiva con payload identico e non riprogrammava il POST).
    const payloadStr = JSON.stringify({ config, profileId, password: profilePassword || undefined, tmdbKey, mdblistApiKey })
    // Imposta il ref PRIMA dello schedule: così il debounce dedup correttamente anche
    // se l'effetto riparte con lo stesso payload prima che il timer scatti.
    if (lastSyncRef.current === payloadStr) return
    lastSyncRef.current = payloadStr

    const timer = setTimeout(() => {
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          profileId,
          password: profilePassword || undefined,
          apiKeys: { tmdbKey: tmdbKey || undefined, mdblistApiKey: mdblistApiKey || undefined },
        }),
      }).catch((e) => {
        console.error("[profile] Auto-sync failed:", e)
        // Se il POST fallisce (rete giù, serverless cold start), resetta il ref così
        // un successivo cambio di config riprova invece di considerare "già sincronizzato".
        lastSyncRef.current = ""
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [profileId, profilePassword, globalBadges, rankingBadges, badgeGenre, badgeYear, badgeRating, badgeStyle, rankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, networkLogo, ribbonSide, autoRotateClean, defaultLogoFitEnabled, customBadge, tmdbKey, mdblistApiKey])

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
      { globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, badgeGenre, badgeYear, badgeRating, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo, ribbonSide }
    )
    setPreviewUrl(url)
  }, [navigation.selected, navigation.previewPoster, navigation.selectedLogo, selectedBackdrop,
    logoScale, logoOffsetX, logoOffsetY, backdropScale, backdropOffsetX, backdropOffsetY,
    metaInfo, trendRank, trending.mdblistAnimeList, topEdgeColor, accentColor, lang, tmdbKey,
    globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, badgeGenre, badgeYear, badgeRating, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo, ribbonSide])

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
  useRootColors(navigation.previewPoster, metaInfo.genres[0]?.name, posterUrl, { setAccentColor, setTopEdgeColor })

  // --- Caricamento dati item corrente (M16) ---
  // Condiviso tra openPosterBrowser e l'effetto cambio lingua: ricarica
  // dettagli + rank + awards + immagini, aggiornando metaInfo (generi/voto/badge),
  // trendRank, mdblistMatch, posters/logos/backdrops e titolo. La guardia
  // fetchIdRef evita che una risposta stale sovrascriva la selezione corrente.
  async function loadCurrentItemData(item: SearchResult, fetchId: number) {
    const itemId = item.id
    const itemType = item.media_type
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
    if (navigation.fetchIdRef.current !== fetchId) return null
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
    return { details, data, itemId, itemType }
  }

  // --- Poster image refresh ---
  useEffect(() => {
    if (!navigation.selected || !tmdbKey) return
    const item = navigation.selected
    const fetchId = navigation.incrementFetchId()
    // M16: riusa loadCurrentItemData così al cambio lingua si ricaricano anche
    // dettagli/genere/voto/badge, non solo le immagini.
    loadCurrentItemData(item, fetchId).then((loaded) => {
      if (!loaded) return
      const { data } = loaded
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
              setGradientHeight(defaultGradientHeightForPoster(clean))
            } else {
              const itPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "it")
              const enPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "en")
              const nextPoster = itPoster || enPoster || langPoster || firstPoster || navigation.previewPoster
              navigation.setPreviewPoster(nextPoster)
              setGradientHeight(defaultGradientHeightForPoster(nextPoster))
            }
          } else {
            const nextPoster = langPoster || firstPoster || navigation.previewPoster
            navigation.setPreviewPoster(nextPoster)
            setGradientHeight(defaultGradientHeightForPoster(nextPoster))
          }
        }
      }
      if (navigation.previewPoster?.iso_639_1 === null && navigation.selectedLogo) {
        const match = (data.logos || []).find((l: TMDBImage) => l.file_path === navigation.selectedLogo!.file_path)
        if (!match) {
          const autoLogo = selectBestLogo(data.logos || [], lang)
          navigation.setSelectedLogo(autoLogo || navigation.selectedLogo)
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
      setBadgeGenre(existing.badgeGenre ?? true)
      setBadgeYear(existing.badgeYear ?? true)
      setBadgeRating(existing.badgeRating ?? true)
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
      const loaded = await loadCurrentItemData(item, fetchId)
      if (!loaded) return
      const { details, data } = loaded
      const existing = mappingsMap.get(`${itemType}:${itemId}`)
      if (existing) {
        const foundPoster = (data.posters || []).find((p: TMDBImage) => p.file_path === existing.posterPath)
        navigation.setPreviewPoster(foundPoster ? { file_path: foundPoster.file_path, iso_639_1: foundPoster.iso_639_1, vote_average: 0, width: foundPoster.width, height: foundPoster.height } : { file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        let foundLogo: TMDBImage | undefined
        if (existing.logoPath) {
          foundLogo = (data.logos || []).find((l: TMDBImage) => l.file_path === existing.logoPath)
          navigation.setSelectedLogo(foundLogo ? { file_path: foundLogo.file_path, iso_639_1: existing.language, vote_average: 0, width: foundLogo.width, height: foundLogo.height } : { file_path: existing.logoPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        } else if (!existing.logoDisabled) {
          const autoLogo = selectBestLogo(data.logos || [], lang, details.original_language)
          const reason = logoBestLogoFallbackReason(autoLogo, lang, details.original_language)
          if (reason === "origLang") console.warn(`[posterium] Logo fallback to original_language "${details.original_language}" for ${itemType}/${itemId}`)
          else if (reason === "any") console.warn(`[posterium] Logo fallback to any (first available) for ${itemType}/${itemId}`)
          else if (reason === "none") console.warn(`[posterium] No logo available for ${itemType}/${itemId}`)
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
        setNetworkLogo(existing.networkLogo ?? defaultNetworkLogo)
      } else {
        setLogoDisabled(false)
        setNetworkLogo(defaultNetworkLogo)
        const clean = data.posters?.find((p: TMDBImage) => p.iso_639_1 === null)
        const langPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === lang)
        const firstPoster = data.posters?.[0]
        let chosenPoster: TMDBImage | null = null
        if (clean) {
          const autoLogo = selectBestLogo(data.logos || [], lang, details.original_language)
          const reason = logoBestLogoFallbackReason(autoLogo, lang, details.original_language)
          if (reason === "origLang") console.warn(`[posterium] Logo fallback to original_language "${details.original_language}" for ${itemType}/${itemId}`)
          else if (reason === "any") console.warn(`[posterium] Logo fallback to any (first available) for ${itemType}/${itemId}`)
          else if (reason === "none") console.warn(`[posterium] No logo available for ${itemType}/${itemId}`)
          if (autoLogo) {
            chosenPoster = clean
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
              chosenPoster = fallbackPoster
              navigation.setPreviewPoster({ file_path: fallbackPoster.file_path, iso_639_1: fallbackPoster.iso_639_1, vote_average: 0, width: 0, height: 0 })
            }
          }
        } else if (langPoster) {
          chosenPoster = langPoster
          navigation.setPreviewPoster({ file_path: langPoster.file_path, iso_639_1: lang, vote_average: 0, width: 0, height: 0 })
        } else {
          const origPoster = details.original_language ? data.posters?.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
          const fallbackPoster = origPoster || firstPoster
          if (fallbackPoster) {
            chosenPoster = fallbackPoster
            navigation.setPreviewPoster({ file_path: fallbackPoster.file_path, iso_639_1: fallbackPoster.iso_639_1, vote_average: 0, width: 0, height: 0 })
          }
        }
        loadDefaultsToState()
        if (chosenPoster) setGradientHeight(defaultGradientHeightForPoster(chosenPoster))
      }
    } finally {
      setLoadingImages(false)
    }
  }
  const openPosterBrowserRef = useRef(openPosterBrowser)
  openPosterBrowserRef.current = openPosterBrowser

  const copyUrl = async () => {
    await navigator.clipboard.writeText(urlPattern)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveAndCopyProfileUrl = useCallback(async () => {
    const config: PosteriumUserConfig = {
      globalBadges,
      rankingBadges,
      badgeGenre: badgeGenre === false ? false : undefined,
      badgeYear: badgeYear === false ? false : undefined,
      badgeRating: badgeRating === false ? false : undefined,
      badgeStyle: badgeStyle as PosteriumUserConfig["badgeStyle"],
      rankingBadgeStyle: rankingBadgeStyle as PosteriumUserConfig["rankingBadgeStyle"],
      blurEnabled,
      blurIntensity,
      blurFade,
      blurDarkness,
      gradientHeight,
      networkLogo,
      ribbonSide,
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
      safeSetItem("posterium_profile_id", newProfileId)
      const url = `${getDomain()}/api/poster/:type/:id?u=${newProfileId}`
      await navigator.clipboard.writeText(url)
      setProfileCopied(true)
      setTimeout(() => setProfileCopied(false), 2000)
    } catch (e) {
      console.error("[posterium] Failed to save profile:", e)
      import("sonner").then(({ toast }) => toast.error("Errore nel salvare il profilo"))
    }
  }, [globalBadges, rankingBadges, badgeGenre, badgeYear, badgeRating, badgeStyle, rankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, networkLogo, ribbonSide, autoRotateClean, defaultLogoFitEnabled, customBadge, profileId, profilePassword, safeSetItem])

  const posterActivePath = navigation.previewPoster?.file_path

  const { selectPoster, selectLogo, removeLogo, selectBackdrop, removeBackdrop, saveConfig: savePosterConfig } = usePosterSave({
    selected: navigation.selected, previewPoster: navigation.previewPoster, selectedLogo: navigation.selectedLogo,
    setSelectedLogo: navigation.setSelectedLogo, setPreviewPoster: navigation.setPreviewPoster, setPreviewId: navigation.setPreviewId,
    posters: navigation.posters, metaInfo, trendRank, mdblistAnimeList: trending.mdblistAnimeList,
    mappingsMap, loadMappings, logoScale, logoOffsetX, logoOffsetY,
    selectedBackdrop, setSelectedBackdrop: setSelectedBackdrop, backdropScale, backdropOffsetX, backdropOffsetY,
    setBackdropScale, setBackdropOffsetX, setBackdropOffsetY,
    globalBadges, rankingBadges, customBadge, badgeStyle, rankingBadgeStyle,
    badgeGenre, badgeYear, badgeRating,
    defaultBadgeStyle, defaultRankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight,
    setGradientHeight,
    rotationPosters, autoRotateClean, defaultAutoRotateClean, excludedPosters, accentColor, logoDisabled, setLogoDisabled,
    setLogoScale, setLogoOffsetX, setLogoOffsetY, networkLogo, ribbonSide, lang, profileId,
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
    router: navigation.router,
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
    goHome: navigation.goHome, sourceView: navigation.sourceView, navigateToPoster: (item: SearchResult, source?: string) => { navigation.navigateToPoster(item, source); openPosterBrowserRef.current(item) },
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
    tmdbKeyInput, showKey, copied, profileCopied, profileId, mdblistApiKey, profilePassword,
    accentColor, setAccentColor,
    topEdgeColor, autoSaveExcludedPosters,
    trending.trending, trending.streamingCharts, trending.mdblistAnimeList,
    trending.refreshLists,
    theme, uiAccent, serviceErrors, hasNetflixRank,
  ])
}
