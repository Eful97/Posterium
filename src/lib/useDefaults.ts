"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { BadgeStyle, RankingBadgeStyle } from "./badge-styles"

export type RibbonSide = "left" | "right"

export interface DefaultsState {
  defaultBadgeStyle: BadgeStyle
  defaultRankingBadgeStyle: RankingBadgeStyle
  defaultBlurEnabled: boolean
  defaultBlurIntensity: number
  defaultBlurFade: number
  defaultBlurDarkness: number
  defaultGradientHeight: number
  defaultGlobalBadges: boolean
  defaultRankingBadges: boolean
  defaultAutoRotateClean: boolean
  defaultLogoFitEnabled: boolean
  defaultNetworkLogo: boolean
  defaultRibbonSide: RibbonSide
  globalBadges: boolean
  rankingBadges: boolean
  networkLogo: boolean
  ribbonSide: RibbonSide
  gradientHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  blurEnabled: boolean
  badgeStyle: BadgeStyle
  rankingBadgeStyle: RankingBadgeStyle
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
  defaultLogoFitEnabled: true,
  defaultNetworkLogo: true,
  defaultRibbonSide: "left",
  globalBadges: true,
  rankingBadges: true,
  networkLogo: true,
  ribbonSide: "left",
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
  networkLogo?: boolean
  gradientHeight?: number
  blurIntensity?: number
  blurFade?: number
  blurDarkness?: number
  blurEnabled?: boolean
  badgeStyle?: BadgeStyle
  rankingBadgeStyle?: RankingBadgeStyle
  defaultBadgeStyle?: BadgeStyle
  defaultRankingBadgeStyle?: RankingBadgeStyle
  defaultBlurEnabled?: boolean
  defaultBlurIntensity?: number
  defaultBlurFade?: number
  defaultBlurDarkness?: number
  defaultGradientHeight?: number
  defaultGlobalBadges?: boolean
  defaultRankingBadges?: boolean
  defaultAutoRotateClean?: boolean
  defaultLogoFitEnabled?: boolean
  defaultNetworkLogo?: boolean
  defaultRibbonSide?: RibbonSide
  ribbonSide?: RibbonSide
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

function safeSetItem(key: string, val: string) {
  try { localStorage.setItem(key, val) } catch { /* localStorage non disponibile */ }
}

function buildFromStored(d: StoredDefaults | null): DefaultsState {
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
    defaultLogoFitEnabled: d.defaultLogoFitEnabled ?? true,
    defaultNetworkLogo: d.defaultNetworkLogo ?? d.networkLogo ?? true,
    defaultRibbonSide: d.defaultRibbonSide ?? d.ribbonSide ?? "left",
    globalBadges: d.globalBadges ?? true,
    rankingBadges: d.rankingBadges ?? true,
    networkLogo: d.networkLogo ?? true,
    ribbonSide: d.ribbonSide ?? "left",
    gradientHeight: d.gradientHeight ?? 30,
    blurIntensity: d.blurIntensity ?? 5,
    blurFade: d.blurFade ?? 60,
    blurDarkness: d.blurDarkness ?? 40,
    blurEnabled: d.blurEnabled ?? true,
    badgeStyle: d.badgeStyle ?? "shadow",
    rankingBadgeStyle: d.rankingBadgeStyle ?? "default",
  }
}

/**
 * Payload dei SOLI default persistiti — allineato allo schema server
 * (`defaultsSchema` in `/api/defaults`) e allo shape scritto da `saveDefaults`.
 * Non include i valori "corrente" (globalBadges, badgeStyle…) che dipendono
 * dal poster in editing.
 */
function defaultsToPayload(d: DefaultsState): Record<string, unknown> {
  return {
    badgeStyle: d.defaultBadgeStyle,
    rankingBadgeStyle: d.defaultRankingBadgeStyle,
    blurEnabled: d.defaultBlurEnabled,
    blurIntensity: d.defaultBlurIntensity,
    blurFade: d.defaultBlurFade,
    blurDarkness: d.defaultBlurDarkness,
    gradientHeight: d.defaultGradientHeight,
    globalBadges: d.defaultGlobalBadges,
    rankingBadges: d.defaultRankingBadges,
    autoRotateClean: d.defaultAutoRotateClean,
    defaultLogoFitEnabled: d.defaultLogoFitEnabled,
    networkLogo: d.defaultNetworkLogo,
    ribbonSide: d.defaultRibbonSide,
  }
}

export function useDefaults() {
  // Stato iniziale deterministico (DEFAULTS): la lettura di localStorage è rimandata
  // al mount via useEffect. Durante la SSR `window` non esiste (readStoredDefaults
  // torna null) quindi l'HTML server usa i default; leggere lo storage nell'initializer
  // di useState avrebbe prodotto un hydration mismatch con l'HTML renderizzato dal server.
  const [state, setState] = useState<DefaultsState>(() => ({ ...DEFAULTS }))

  // Ref di dedup per l'auto-persist: primato durante l'hydration con il payload appena
  // caricato, così il primo run dell'effetto di sync trova payload identico e non scrive.
  const lastPersistRef = useRef<string>("")

  useEffect(() => {
    const stored = readStoredDefaults()
    const hydrated = buildFromStored(stored)
    setState(hydrated)
    lastPersistRef.current = JSON.stringify(defaultsToPayload(hydrated))
  }, [])

  // Auto-persist con debounce (1s): ogni cambio dei default scrive su localStorage
  // e tenta il sync server (/api/defaults). Dedup via payload string — se cambiano
  // solo i valori "corrente" (globalBadges, badgeStyle…) il payload resta identico
  // e non viene schedulata nessuna scrittura. Il PUT server può ricevere 401 se è
  // configurato un POSTERIUM_ADMIN_TOKEN: il catch silenzioso lascia il comportamento
  // invariato (stesso fail-open del bottone manuale "Save Defaults").
  useEffect(() => {
    const payload = defaultsToPayload(state)
    const payloadStr = JSON.stringify(payload)
    if (lastPersistRef.current === payloadStr) return
    lastPersistRef.current = payloadStr

    const timer = setTimeout(() => {
      safeSetItem("badgeDefaults", payloadStr)
      fetch("/api/defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payloadStr,
      }).catch((error: unknown) => {
        // Se il PUT fallisce (rete, serverless cold start, 401 admin) resetta il ref
        // così un successivo cambio di default riprova invece di considerare "sincronizzato".
        lastPersistRef.current = ""
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[defaults] Auto-sync failed: ${message}`)
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [state])

  const update = useCallback((patch: Partial<DefaultsState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const loadDefaultsToState = useCallback(() => {
    const stored = readStoredDefaults()
    setState(buildFromStored(stored))
    lastPersistRef.current = JSON.stringify(defaultsToPayload(buildFromStored(stored)))
  }, [])

  return { ...state, update, loadDefaultsToState }
}
