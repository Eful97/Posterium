import type { PosteriumCtx } from "@/lib/context"
import type { PosterEditorCtx } from "@/lib/contexts/PosterEditorContext"

function safeSetItem(key: string, val: string) {
  try { localStorage.setItem(key, val) } catch { /* localStorage non disponibile */ }
}

export function saveDefaults(p: { selected: PosteriumCtx["selected"]; mappingsMap: PosteriumCtx["mappingsMap"] }, ed: PosterEditorCtx) {
  const d = {
    globalBadges: ed.defaultGlobalBadges,
    rankingBadges: ed.defaultRankingBadges,
    badgeGenre: ed.defaultBadgeGenre,
    badgeYear: ed.defaultBadgeYear,
    badgeRating: ed.defaultBadgeRating,
    badgeStyle: ed.defaultBadgeStyle,
    rankingBadgeStyle: ed.defaultRankingBadgeStyle,
    blurEnabled: ed.defaultBlurEnabled,
    blurIntensity: ed.defaultBlurIntensity,
    blurFade: ed.defaultBlurFade,
    blurDarkness: ed.defaultBlurDarkness,
    gradientHeight: ed.defaultGradientHeight,
    autoRotateClean: ed.defaultAutoRotateClean,
    defaultLogoFitEnabled: ed.defaultLogoFitEnabled,
    defaultNetworkLogo: ed.defaultNetworkLogo,
    defaultRibbonSide: ed.defaultRibbonSide,
    networkLogo: ed.defaultNetworkLogo,
    ribbonSide: ed.defaultRibbonSide,
  }
  safeSetItem("badgeDefaults", JSON.stringify(d))
  void fetch("/api/defaults", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[defaults] Failed to sync server defaults: ${message}`)
    })
  const key = p.selected ? `${p.selected.media_type}:${p.selected.id}` : null
  const mapping = key ? p.mappingsMap.get(key) : undefined
  if (!mapping?.badgeStyle) ed.setBadgeStyle(d.badgeStyle)
  if (!mapping?.rankingBadgeStyle) ed.setRankingBadgeStyle(d.rankingBadgeStyle)
  ed.setGlobalBadges(d.globalBadges)
  ed.setRankingBadges(d.rankingBadges)
  ed.setBadgeGenre(d.badgeGenre)
  ed.setBadgeYear(d.badgeYear)
  ed.setBadgeRating(d.badgeRating)
  ed.setNetworkLogo(d.networkLogo)
  ed.setRibbonSide(d.ribbonSide)
  ed.setBlurEnabled(d.blurEnabled)
  ed.setBlurIntensity(d.blurIntensity)
  ed.setBlurFade(d.blurFade)
  ed.setBlurDarkness(d.blurDarkness)
  ed.setGradientHeight(d.gradientHeight)
}

/** Valori di fabbrica (stessi di useDefaults.ts) per il ripristino. */
const FACTORY_DEFAULTS = {
  globalBadges: true,
  rankingBadges: true,
  badgeGenre: true,
  badgeYear: true,
  badgeRating: true,
  networkLogo: true,
  ribbonSide: "left",
  gradientHeight: 30,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  blurEnabled: true,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
} as const

/** Ripristina i predefiniti ai valori di fabbrica (localStorage + server + stato editor). */
export function resetDefaults(ed: PosterEditorCtx) {
  safeSetItem("badgeDefaults", JSON.stringify(FACTORY_DEFAULTS))
  void fetch("/api/defaults", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(FACTORY_DEFAULTS) })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[defaults] Failed to sync factory defaults: ${message}`)
    })
  // Valori "default*" del pannello impostazioni
  ed.setDefaultBadgeStyle("shadow")
  ed.setDefaultRankingBadgeStyle("default")
  ed.setDefaultBlurEnabled(true)
  ed.setDefaultBlurIntensity(5)
  ed.setDefaultBlurFade(60)
  ed.setDefaultBlurDarkness(40)
  ed.setDefaultGradientHeight(30)
  ed.setDefaultGlobalBadges(true)
  ed.setDefaultRankingBadges(true)
  ed.setDefaultBadgeGenre(true)
  ed.setDefaultBadgeYear(true)
  ed.setDefaultBadgeRating(true)
  ed.setDefaultAutoRotateClean(false)
  ed.setDefaultLogoFitEnabled(true)
  ed.setDefaultNetworkLogo(true)
  ed.setDefaultRibbonSide("left")
  // Valori correnti dell'editor
  ed.setGlobalBadges(true)
  ed.setRankingBadges(true)
  ed.setBadgeGenre(true)
  ed.setBadgeYear(true)
  ed.setBadgeRating(true)
  ed.setNetworkLogo(true)
  ed.setRibbonSide("left")
  ed.setBlurEnabled(true)
  ed.setBlurIntensity(5)
  ed.setBlurFade(60)
  ed.setBlurDarkness(40)
  ed.setGradientHeight(30)
  ed.setBadgeStyle("shadow")
  ed.setRankingBadgeStyle("default")
}
