import type { TMDBDetails, TMDBExternalIds, TMDBImagesResponse } from "@/lib/tmdb"

// Session cache per l'editor (F6): i tick di preview su un titolo non-mappato
// ripercorrono la pipeline TMDB a ogni render. Questa cache in-memory
// (TTL 10 min, max 50 entry) mantiene details/images/externalIds per type:id
// per la durata della sessione editor, così i tick non rifanno la rete.
// È separata dalla fetchCache di tmdb.ts (che può essere evictata dal traffico
// catalog) e la chiave per type:id la invalida implicitamente al cambio
// selezione nel client.

export interface TMDBSessionEntry {
  details?: TMDBDetails
  images?: TMDBImagesResponse
  externalIds?: TMDBExternalIds
}

const SESSION_TTL_MS = 10 * 60 * 1000
const SESSION_MAX_ENTRIES = 50

const store = new Map<string, { data: TMDBSessionEntry; lastAccess: number }>()

function sessionKey(type: string, id: number): string {
  return `${type}:${id}`
}

function evictOldest(): void {
  let oldestKey: string | null = null
  let oldestTime = Infinity
  for (const [key, v] of store) {
    if (v.lastAccess < oldestTime) {
      oldestTime = v.lastAccess
      oldestKey = key
    }
  }
  if (oldestKey !== null) store.delete(oldestKey)
}

export function getTMDBSessionCache(type: string, id: number): TMDBSessionEntry | null {
  const key = sessionKey(type, id)
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.lastAccess > SESSION_TTL_MS) {
    store.delete(key)
    return null
  }
  // Promote a MRU (Map preserves insertion order)
  entry.lastAccess = Date.now()
  store.delete(key)
  store.set(key, entry)
  return entry.data
}

export function setTMDBSessionCache(type: string, id: number, data: TMDBSessionEntry): void {
  const key = sessionKey(type, id)
  if (!store.has(key) && store.size >= SESSION_MAX_ENTRIES) evictOldest()
  store.set(key, { data, lastAccess: Date.now() })
}

export function invalidateTMDBSessionCache(type: string, id: number): void {
  store.delete(sessionKey(type, id))
}

/** Solo per i test: svuota la session cache. */
export function __resetTMDBSessionCache(): void {
  store.clear()
}
