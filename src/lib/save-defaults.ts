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
    ratingSources: ed.defaultRatingSources,
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
    defaultEpisodeMetadataSource: ed.defaultEpisodeMetadataSource,
    networkLogo: ed.defaultNetworkLogo,
    ribbonSide: ed.defaultRibbonSide,
    episodeMetadataSource: ed.defaultEpisodeMetadataSource,
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
