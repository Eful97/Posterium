"use client"

import { useState, useCallback, useRef } from "react"
import { http } from "./http"
import type { SearchResult } from "./types"
import { useToast } from "@/components/Toast"

function readRecentSearches(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return []
  try {
    return JSON.parse(window.localStorage.getItem("recent_searches") || "[]")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[search] Failed to read recent searches: ${message}`)
    return []
  }
}

function writeRecentSearches(searches: string[]): void {
  if (typeof window === "undefined" || !window.localStorage) return
  window.localStorage.setItem("recent_searches", JSON.stringify(searches))
}

export function useSearch(tmdbKey: string, lang: string) {
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [searchPage, setSearchPage] = useState(1)
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches)

  const doSearch = useCallback(async (q?: string, page = 1) => {
    const searchQuery = q ?? query
    if (searchQuery.length < 2 || !tmdbKey) return
    setSearching(true)
    setError(null)
    if (page === 1) setSearchPage(1)
    try {
      const data = await http<{ results: SearchResult[]; total_results: number; total_pages: number }>(
        `/api/tmdb/search?q=${encodeURIComponent(searchQuery)}&language=${lang}&api_key=${tmdbKey}&page=${page}`,
        { timeout: 15000 }
      )
      const newResults = data.results || []
      setResults(page === 1 ? newResults : (prev) => [...prev, ...newResults])
      setTotalResults(data.total_results || 0)
      setTotalPages(data.total_pages || 0)
      if (page === 1) {
        setSearchPage(1)
        setRecentSearches((prev) => {
          const next = [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 5)
          writeRecentSearches(next)
          return next
        })
      }
    } catch (e) {
      console.error("[posterium] Search failed:", e)
      toastRef.current.error("Search failed")
      setError("Search failed. Please try again.")
      if (page === 1) setResults([])
    } finally {
      setSearching(false)
    }
  }, [query, tmdbKey, lang])

  const loadMore = useCallback(async () => {
    if (searching || searchPage >= totalPages) return
    const nextPage = searchPage + 1
    setSearchPage(nextPage)
    await doSearch(query, nextPage)
  }, [query, searchPage, totalPages, searching, doSearch])

  const removeRecentSearch = useCallback((search: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== search)
      writeRecentSearches(next)
      return next
    })
  }, [])

  return { query, setQuery, results, setResults, searching, error, setError, totalResults, totalPages, searchPage, recentSearches, doSearch, loadMore, removeRecentSearch }
}
