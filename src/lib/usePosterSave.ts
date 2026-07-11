"use client"

import { useCallback } from "react"
import type { SearchResult, TMDBImage, Mapping } from "./types"
import { titleOf } from "./utils"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "./awards"
import { computeBadge, computeExtraFallback } from "./badge-priority"
import { t } from "./i18n"
import type { EnrichedAnimeItem } from "./validation"
import { http } from "./http"

interface PosterSaveDeps {
  selected: SearchResult | null
  previewPoster: TMDBImage | null
  selectedLogo: TMDBImage | null
  setSelectedLogo: (logo: TMDBImage | null) => void
  setPreviewPoster: (poster: TMDBImage | null) => void
  setPreviewId: (id: string | null) => void
  posters: TMDBImage[]
  metaInfo: { genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; first_air_date?: string; awards?: string[]; nominations?: string[]; studios?: string[]; franchise?: string | null; director?: string | null }
  trendRank: number | null
  mdblistAnimeList: EnrichedAnimeItem[]
  mappingsMap: Map<string, Mapping>
  loadMappings: () => Promise<void>
  logoScale: number
  logoOffsetX: number
  logoOffsetY: number
  selectedBackdrop: TMDBImage | null
  setSelectedBackdrop: (d: TMDBImage | null) => void
  backdropScale: number
  backdropOffsetX: number
  backdropOffsetY: number
  setBackdropScale: (v: number) => void
  setBackdropOffsetX: (v: number) => void
  setBackdropOffsetY: (v: number) => void
  globalBadges: boolean
  rankingBadges: boolean
  customBadge: string | null
  badgeStyle: string
  rankingBadgeStyle: string
  defaultBadgeStyle: string
  defaultRankingBadgeStyle: string
  blurEnabled: boolean
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  gradientHeight: number
  rotationPosters: string[]
  autoRotateClean: boolean
  defaultAutoRotateClean: boolean
  excludedPosters: string[]
  accentColor: string
  logoDisabled: boolean
  setLogoDisabled: (v: boolean) => void
  setLogoScale: (v: number) => void
  setLogoOffsetX: (v: number) => void
  setLogoOffsetY: (v: number) => void
}

export interface SaveConfigOverrides {
  excludedPosters?: string[]
  rotationPosters?: string[]
  previewPoster?: TMDBImage
  silent?: boolean
}

export function usePosterSave(deps: PosterSaveDeps) {
  const {
    selected, previewPoster, selectedLogo, setSelectedLogo, setPreviewPoster, setPreviewId,
    posters, metaInfo, trendRank, mdblistAnimeList, mappingsMap, loadMappings,
    logoScale, logoOffsetX, logoOffsetY,
    selectedBackdrop, setSelectedBackdrop, backdropScale, backdropOffsetX, backdropOffsetY,
    setBackdropScale, setBackdropOffsetX, setBackdropOffsetY,
    globalBadges, rankingBadges, customBadge, badgeStyle, rankingBadgeStyle,
    defaultBadgeStyle, defaultRankingBadgeStyle,
    blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight,
    rotationPosters, autoRotateClean, defaultAutoRotateClean, excludedPosters, accentColor, logoDisabled, setLogoDisabled,
    setLogoScale, setLogoOffsetX, setLogoOffsetY,
  } = deps

  const selectPoster = useCallback(async (image: TMDBImage) => {
    if (!selected) return
    setPreviewPoster(image)
    setPreviewId(`${selected.media_type}:${selected.id}`)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const selectLogo = useCallback(async (logo: TMDBImage) => {
    setSelectedLogo(logo)
    setLogoDisabled(false)
    if (logo.width && logo.height) {
      const maxH = Math.round(1500 * 0.25)
      const effW = Math.round(maxH * logo.width / logo.height)
      setLogoScale(Math.min(Math.round(effW / 1000 * 100), 75))
    } else {
      setLogoScale(75)
    }
    setLogoOffsetX(0)
    setLogoOffsetY(0)
    if (!previewPoster && selected) {
      const existing = mappingsMap.get(`${selected.media_type}:${selected.id}`)
      if (existing) {
        setPreviewPoster({ file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
      } else if (posters.length > 0) {
        setPreviewPoster(posters[0])
      }
    }
    if (selected) setPreviewId(`${selected.media_type}:${selected.id}`)
  }, [selected, previewPoster, mappingsMap, posters]) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const removeLogo = useCallback(async () => {
    setSelectedLogo(null)
    if (!selected) return
    const key = `${selected.media_type}:${selected.id}`
    const existing = mappingsMap.get(key)
    if (!existing) {
      import("sonner").then(({ toast }) => toast(t("ui.noMappingUpdate")))
      return
    }
    await http(`/api/mappings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: selected.id, mediaType: selected.media_type, title: titleOf(selected),
        posterPath: previewPoster?.file_path || selected.poster_path!, logoPath: null,
        originalPosterPath: selected.poster_path, language: previewPoster?.iso_639_1 || null,
        logoScale, logoOffsetX, logoOffsetY,
        genreName: metaInfo.genres[0]?.name || null,
        voteAverage: metaInfo.voteAverage || null,
        trendRank: trendRank ?? null,
        logoDisabled: true,
      }),
    })
    import("sonner").then(({ toast }) => toast(t("ui.logoRemoved")))
    loadMappings()
    if (selected) setPreviewId(`${selected.media_type}:${selected.id}`)
  }, [selected, previewPoster, logoScale, logoOffsetX, logoOffsetY, metaInfo, trendRank, mappingsMap, loadMappings]) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const selectBackdrop = useCallback((img: TMDBImage) => {
    setSelectedBackdrop(img)
    setBackdropScale(100)
    setBackdropOffsetX(0)
    setBackdropOffsetY(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const removeBackdrop = useCallback(() => {
    setSelectedBackdrop(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const saveConfig = useCallback(async (overrides: SaveConfigOverrides = {}) => {
    const posterToSave = overrides.previewPoster ?? previewPoster
    if (!selected || !posterToSave) return
    const now = Date.now()
    const twoWeeks = 14 * 24 * 60 * 60 * 1000
    const isNewMovie = selected.media_type === "movie" && metaInfo.release_date ? (now - new Date(metaInfo.release_date).getTime()) < twoWeeks : false
    const isNewSeries = selected.media_type === "tv" && metaInfo.first_air_date ? (now - new Date(metaInfo.first_air_date).getTime()) < twoWeeks : false
    const award = metaInfo.awards?.length ? getAwardBadgeLabel(metaInfo.awards, t) : null
    const nomination = !award && metaInfo.nominations?.length ? getNominationBadgeLabel(metaInfo.nominations, t) : null
    const animeRankData = mdblistAnimeList?.find((a: EnrichedAnimeItem) => a.id === selected.id)
    const tvType = selected.media_type === "tv" ? metaInfo.type : null
    const tvStatus = selected.media_type === "tv" ? metaInfo.status : null
    const extra = computeExtraFallback({ mediaType: selected.media_type === "tv" ? "tv" : "movie", voteAverage: metaInfo.voteAverage, tvType, tvStatus }, t)
    const studio = metaInfo.studios?.length ? metaInfo.studios[0] : null
    const badge = computeBadge({ isNewMovie, isNewSeries, animeRank: animeRankData?.rank ?? null, trendRank, award, franchise: metaInfo.franchise || null, nomination, studio, director: metaInfo.director || null, extra }, t)
    const badgeExtra = badge?.type === "extra" ? badge.label : undefined
    const badgeRank = (!badgeExtra && rankingBadges) ? (badge?.type === "rank" ? badge.rank : trendRank || undefined) : undefined
    const badgeLabel = (!badgeExtra && animeRankData) ? t("badge.anime") : (!badgeExtra && badge?.type === "rank") ? (badge.rankLabel || t("badge.today")) : undefined
    const isClean = posterToSave.iso_639_1 === null
    const isNewMapping = !mappingsMap.has(`${selected.media_type}:${selected.id}`)
    const nextExcludedPosters = overrides.excludedPosters ?? excludedPosters
    const nextRotationPosters = overrides.rotationPosters ?? rotationPosters
    const excludedSet = new Set(nextExcludedPosters)
    const baseRotationPosters = nextRotationPosters.length > 0
      ? nextRotationPosters
      : defaultAutoRotateClean && isClean && isNewMapping
        ? posters.filter(p => p.iso_639_1 === null).map(p => p.file_path)
        : []
    const effectiveRotationPosters = baseRotationPosters.filter((path) => !excludedSet.has(path))
    try {
      await http("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id,
          mediaType: selected.media_type,
          title: titleOf(selected),
          posterPath: posterToSave.file_path,
          logoPath: selectedLogo?.file_path || null,
          originalPosterPath: selected.poster_path,
          language: posterToSave.iso_639_1,
          logoScale, logoOffsetX, logoOffsetY,
          backdropPath: selectedBackdrop?.file_path || null,
          backdropScale, backdropOffsetX, backdropOffsetY,
          genreName: metaInfo.genres[0]?.name || null,
          voteAverage: metaInfo.voteAverage || null,
          trendRank: trendRank ?? undefined,
          trendPeriod: "day",
          accentColor: accentColor !== '#ffffff' ? accentColor : undefined,
          showBadges: globalBadges,
          rankingBadges,
          tvType: metaInfo.type || null,
          tvStatus: metaInfo.status || null,
          releaseDate: metaInfo.release_date || null,
          firstAirDate: metaInfo.first_air_date || null,
          badgeExtra,
          badgeRank,
          badgeLabel,
          customBadge,
          badgeStyle: badgeStyle !== defaultBadgeStyle ? badgeStyle : undefined,
          rankingBadgeStyle: rankingBadgeStyle !== defaultRankingBadgeStyle ? rankingBadgeStyle : undefined,
          defaultBadgeStyle,
          defaultRankingBadgeStyle,
          blurEnabled,
          blurIntensity,
          blurFade,
          blurDarkness,
          gradientHeight,
          cleanPosters: effectiveRotationPosters.length > 0 ? effectiveRotationPosters : undefined,
          cleanPosterIndex: 0,
          cleanPosterUpdatedAt: new Date().toISOString(),
          autoRotateClean: effectiveRotationPosters.length > 1 ? (defaultAutoRotateClean && isClean && isNewMapping ? true : autoRotateClean) : undefined,
          excludedPosters: nextExcludedPosters.length > 0 ? nextExcludedPosters : undefined,
          logoDisabled: logoDisabled || undefined,
        }),
      })
      setPreviewId(`${selected.media_type}:${selected.id}`)
      if (!overrides.silent) import("sonner").then(({ toast }) => toast(t("ui.saveSuccess")))
      await loadMappings()
    } catch (error) {
      if (!overrides.silent) import("sonner").then(({ toast }) => toast(t("ui.saveError")))
      if (overrides.silent) throw error
    }
  }, [selected, previewPoster, selectedLogo, metaInfo, logoScale, logoOffsetX, logoOffsetY, trendRank, globalBadges, rankingBadges, mdblistAnimeList, loadMappings, customBadge, badgeStyle, rankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, rotationPosters, autoRotateClean, defaultAutoRotateClean, excludedPosters, defaultBadgeStyle, defaultRankingBadgeStyle, posters, mappingsMap, accentColor, backdropOffsetX, backdropOffsetY, backdropScale, selectedBackdrop]) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally complete to save all poster state

  return { selectPoster, selectLogo, removeLogo, selectBackdrop, removeBackdrop, saveConfig }
}
