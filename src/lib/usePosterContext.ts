"use client"

import { useState, useMemo } from "react"
import type { TMDBImage } from "./types"
import { computeLogoOffsetBounds } from "./logo-layout"

export function usePosterState(hasBadges: boolean) {
  const [logoScale, setLogoScale] = useState(75)
  const [logoOffsetX, setLogoOffsetX] = useState(0)
  const [logoOffsetY, setLogoOffsetY] = useState(0)
  const [backdrops, setBackdrops] = useState<TMDBImage[]>([])
  const [selectedBackdrop, setSelectedBackdrop] = useState<TMDBImage | null>(null)
  const [backdropScale, setBackdropScale] = useState(100)
  const [backdropOffsetX, setBackdropOffsetX] = useState(0)
  const [backdropOffsetY, setBackdropOffsetY] = useState(0)
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [rotationPosters, setRotationPosters] = useState<string[]>([])
  const [autoRotateClean, setAutoRotateClean] = useState(false)
  const [excludedPosters, setExcludedPosters] = useState<string[]>([])
  const [logoDisabled, setLogoDisabled] = useState(false)

  const logoBounds = useMemo(() => {
    return { minX: -500, maxX: 500, minY: -500, maxY: 500 }
  }, [])

  return {
    logoScale, setLogoScale,
    logoOffsetX, setLogoOffsetX,
    logoOffsetY, setLogoOffsetY,
    backdrops, setBackdrops,
    selectedBackdrop, setSelectedBackdrop,
    backdropScale, setBackdropScale,
    backdropOffsetX, setBackdropOffsetX,
    backdropOffsetY, setBackdropOffsetY,
    editingValue, setEditingValue,
    editText, setEditText,
    rotationPosters, setRotationPosters,
    autoRotateClean, setAutoRotateClean,
    excludedPosters, setExcludedPosters,
    logoDisabled, setLogoDisabled,
    logoBounds,
  }
}
