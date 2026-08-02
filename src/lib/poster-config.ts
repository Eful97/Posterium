// ---------------------------------------------------------------------------
// Parsing della configurazione di resa (badge/blur/gradiente/logo) della route
// poster da query string + mapping + config token + server defaults.
// Estratto dalla route `/api/poster/[type]/[id]` per renderlo testabile in
// isolamento. Semantica identica all'originale — nessuna logica di rendering.
// ---------------------------------------------------------------------------

import type { PosteriumUserConfig } from "./config-token"
import type { Mapping } from "./types"
import type { ServerDefaults } from "./server-defaults"
import {
  isBadgeStyle,
  isRankingBadgeStyle,
  DEFAULT_BADGE_STYLE,
  DEFAULT_RANKING_BADGE_STYLE,
  type BadgeStyle,
  type RankingBadgeStyle,
} from "./badge-styles"

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export interface PosterRenderConfigInput {
  searchParams: URLSearchParams
  mapping: Mapping | null
  configOverride: PosteriumUserConfig | null
  sd: ServerDefaults
  /** true se la richiesta fornisce poster/mapping espliciti (query o mapping salvato) */
  hasQuery: boolean
  showBadges: boolean
  rankingBadges: boolean
  /** segnali di classifica per l'auto-detect default→netflix */
  animeRank: number | null
  rankingResult: number | null
  finalRank: number | null
}

export interface PosterRenderConfig {
  badgeStyle: BadgeStyle
  rankingBadgeStyle: RankingBadgeStyle
  blurEnabled: boolean
  blurHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  badgesEnabled: boolean
  rankingEnabled: boolean
  logoScale: number | null
  logoOffsetX: number | null
  logoOffsetY: number | null
  queryExtra: string | null
  qNetLogo: string | null
  ribbonSide: "left" | "right"
}

export function resolvePosterRenderConfig(input: PosterRenderConfigInput): PosterRenderConfig {
  const { searchParams: q, mapping, configOverride, sd, hasQuery, showBadges, rankingBadges } = input

  // Ranking style — precedenza: mapping salvato > query `rs` > config token > server defaults > default.
  // (Identica all'originale: la query era seconda perché il `||` catenato privilegiava mapping.)
  const rawRs = q.get("rs")
  let rankingBadgeStyle: RankingBadgeStyle = isRankingBadgeStyle(mapping?.rankingBadgeStyle)
    ? mapping!.rankingBadgeStyle
    : isRankingBadgeStyle(rawRs)
      ? rawRs
      : isRankingBadgeStyle(configOverride?.rankingBadgeStyle)
        ? configOverride!.rankingBadgeStyle
        : isRankingBadgeStyle(sd.rankingBadgeStyle)
          ? sd.rankingBadgeStyle
          : DEFAULT_RANKING_BADGE_STYLE

  const qRankParam = q.get("rank")
  const hasRank = !!(input.animeRank || input.rankingResult || mapping?.badgeRank || mapping?.trendRank || qRankParam || input.finalRank)
  // "default" = auto-detect: mostra il badge stile Netflix se c'è un rank,
  // altrimenti badge standard. Se il sorgente (mapping/query/config) specifica
  // un valore esplicito (bar/pill/colored/netflix), viene rispettato senza override.
  if (hasRank && rankingBadgeStyle === "default") {
    rankingBadgeStyle = "netflix"
  } else if (!hasRank && rankingBadgeStyle === "netflix") {
    rankingBadgeStyle = "default"
  }

  const blurEnabled = q.get("be") !== null ? q.get("be") !== "0" : (configOverride !== null ? configOverride.blurEnabled : true)
  // Clamp espliciti: impediscono a valori estremi (query o config) di arrivare a
  // sharp.blur con sigma enormi o gradienti fuori scala (potenziale DoS CPU).
  const rawGradHeight = q.get("gradHeight") ? Number(q.get("gradHeight")) : NaN
  const blurHeight = Number.isFinite(rawGradHeight) ? clamp(rawGradHeight, 5, 100) : (configOverride !== null ? clamp(configOverride.gradientHeight, 5, 100) : 30)
  const rawBlur = q.get("blur") ? Number(q.get("blur")) : NaN
  const blurIntensity = Number.isFinite(rawBlur) ? clamp(rawBlur, 1, 100) : (configOverride !== null ? clamp(configOverride.blurIntensity, 1, 100) : 5)
  const rawBf = q.get("bf") ? Number(q.get("bf")) : NaN
  const blurFade = Number.isFinite(rawBf) ? clamp(rawBf, 0, 100) : (configOverride !== null ? clamp(configOverride.blurFade, 0, 100) : 60)
  const rawBd = q.get("bd") ? Number(q.get("bd")) : NaN
  const blurDarkness = Number.isFinite(rawBd) ? clamp(rawBd, 0, 100) : (configOverride !== null ? clamp(configOverride.blurDarkness, 0, 100) : 40)

  const qBadges = q.get("badges")
  const qRanking = q.get("ranking")
  const badgesEnabled = hasQuery ? (qBadges !== null ? qBadges !== "0" : (configOverride !== null ? configOverride.globalBadges : showBadges)) : true
  const rankingEnabled = hasQuery ? (qRanking !== null ? qRanking !== "0" : (configOverride !== null ? configOverride.rankingBadges : rankingBadges)) : true

  // Badge style — confinamento della query string al union type: valori non validi
  // cadono sul default (il renderer in passato li trattava come "shadow" nel ramo else).
  const rawBs = q.get("bs")
    || (mapping?.badgeStyle && mapping.badgeStyle !== "shadow" ? mapping.badgeStyle : undefined)
    || configOverride?.badgeStyle
    || sd.badgeStyle
  const badgeStyle: BadgeStyle = isBadgeStyle(rawBs) ? rawBs : DEFAULT_BADGE_STYLE

  const qScale = q.get("scale")
  const qOx = q.get("ox")
  const qOy = q.get("oy")
  const logoScale = qScale ? Number(qScale) || null : mapping?.logoScale ?? null
  const logoOffsetX = qOx ? Number(qOx) || null : mapping?.logoOffsetX ?? null
  const logoOffsetY = qOy ? Number(qOy) || null : mapping?.logoOffsetY ?? null

  const queryExtra = q.get("extra") || configOverride?.customBadge || null
  const qNetLogo = q.get("netLogo") ?? (configOverride !== null ? (configOverride.networkLogo ? null : "0") : null)
  // Modalità layout nastro Netflix + logo network: query `side=right` (Stremio), mapping salvato o config/profilo
  const qSide = q.get("side")
  const ribbonSide: "left" | "right" = qSide === "right" || mapping?.ribbonSide === "right" || configOverride?.ribbonSide === "right" ? "right" : "left"

  return {
    badgeStyle,
    rankingBadgeStyle,
    blurEnabled,
    blurHeight,
    blurIntensity,
    blurFade,
    blurDarkness,
    badgesEnabled,
    rankingEnabled,
    logoScale,
    logoOffsetX,
    logoOffsetY,
    queryExtra,
    qNetLogo,
    ribbonSide,
  }
}
