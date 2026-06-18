"use client"

import { useState, useCallback } from "react"
import { api } from "@/lib/utils"
import type { SearchResult } from "@/lib/types"

export function useSearch(tmdbKey: string, lang: string) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [searchPage, setSearchPage] = useState(1)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("recent_searches") || "[]") } catch { return [] }
  })

  const doSearch = useCallback(async (q?: string, page = 1) => {
    const searchQuery = q ?? query
    if (searchQuery.length < 2 || !tmdbKey) return
    setSearching(true)
    if (page === 1) setSearchPage(1)
    try {
      const data = await api(`/api/tmdb/search?q=${encodeURIComponent(searchQuery)}&language=${lang}&api_key=${tmdbKey}&page=${page}`)
      const newResults = data.results || []
      setResults(page === 1 ? newResults : (prev) => [...prev, ...newResults])
      setTotalResults(data.total_results || 0)
      setTotalPages(data.total_pages || 0)
      if (page === 1) {
        setSearchPage(1)
        setRecentSearches((prev) => {
          const next = [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 5)
          localStorage.setItem("recent_searches", JSON.stringify(next))
          return next
        })
      }
    } catch {
      // search failed silently
    } finally {
      setSearching(false)
    }
  }, [query, tmdbKey, lang])

  const loadMore = useCallback(async () => {
    if (searchPage >= totalPages) return
    const nextPage = searchPage + 1
    setSearchPage(nextPage)
    await doSearch(query, nextPage)
  }, [searchPage, totalPages, doSearch, query])

  const removeRecentSearch = (search: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== search)
      localStorage.setItem("recent_searches", JSON.stringify(next))
      return next
    })
  }

  return {
    query, setQuery,
    results, searching,
    totalResults, totalPages, searchPage,
    recentSearches,
    doSearch, loadMore, removeRecentSearch,
  }
}
