"use client"

import { createContext, useContext, useState, useMemo, useCallback } from "react"
import type { TMDBImage } from "@/lib/types"
import { useDefaults } from "@/lib/useDefaults"
import type { BadgeStyle, RankingBadgeStyle } from "@/lib/badge-styles"

/**
 * PosterEditorCtx — possiede il proprio stato di editing (badge defaults,
 * posizionamento logo/backdrop, rotazione, esclusioni).
 * È il SINGLE SOURCE OF TRUTH per tutti i campi editor.
 *
 * I consumer che usano SOLO usePosterEditor() (es. BadgeControls, TransformControls)
 * NON ri-renderizzano quando cambia trending/search/navigation.
 */
export interface PosterEditorCtx {
  // ---- Badges ----
  globalBadges: boolean
  setGlobalBadges: (v: boolean | ((prev: boolean) => boolean)) => void
  rankingBadges: boolean
  setRankingBadges: (v: boolean | ((prev: boolean) => boolean)) => void
  /** Componenti del badge genere/rating (default tutti ON). */
  badgeGenre: boolean
  setBadgeGenre: (v: boolean | ((prev: boolean) => boolean)) => void
  badgeYear: boolean
  setBadgeYear: (v: boolean | ((prev: boolean) => boolean)) => void
  badgeRating: boolean
  setBadgeRating: (v: boolean | ((prev: boolean) => boolean)) => void
  badgeStyle: BadgeStyle
  setBadgeStyle: (v: BadgeStyle | ((prev: BadgeStyle) => BadgeStyle)) => void
  rankingBadgeStyle: RankingBadgeStyle
  setRankingBadgeStyle: (v: RankingBadgeStyle | ((prev: RankingBadgeStyle) => RankingBadgeStyle)) => void
  badgeFont: string
  setBadgeFont: (v: string | ((prev: string) => string)) => void
  customBadge: string | null
  setCustomBadge: (v: string | null | ((prev: string | null) => string | null)) => void
  networkLogo: boolean
  setNetworkLogo: (v: boolean | ((prev: boolean) => boolean)) => void
  ribbonSide: "left" | "right"
  setRibbonSide: (v: "left" | "right" | ((prev: "left" | "right") => "left" | "right")) => void

  // ---- Defaults ----
  defaultBadgeStyle: BadgeStyle
  setDefaultBadgeStyle: (v: BadgeStyle | ((prev: BadgeStyle) => BadgeStyle)) => void
  defaultRankingBadgeStyle: RankingBadgeStyle
  setDefaultRankingBadgeStyle: (v: RankingBadgeStyle | ((prev: RankingBadgeStyle) => RankingBadgeStyle)) => void
  defaultBadgeFont: string
  setDefaultBadgeFont: (v: string | ((prev: string) => string)) => void
  defaultBlurEnabled: boolean
  setDefaultBlurEnabled: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultBlurIntensity: number
  setDefaultBlurIntensity: (v: number | ((prev: number) => number)) => void
  defaultBlurFade: number
  setDefaultBlurFade: (v: number | ((prev: number) => number)) => void
  defaultBlurDarkness: number
  setDefaultBlurDarkness: (v: number | ((prev: number) => number)) => void
  defaultGradientHeight: number
  setDefaultGradientHeight: (v: number | ((prev: number) => number)) => void
  defaultGlobalBadges: boolean
  setDefaultGlobalBadges: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultRankingBadges: boolean
  setDefaultRankingBadges: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultBadgeGenre: boolean
  setDefaultBadgeGenre: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultBadgeYear: boolean
  setDefaultBadgeYear: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultBadgeRating: boolean
  setDefaultBadgeRating: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultAutoRotateClean: boolean
  setDefaultAutoRotateClean: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultLogoFitEnabled: boolean
  setDefaultLogoFitEnabled: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultNetworkLogo: boolean
  setDefaultNetworkLogo: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultRibbonSide: "left" | "right"
  setDefaultRibbonSide: (v: "left" | "right" | ((prev: "left" | "right") => "left" | "right")) => void
  loadDefaultsToState: () => void

  // ---- Blur ----
  blurEnabled: boolean
  setBlurEnabled: (v: boolean | ((prev: boolean) => boolean)) => void
  blurIntensity: number
  setBlurIntensity: (v: number | ((prev: number) => number)) => void
  blurFade: number
  setBlurFade: (v: number | ((prev: number) => number)) => void
  blurDarkness: number
  setBlurDarkness: (v: number | ((prev: number) => number)) => void

  // ---- Gradient ----
  gradientHeight: number
  setGradientHeight: (v: number | ((prev: number) => number)) => void

  // ---- Logo ----
  logoScale: number
  setLogoScale: (v: number | ((prev: number) => number)) => void
  logoOffsetX: number
  setLogoOffsetX: (v: number | ((prev: number) => number)) => void
  logoOffsetY: number
  setLogoOffsetY: (v: number | ((prev: number) => number)) => void
  logoDisabled: boolean
  setLogoDisabled: (v: boolean | ((prev: boolean) => boolean)) => void
  // ---- Backdrop ----
  backdrops: TMDBImage[]
  setBackdrops: (v: TMDBImage[] | ((prev: TMDBImage[]) => TMDBImage[])) => void
  selectedBackdrop: TMDBImage | null
  setSelectedBackdrop: (v: TMDBImage | null | ((prev: TMDBImage | null) => TMDBImage | null)) => void
  backdropScale: number
  setBackdropScale: (v: number | ((prev: number) => number)) => void
  backdropOffsetX: number
  setBackdropOffsetX: (v: number | ((prev: number) => number)) => void
  backdropOffsetY: number
  setBackdropOffsetY: (v: number | ((prev: number) => number)) => void

  // ---- Editing UI ----
  editingValue: string | null
  setEditingValue: (v: string | null | ((prev: string | null) => string | null)) => void
  editText: string
  setEditText: (v: string | ((prev: string) => string)) => void

  // ---- Rotation / esclusioni ----
  rotationPosters: string[]
  setRotationPosters: (v: string[] | ((prev: string[]) => string[])) => void
  autoRotateClean: boolean
  setAutoRotateClean: (v: boolean | ((prev: boolean) => boolean)) => void
  excludedPosters: string[]
  setExcludedPosters: (v: string[] | ((prev: string[]) => string[])) => void
}

const Ctx = createContext<PosterEditorCtx | null>(null)

export function usePosterEditor() {
  const v = useContext(Ctx)
  if (!v) throw new Error("usePosterEditor must be inside PosterEditorProvider")
  return v
}

/**
 * PosterEditorProvider — ORA possiede il proprio stato.
 * Non dipende più da PosteriumCtx.
 * Crea useDefaults() internamente per badge/blur/gradient defaults persistenti,
 * e useState per logo/backdrop/rotazione/editing.
 */
export function PosterEditorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const defaults = useDefaults()

  const {
    globalBadges, rankingBadges, networkLogo, ribbonSide,
    badgeGenre, badgeYear, badgeRating,
    gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled,
    badgeStyle, rankingBadgeStyle, badgeFont,
    defaultBadgeStyle, defaultRankingBadgeStyle, defaultBadgeFont,
    defaultBlurEnabled, defaultBlurIntensity, defaultBlurFade, defaultBlurDarkness,
    defaultGradientHeight, defaultGlobalBadges, defaultRankingBadges,
    defaultBadgeGenre, defaultBadgeYear, defaultBadgeRating,
    defaultAutoRotateClean, defaultLogoFitEnabled, defaultNetworkLogo, defaultRibbonSide,
    loadDefaultsToState, update,
  } = defaults

  const setGlobalBadges = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(globalBadges) : v
      update({ globalBadges: next })
    }, [globalBadges, update])
  const setRankingBadges = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(rankingBadges) : v
      update({ rankingBadges: next })
    }, [rankingBadges, update])
  const setBadgeGenre = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(badgeGenre) : v
      update({ badgeGenre: next })
    }, [badgeGenre, update])
  const setBadgeYear = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(badgeYear) : v
      update({ badgeYear: next })
    }, [badgeYear, update])
  const setBadgeRating = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(badgeRating) : v
      update({ badgeRating: next })
    }, [badgeRating, update])
  const setNetworkLogo = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(networkLogo) : v
      update({ networkLogo: next })
    }, [networkLogo, update])
  const setRibbonSide = useCallback(
    (v: "left" | "right" | ((prev: "left" | "right") => "left" | "right")) => {
      const next = typeof v === "function" ? v(ribbonSide) : v
      update({ ribbonSide: next })
    }, [ribbonSide, update])
  const setGradientHeight = useCallback(
    (v: number | ((prev: number) => number)) => {
      const next = typeof v === "function" ? v(gradientHeight) : v
      update({ gradientHeight: next })
    }, [gradientHeight, update])
  const setBlurIntensity = useCallback(
    (v: number | ((prev: number) => number)) => {
      const next = typeof v === "function" ? v(blurIntensity) : v
      update({ blurIntensity: next })
    }, [blurIntensity, update])
  const setBlurFade = useCallback(
    (v: number | ((prev: number) => number)) => {
      const next = typeof v === "function" ? v(blurFade) : v
      update({ blurFade: next })
    }, [blurFade, update])
  const setBlurDarkness = useCallback(
    (v: number | ((prev: number) => number)) => {
      const next = typeof v === "function" ? v(blurDarkness) : v
      update({ blurDarkness: next })
    }, [blurDarkness, update])
  const setBlurEnabled = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(blurEnabled) : v
      update({ blurEnabled: next })
    }, [blurEnabled, update])
  const setBadgeStyle = useCallback(
    (v: BadgeStyle | ((prev: BadgeStyle) => BadgeStyle)) => {
      const next = typeof v === "function" ? v(badgeStyle) : v
      update({ badgeStyle: next })
    }, [badgeStyle, update])
  const setRankingBadgeStyle = useCallback(
    (v: RankingBadgeStyle | ((prev: RankingBadgeStyle) => RankingBadgeStyle)) => {
      const next = typeof v === "function" ? v(rankingBadgeStyle) : v
      update({ rankingBadgeStyle: next })
    }, [rankingBadgeStyle, update])
  const setDefaultBadgeStyle = useCallback(
    (v: BadgeStyle | ((prev: BadgeStyle) => BadgeStyle)) => {
      const next = typeof v === "function" ? v(defaultBadgeStyle) : v
      update({ defaultBadgeStyle: next })
    }, [defaultBadgeStyle, update])
  const setDefaultRankingBadgeStyle = useCallback(
    (v: RankingBadgeStyle | ((prev: RankingBadgeStyle) => RankingBadgeStyle)) => {
      const next = typeof v === "function" ? v(defaultRankingBadgeStyle) : v
      update({ defaultRankingBadgeStyle: next })
    }, [defaultRankingBadgeStyle, update])
  const setBadgeFont = useCallback(
    (v: string | ((prev: string) => string)) => {
      const next = typeof v === "function" ? v(badgeFont) : v
      update({ badgeFont: next })
    }, [badgeFont, update])
  const setDefaultBadgeFont = useCallback(
    (v: string | ((prev: string) => string)) => {
      const next = typeof v === "function" ? v(defaultBadgeFont) : v
      update({ defaultBadgeFont: next })
    }, [defaultBadgeFont, update])
  const setDefaultBlurEnabled = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultBlurEnabled) : v
      update({ defaultBlurEnabled: next })
    }, [defaultBlurEnabled, update])
  const setDefaultBlurIntensity = useCallback(
    (v: number | ((prev: number) => number)) => {
      const next = typeof v === "function" ? v(defaultBlurIntensity) : v
      update({ defaultBlurIntensity: next })
    }, [defaultBlurIntensity, update])
  const setDefaultBlurFade = useCallback(
    (v: number | ((prev: number) => number)) => {
      const next = typeof v === "function" ? v(defaultBlurFade) : v
      update({ defaultBlurFade: next })
    }, [defaultBlurFade, update])
  const setDefaultBlurDarkness = useCallback(
    (v: number | ((prev: number) => number)) => {
      const next = typeof v === "function" ? v(defaultBlurDarkness) : v
      update({ defaultBlurDarkness: next })
    }, [defaultBlurDarkness, update])
  const setDefaultGradientHeight = useCallback(
    (v: number | ((prev: number) => number)) => {
      const next = typeof v === "function" ? v(defaultGradientHeight) : v
      update({ defaultGradientHeight: next })
    }, [defaultGradientHeight, update])
  const setDefaultGlobalBadges = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultGlobalBadges) : v
      update({ defaultGlobalBadges: next })
    }, [defaultGlobalBadges, update])
  const setDefaultRankingBadges = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultRankingBadges) : v
      update({ defaultRankingBadges: next })
    }, [defaultRankingBadges, update])
  const setDefaultBadgeGenre = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultBadgeGenre) : v
      update({ defaultBadgeGenre: next })
    }, [defaultBadgeGenre, update])
  const setDefaultBadgeYear = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultBadgeYear) : v
      update({ defaultBadgeYear: next })
    }, [defaultBadgeYear, update])
  const setDefaultBadgeRating = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultBadgeRating) : v
      update({ defaultBadgeRating: next })
    }, [defaultBadgeRating, update])
  const setDefaultAutoRotateClean = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultAutoRotateClean) : v
      update({ defaultAutoRotateClean: next })
    }, [defaultAutoRotateClean, update])
  const setDefaultLogoFitEnabled = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultLogoFitEnabled) : v
      update({ defaultLogoFitEnabled: next })
    }, [defaultLogoFitEnabled, update])
  const setDefaultNetworkLogo = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(defaultNetworkLogo) : v
      update({ defaultNetworkLogo: next })
    }, [defaultNetworkLogo, update])
  const setDefaultRibbonSide = useCallback(
    (v: "left" | "right" | ((prev: "left" | "right") => "left" | "right")) => {
      const next = typeof v === "function" ? v(defaultRibbonSide) : v
      update({ defaultRibbonSide: next })
    }, [defaultRibbonSide, update])

  // ---- Logo state ----
  const [logoScale, setLogoScale] = useState(75)
  const [logoOffsetX, setLogoOffsetX] = useState(0)
  const [logoOffsetY, setLogoOffsetY] = useState(0)
  const [logoDisabled, setLogoDisabled] = useState(false)

  // ---- Backdrop state ----
  const [backdrops, setBackdrops] = useState<TMDBImage[]>([])
  const [selectedBackdrop, setSelectedBackdrop] = useState<TMDBImage | null>(null)
  const [backdropScale, setBackdropScale] = useState(100)
  const [backdropOffsetX, setBackdropOffsetX] = useState(0)
  const [backdropOffsetY, setBackdropOffsetY] = useState(0)

  // ---- Editing UI ----
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // ---- Rotation / esclusioni ----
  const [rotationPosters, setRotationPosters] = useState<string[]>([])
  const [autoRotateClean, setAutoRotateClean] = useState(false)
  const [excludedPosters, setExcludedPosters] = useState<string[]>([])

  // ---- Custom badge ----
  const [customBadge, setCustomBadge] = useState<string | null>(null)

  const editorCtx = useMemo<PosterEditorCtx>(
    () => ({
      // Badges
      globalBadges,
      setGlobalBadges,
      rankingBadges,
      setRankingBadges,
      badgeGenre,
      setBadgeGenre,
      badgeYear,
      setBadgeYear,
      badgeRating,
      setBadgeRating,
      badgeStyle,
      setBadgeStyle,
      rankingBadgeStyle,
      setRankingBadgeStyle,
      badgeFont,
      setBadgeFont,
      customBadge,
      setCustomBadge,
      networkLogo,
      setNetworkLogo,
      ribbonSide,
      setRibbonSide,

      // Defaults
      defaultBadgeStyle,
      setDefaultBadgeStyle,
      defaultRankingBadgeStyle,
      setDefaultRankingBadgeStyle,
      defaultBadgeFont,
      setDefaultBadgeFont,
      defaultBlurEnabled,
      setDefaultBlurEnabled,
      defaultBlurIntensity,
      setDefaultBlurIntensity,
      defaultBlurFade,
      setDefaultBlurFade,
      defaultBlurDarkness,
      setDefaultBlurDarkness,
      defaultGradientHeight,
      setDefaultGradientHeight,
      defaultGlobalBadges,
      setDefaultGlobalBadges,
      defaultRankingBadges,
      setDefaultRankingBadges,
      defaultBadgeGenre,
      setDefaultBadgeGenre,
      defaultBadgeYear,
      setDefaultBadgeYear,
      defaultBadgeRating,
      setDefaultBadgeRating,
      defaultAutoRotateClean,
      setDefaultAutoRotateClean,
      defaultLogoFitEnabled,
      setDefaultLogoFitEnabled,
      defaultNetworkLogo,
      setDefaultNetworkLogo,
      defaultRibbonSide,
      setDefaultRibbonSide,
      loadDefaultsToState,

      // Blur
      blurEnabled,
      setBlurEnabled,
      blurIntensity,
      setBlurIntensity,
      blurFade,
      setBlurFade,
      blurDarkness,
      setBlurDarkness,

      // Gradient
      gradientHeight,
      setGradientHeight,

      // Logo
      logoScale,
      setLogoScale,
      logoOffsetX,
      setLogoOffsetX,
      logoOffsetY,
      setLogoOffsetY,
      logoDisabled,
      setLogoDisabled,

      // Backdrop
      backdrops,
      setBackdrops,
      selectedBackdrop,
      setSelectedBackdrop,
      backdropScale,
      setBackdropScale,
      backdropOffsetX,
      setBackdropOffsetX,
      backdropOffsetY,
      setBackdropOffsetY,

      // Editing UI
      editingValue,
      setEditingValue,
      editText,
      setEditText,

      // Rotation
      rotationPosters,
      setRotationPosters,
      autoRotateClean,
      setAutoRotateClean,
      excludedPosters,
      setExcludedPosters,
    }),
    [
      // Badges
      globalBadges, setGlobalBadges,
      rankingBadges, setRankingBadges,
      badgeGenre, setBadgeGenre,
      badgeYear, setBadgeYear,
      badgeRating, setBadgeRating,
      badgeStyle, setBadgeStyle,
      rankingBadgeStyle, setRankingBadgeStyle,
      badgeFont, setBadgeFont,
      customBadge, setCustomBadge,
      networkLogo, setNetworkLogo,
      ribbonSide, setRibbonSide,

      // Defaults
      defaultBadgeStyle, setDefaultBadgeStyle,
      defaultRankingBadgeStyle, setDefaultRankingBadgeStyle,
      defaultBadgeFont, setDefaultBadgeFont,
      defaultBlurEnabled, setDefaultBlurEnabled,
      defaultBlurIntensity, setDefaultBlurIntensity,
      defaultBlurFade, setDefaultBlurFade,
      defaultBlurDarkness, setDefaultBlurDarkness,
      defaultGradientHeight, setDefaultGradientHeight,
      defaultGlobalBadges, setDefaultGlobalBadges,
      defaultRankingBadges, setDefaultRankingBadges,
      defaultBadgeGenre, setDefaultBadgeGenre,
      defaultBadgeYear, setDefaultBadgeYear,
      defaultBadgeRating, setDefaultBadgeRating,
      defaultAutoRotateClean, setDefaultAutoRotateClean,
      defaultLogoFitEnabled, setDefaultLogoFitEnabled,
      defaultNetworkLogo, setDefaultNetworkLogo,
      defaultRibbonSide, setDefaultRibbonSide,
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
    ],
  )

  return <Ctx.Provider value={editorCtx}>{children}</Ctx.Provider>
}