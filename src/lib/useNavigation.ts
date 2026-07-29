"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { SearchResult, TMDBImage } from "./types"

export function useNavigation() {
  const [view, setViewState] = useState<"edit" | "search" | "myposters" | "cataloghi">("edit")
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [previewPoster, setPreviewPoster] = useState<TMDBImage | null>(null)
  const [selectedLogo, setSelectedLogo] = useState<TMDBImage | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [posters, setPosters] = useState<TMDBImage[]>([])
  const [logos, setLogos] = useState<TMDBImage[]>([])
  const fetchIdRef = useRef(0)

  const [sourceView, setSourceView] = useState<"edit" | "search" | "myposters" | "cataloghi" | null>(null)

  const setView = useCallback((v: "edit" | "search" | "myposters" | "cataloghi") => {
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
    setSourceView(null)
  }, [])

  const incrementFetchId = useCallback(() => {
    return ++fetchIdRef.current
  }, [])

  const navigateToPoster = useCallback((item: SearchResult, _source?: string) => {
    const src = (_source as "edit" | "search" | "myposters" | "cataloghi") || view || "edit"
    setSourceView(src)
    window.history.replaceState({ view: src }, "", window.location.href)
    window.history.pushState({ view: "edit", source: src }, "", window.location.href)
  }, [view])

  const goHome = useCallback(() => {
    setViewState("edit")
    setSelected(null)
    setPreviewPoster(null)
    setSelectedLogo(null)
    setPreviewId(null)
    setPosters([])
    setSourceView(null)
  }, [])

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const source = e.state?.source
      const targetView = e.state?.view || source

      if (targetView === "cataloghi" || source === "cataloghi") {
        setViewState("cataloghi")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
      } else if (targetView === "myposters" || source === "myposters") {
        setViewState("myposters")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
      } else if (targetView === "search" || source === "search") {
        setViewState("search")
        setSelected(null)
        setPreviewPoster(null)
        setSelectedLogo(null)
        setPreviewId(null)
      } else if (targetView === "edit") {
        setViewState("edit")
        if (!e.state?.selected) {
          setSelected(null)
          setPreviewPoster(null)
          setSelectedLogo(null)
          setPreviewId(null)
        }
      } else {
        resetState()
      }
    }
    addEventListener("popstate", handler)
    return () => removeEventListener("popstate", handler)
  }, [resetState])

  return {
    view, setView,
    sourceView, setSourceView,
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
