"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { SearchResult, TMDBImage } from "./types"

export function useNavigation() {
  const [view, setViewState] = useState<"edit" | "search" | "myposters">("edit")
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [previewPoster, setPreviewPoster] = useState<TMDBImage | null>(null)
  const [selectedLogo, setSelectedLogo] = useState<TMDBImage | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [posters, setPosters] = useState<TMDBImage[]>([])
  const [logos, setLogos] = useState<TMDBImage[]>([])
  const fetchIdRef = useRef(0)

  const setView = useCallback((v: "edit" | "search" | "myposters") => {
    setViewState(v)
  }, [])

  const resetState = useCallback(() => {
    ++fetchIdRef.current
    setViewState("edit")
    setSelected(null)
    setPreviewPoster(null)
    setSelectedLogo(null)
    setPreviewId(null)
    setPosters([])
    setLogos([])
  }, [])

  const incrementFetchId = useCallback(() => {
    return ++fetchIdRef.current
  }, [])

  const navigateToPoster = useCallback((item: SearchResult, _source?: string) => {
    window.history.pushState({ source: _source || null }, "", window.location.href)
  }, [])

  const goHome = useCallback(() => {
    setViewState("edit")
    setSelected(null)
    setPreviewPoster(null)
    setSelectedLogo(null)
    setPreviewId(null)
    setPosters([])
  }, [])

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const source = e.state?.source
      if (source === "myposters") {
        setViewState("myposters")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
      } else if (e.state?.view === "search") {
        setViewState("search")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
      } else if (e.state?.view === "myposters") {
        setViewState("myposters")
      } else {
        resetState()
      }
    }
    addEventListener("popstate", handler)
    return () => removeEventListener("popstate", handler)
  }, [resetState])

  return {
    view, setView,
    selected, setSelected,
    previewPoster, setPreviewPoster,
    selectedLogo, setSelectedLogo,
    previewId, setPreviewId,
    posters, setPosters,
    logos, setLogos,
    fetchIdRef,
    incrementFetchId,
    navigateToPoster,
    goHome,
    resetState,
  }
}
