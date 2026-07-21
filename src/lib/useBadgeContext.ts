"use client"

import { useState } from "react"
import { useDefaults } from "./useDefaults"

export function useBadgeState() {
  const defaults = useDefaults()

  const {
    globalBadges, rankingBadges, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled,
    badgeStyle,
    defaultBadgeStyle, defaultBlurEnabled, defaultBlurIntensity, defaultBlurFade, defaultBlurDarkness, defaultGradientHeight,
    defaultGlobalBadges, defaultRankingBadges, defaultAutoRotateClean, defaultLogoFitEnabled,
    loadDefaultsToState,
  } = defaults

  const [customBadge, setCustomBadge] = useState<string | null>(null)

  const setGlobalBadges = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(globalBadges) : v; defaults.update({ globalBadges: next }) }
  const setRankingBadges = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(rankingBadges) : v; defaults.update({ rankingBadges: next }) }
  const setGradientHeight = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(gradientHeight) : v; defaults.update({ gradientHeight: next }) }
  const setBlurIntensity = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(blurIntensity) : v; defaults.update({ blurIntensity: next }) }
  const setBlurFade = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(blurFade) : v; defaults.update({ blurFade: next }) }
  const setBlurDarkness = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(blurDarkness) : v; defaults.update({ blurDarkness: next }) }
  const setBlurEnabled = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(blurEnabled) : v; defaults.update({ blurEnabled: next }) }
  const setBadgeStyle = (v: string | ((prev: string) => string)) => { const next = typeof v === "function" ? v(badgeStyle) : v; defaults.update({ badgeStyle: next }) }
  const setDefaultBadgeStyle = (v: string | ((prev: string) => string)) => { const next = typeof v === "function" ? v(defaultBadgeStyle) : v; defaults.update({ defaultBadgeStyle: next }) }
  const setDefaultBlurEnabled = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultBlurEnabled) : v; defaults.update({ defaultBlurEnabled: next }) }
  const setDefaultBlurIntensity = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(defaultBlurIntensity) : v; defaults.update({ defaultBlurIntensity: next }) }
  const setDefaultBlurFade = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(defaultBlurFade) : v; defaults.update({ defaultBlurFade: next }) }
  const setDefaultBlurDarkness = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(defaultBlurDarkness) : v; defaults.update({ defaultBlurDarkness: next }) }
  const setDefaultGradientHeight = (v: number | ((prev: number) => number)) => { const next = typeof v === "function" ? v(defaultGradientHeight) : v; defaults.update({ defaultGradientHeight: next }) }
  const setDefaultGlobalBadges = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultGlobalBadges) : v; defaults.update({ defaultGlobalBadges: next }) }
  const setDefaultRankingBadges = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultRankingBadges) : v; defaults.update({ defaultRankingBadges: next }) }
  const setDefaultAutoRotateClean = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultAutoRotateClean) : v; defaults.update({ defaultAutoRotateClean: next }) }
  const setDefaultLogoFitEnabled = (v: boolean | ((prev: boolean) => boolean)) => { const next = typeof v === "function" ? v(defaultLogoFitEnabled) : v; defaults.update({ defaultLogoFitEnabled: next }) }

  return {
    globalBadges, setGlobalBadges,
    rankingBadges, setRankingBadges,
    customBadge, setCustomBadge,
    gradientHeight, setGradientHeight,
    blurIntensity, setBlurIntensity,
    blurFade, setBlurFade,
    blurDarkness, setBlurDarkness,
    blurEnabled, setBlurEnabled,
    badgeStyle, setBadgeStyle,
    defaultBadgeStyle, setDefaultBadgeStyle,
    defaultBlurEnabled, setDefaultBlurEnabled,
    defaultBlurIntensity, setDefaultBlurIntensity,
    defaultBlurFade, setDefaultBlurFade,
    defaultBlurDarkness, setDefaultBlurDarkness,
    defaultGradientHeight, setDefaultGradientHeight,
    defaultGlobalBadges, setDefaultGlobalBadges,
    defaultRankingBadges, setDefaultRankingBadges,
    defaultAutoRotateClean, setDefaultAutoRotateClean,
    defaultLogoFitEnabled, setDefaultLogoFitEnabled,
    loadDefaultsToState,
  }
}
