"use client"

import { useState, useCallback, useRef, useEffect } from "react"
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
  try {
    window.localStorage.setItem("recent_searches", JSON.stringify(searches))
  } catch {
    // localStorage non disponibile
  }
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

  // Revision counter per scartare risposte stale: se l'utente lancia una nuova
  // ricerca (o un loadMore) mentre una precedente è ancora in flight, solo
  // l'ultima richiesta può aggiornare lo stato. Previene il "search race".
  const revRef = useRef(0)

  // B4: oltre a scartare la risposta stale (revRef), abbandoniamo davvero il
  // fetch precedente quando parte una nuova ricerca — zero banda/CPU sprecata.
  const abortRef = useRef<AbortController | null>(null)

  // Abort in corso allo smontaggio (evita setState dopo unmount).
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  // Persistenza recent searches: side-effect fuori dagli updater (purezza) —
  // gli updater React possono girare più volte (StrictMode) e non devono avere
  // effetti collaterali.
  useEffect(() => {
    writeRecentSearches(recentSearches)
  }, [recentSearches])

  const doSearch = useCallback(async (q?: string, page = 1) => {
    const searchQuery = q ?? query
    if (searchQuery.length < 2 || !tmdbKey) return
    const rev = ++revRef.current
    // B4: abbandona il fetch precedente in flight.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSearching(true)
    setError(null)
    if (page === 1) setSearchPage(1)
    try {
      const data = await http<{ results: SearchResult[]; total_results: number; total_pages: number }>(
        `/api/tmdb/search?q=${encodeURIComponent(searchQuery)}&language=${lang}&api_key=${tmdbKey}&page=${page}`,
        { timeout: 15000, signal: controller.signal }
      )
      // Risposta stale (una ricerca più recente è partita): scarta
      if (rev !== revRef.current) return
      const newResults = data.results || []
      setResults(page === 1 ? newResults : (prev) => [...prev, ...newResults])
      setTotalResults(data.total_results || 0)
      setTotalPages(data.total_pages || 0)
      // Fix M18: searchPage avanza SOLO a successo. Prima loadMore() la
      // avanzava ottimisticamente prima del fetch: un fallimento/abort
      // lasciava il contatore avanti di uno e il successivo "Show more"
      // richiedeva page+2 saltando una pagina di risultati.
      if (page > 1) setSearchPage(page)
      if (page === 1) {
        setSearchPage(1)
        setRecentSearches((prev) => [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 5))
      }
    } catch (e) {
      if (rev !== revRef.current) return
      console.error("[posterium] Search failed:", e)
      toastRef.current.error("Search failed")
      setError("Search failed. Please try again.")
      if (page === 1) setResults([])
    } finally {
      if (rev === revRef.current) setSearching(false)
    }
  }, [query, tmdbKey, lang])

  // Ref-guard contro doppi loadMore: setSearchPage è async, quindi due chiamate
  // ravvicinate vedrebbero lo stesso searchPage e lancerebbero fetch duplicate.
  const loadMoreRef = useRef(false)
  const loadMore = useCallback(async () => {
    if (searching || searchPage >= totalPages || loadMoreRef.current) return
    loadMoreRef.current = true
    const nextPage = searchPage + 1
    // Fix M18: nessun setSearchPage ottimistico — avanza solo a successo
    // (dentro doSearch), così un fetch fallito/abortito non salta pagine.
    try {
      await doSearch(query, nextPage)
    } finally {
      loadMoreRef.current = false
    }
  }, [query, searchPage, totalPages, searching, doSearch])

  const removeRecentSearch = useCallback((search: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== search))
  }, [])

  return { query, setQuery, results, setResults, searching, error, setError, totalResults, totalPages, searchPage, recentSearches, doSearch, loadMore, removeRecentSearch }
}
