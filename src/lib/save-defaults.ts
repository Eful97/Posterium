import type { PosteriumCtx } from "@/lib/context"

export function saveDefaults(p: PosteriumCtx) {
  const d = {
    globalBadges: p.defaultGlobalBadges,
    rankingBadges: p.defaultRankingBadges,
    badgeStyle: p.defaultBadgeStyle,
    rankingBadgeStyle: p.defaultRankingBadgeStyle,
    blurEnabled: p.defaultBlurEnabled,
    blurIntensity: p.defaultBlurIntensity,
    blurFade: p.defaultBlurFade,
    blurDarkness: p.defaultBlurDarkness,
    gradientHeight: p.defaultGradientHeight,
    autoRotateClean: p.defaultAutoRotateClean,
    defaultLogoFitEnabled: p.defaultLogoFitEnabled,
  }
  localStorage.setItem("badgeDefaults", JSON.stringify(d))
  void fetch("/api/defaults", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[defaults] Failed to sync server defaults: ${message}`)
    })
  const key = p.selected ? `${p.selected.media_type}:${p.selected.id}` : null
  const mapping = key ? p.mappingsMap.get(key) : undefined
  if (!mapping?.badgeStyle) p.setBadgeStyle(d.badgeStyle)
  if (!mapping?.rankingBadgeStyle) p.setRankingBadgeStyle(d.rankingBadgeStyle)
  p.setGlobalBadges(d.globalBadges)
  p.setRankingBadges(d.rankingBadges)
  p.setBlurEnabled(d.blurEnabled)
  p.setBlurIntensity(d.blurIntensity)
  p.setBlurFade(d.blurFade)
  p.setBlurDarkness(d.blurDarkness)
  p.setGradientHeight(d.gradientHeight)
}
