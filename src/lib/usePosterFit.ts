"use client"

import { useState, useEffect, useRef } from "react"
import type { TMDBImage } from "@/lib/types"

interface PosterFitMetrics {
  cleanliness: number
  contrast: number
  lowDetailScore: number
  badgeReadability: number
}

export interface PosterFitEntry {
  posterPath: string
  score: number
  adjustedScore: number
  textPenalty: number
  metrics: PosterFitMetrics
  reasons: string[]
}

export interface UsePosterFitInput {
  enabled: boolean
  selectedLogo: TMDBImage | null
  cleanPosters: TMDBImage[]
  logoScale: number
  logoOffsetX: number
  logoOffsetY: number
  hasBadges: boolean
}

export interface UsePosterFitResult {
  bestFitPath: string | null
  results: PosterFitEntry[]
  loading: boolean
  error: string | null
}

const resultCache = new Map<string, PosterFitEntry[]>()

function serialise(input: UsePosterFitInput): string | null {
  if (!input.enabled || !input.selectedLogo || input.cleanPosters.length < 2) return null
  return JSON.stringify([
    input.cleanPosters.map((p) => p.file_path).sort(),
    input.selectedLogo.file_path,
    input.logoScale,
    input.logoOffsetX,
    input.logoOffsetY,
    input.hasBadges,
  ])
}

export function usePosterFit(input: UsePosterFitInput): UsePosterFitResult {
  const [bestFitPath, setBestFitPath] = useState<string | null>(null)
  const [results, setResults] = useState<PosterFitEntry[]>([])
  const [loading, setLoading] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef(input)
  inputRef.current = input

  const cacheKey = serialise(input)

  useEffect(() => {
    if (!cacheKey) {
      setBestFitPath(null)
      setResults([])
      return
    }

    const cached = resultCache.get(cacheKey)
    if (cached) {
      setResults(cached)
      setBestFitPath(cached[0]?.posterPath ?? null)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortRef.current) abortRef.current.abort()

    const controller = new AbortController()
    abortRef.current = controller

    timerRef.current = setTimeout(async () => {
      setLoading(true)

      try {
        const inp = inputRef.current
        if (!inp.selectedLogo) return

        const posterPaths = inp.cleanPosters.map((p) => p.file_path)
        const res = await fetch("/api/poster-fit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            posterPaths,
            logoPath: inp.selectedLogo.file_path,
            logoScale: inp.logoScale,
            logoOffsetX: inp.logoOffsetX,
            logoOffsetY: inp.logoOffsetY,
            hasBadges: inp.hasBadges,
            voteAverages: inp.cleanPosters.map((p) => p.vote_average),
            widths: inp.cleanPosters.map((p) => p.width),
            heights: inp.cleanPosters.map((p) => p.height),
          }),
          signal: controller.signal,
        })

        if (!res.ok) throw new Error(`API returned ${res.status}`)

        const data = await res.json() as { ranked: PosterFitEntry[] }

        resultCache.set(cacheKey, data.ranked)

        setResults(data.ranked)
        setBestFitPath(data.ranked[0]?.posterPath ?? null)
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controller.abort()
    }
  }, [cacheKey])

  return { bestFitPath, results, loading, error: null }
}
