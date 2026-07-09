"use client"

import { useState, useCallback } from "react"

export interface DefaultsState {
  defaultBadgeStyle: string
  defaultRankingBadgeStyle: string
  defaultBlurEnabled: boolean
  defaultBlurIntensity: number
  defaultBlurFade: number
  defaultBlurDarkness: number
  defaultGradientHeight: number
  defaultGlobalBadges: boolean
  defaultRankingBadges: boolean
  defaultAutoRotateClean: boolean
  globalBadges: boolean
  rankingBadges: boolean
  gradientHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  blurEnabled: boolean
  badgeStyle: string
  rankingBadgeStyle: string
}

const DEFAULTS: DefaultsState = {
  defaultBadgeStyle: "shadow",
  defaultRankingBadgeStyle: "default",
  defaultBlurEnabled: true,
  defaultBlurIntensity: 5,
  defaultBlurFade: 60,
  defaultBlurDarkness: 40,
  defaultGradientHeight: 30,
  defaultGlobalBadges: true,
  defaultRankingBadges: true,
  defaultAutoRotateClean: false,
  globalBadges: true,
  rankingBadges: true,
  gradientHeight: 30,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  blurEnabled: true,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
}

interface StoredDefaults {
  globalBadges?: boolean
  rankingBadges?: boolean
  gradientHeight?: number
  blurIntensity?: number
  blurFade?: number
  blurDarkness?: number
  blurEnabled?: boolean
  badgeStyle?: string
  rankingBadgeStyle?: string
  defaultBadgeStyle?: string
  defaultRankingBadgeStyle?: string
  defaultBlurEnabled?: boolean
  defaultBlurIntensity?: number
  defaultBlurFade?: number
  defaultBlurDarkness?: number
  defaultGradientHeight?: number
  defaultGlobalBadges?: boolean
  defaultRankingBadges?: boolean
  defaultAutoRotateClean?: boolean
  autoRotateClean?: boolean
}

function readStoredDefaults(): StoredDefaults | null {
  if (typeof window === "undefined" || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem("badgeDefaults")
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[defaults] Failed to read local defaults: ${message}`)
    return null
  }
}

export function useDefaults() {
  const [state, setState] = useState<DefaultsState>(() => {
    const d = readStoredDefaults()
    if (!d) return { ...DEFAULTS }
    return {
      defaultBadgeStyle: d.defaultBadgeStyle ?? d.badgeStyle ?? "shadow",
      defaultRankingBadgeStyle: d.defaultRankingBadgeStyle ?? d.rankingBadgeStyle ?? "default",
      defaultBlurEnabled: d.defaultBlurEnabled ?? d.blurEnabled ?? true,
      defaultBlurIntensity: d.defaultBlurIntensity ?? d.blurIntensity ?? 5,
      defaultBlurFade: d.defaultBlurFade ?? d.blurFade ?? 60,
      defaultBlurDarkness: d.defaultBlurDarkness ?? d.blurDarkness ?? 40,
      defaultGradientHeight: d.defaultGradientHeight ?? d.gradientHeight ?? 30,
      defaultGlobalBadges: d.defaultGlobalBadges ?? d.globalBadges ?? true,
      defaultRankingBadges: d.defaultRankingBadges ?? d.rankingBadges ?? true,
      defaultAutoRotateClean: d.defaultAutoRotateClean ?? d.autoRotateClean ?? false,
      globalBadges: d.globalBadges ?? true,
      rankingBadges: d.rankingBadges ?? true,
      gradientHeight: d.gradientHeight ?? 30,
      blurIntensity: d.blurIntensity ?? 5,
      blurFade: d.blurFade ?? 60,
      blurDarkness: d.blurDarkness ?? 40,
      blurEnabled: d.blurEnabled ?? true,
      badgeStyle: d.badgeStyle ?? "shadow",
      rankingBadgeStyle: d.rankingBadgeStyle ?? "default",
    }
  })

  const update = useCallback((patch: Partial<DefaultsState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const loadDefaultsToState = useCallback(() => {
    const d = readStoredDefaults()
    if (!d) {
      setState({ ...DEFAULTS })
      return
    }
    setState({
      defaultBadgeStyle: d.defaultBadgeStyle ?? d.badgeStyle ?? "shadow",
      defaultRankingBadgeStyle: d.defaultRankingBadgeStyle ?? d.rankingBadgeStyle ?? "default",
      defaultBlurEnabled: d.defaultBlurEnabled ?? d.blurEnabled ?? true,
      defaultBlurIntensity: d.defaultBlurIntensity ?? d.blurIntensity ?? 5,
      defaultBlurFade: d.defaultBlurFade ?? d.blurFade ?? 60,
      defaultBlurDarkness: d.defaultBlurDarkness ?? d.blurDarkness ?? 40,
      defaultGradientHeight: d.defaultGradientHeight ?? d.gradientHeight ?? 30,
      defaultGlobalBadges: d.defaultGlobalBadges ?? d.globalBadges ?? true,
      defaultRankingBadges: d.defaultRankingBadges ?? d.rankingBadges ?? true,
      defaultAutoRotateClean: d.defaultAutoRotateClean ?? d.autoRotateClean ?? false,
      globalBadges: d.globalBadges ?? true,
      rankingBadges: d.rankingBadges ?? true,
      gradientHeight: d.gradientHeight ?? 30,
      blurIntensity: d.blurIntensity ?? 5,
      blurFade: d.blurFade ?? 60,
      blurDarkness: d.blurDarkness ?? 40,
      blurEnabled: d.blurEnabled ?? true,
      badgeStyle: d.badgeStyle ?? "shadow",
      rankingBadgeStyle: d.rankingBadgeStyle ?? "default",
    })
  }, [])

  return { ...state, update, loadDefaultsToState }
}
