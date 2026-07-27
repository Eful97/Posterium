interface CacheEntry<T> {
  data: T
  timestamp: number
  tags: string[]
  ttl?: number
}

export type CacheTagStats = {
  readonly tag: string
  readonly count: number
}

export type CacheStatus = {
  readonly totalEntries: number
  readonly taggedEntries: readonly CacheTagStats[]
  readonly untaggedEntries: number
  readonly totalBytes: number
  readonly maxBytes: number
  readonly maxEntries: number
}

const store = new Map<string, CacheEntry<unknown>>()

const MAX_TTL = 30 * 60 * 1000
const ENV_MAX_ENTRIES = process.env.POSTERIUM_CACHE_MAX ? parseInt(process.env.POSTERIUM_CACHE_MAX, 10) : 2000
const MAX_ENTRIES = Number.isFinite(ENV_MAX_ENTRIES) && ENV_MAX_ENTRIES > 100 ? ENV_MAX_ENTRIES : 2000
const ENV_MAX_MB = process.env.POSTERIUM_CACHE_MAX_MB ? parseFloat(process.env.POSTERIUM_CACHE_MAX_MB) : 150
const MAX_BYTES = (Number.isFinite(ENV_MAX_MB) && ENV_MAX_MB > 10 ? ENV_MAX_MB : 150) * 1024 * 1024
const EVICT_BATCH = 20
const ENV_REFRESH_HOUR = process.env.POSTERIUM_CACHE_REFRESH_HOUR ? parseInt(process.env.POSTERIUM_CACHE_REFRESH_HOUR, 10) : 3
const REFRESH_HOUR = Number.isFinite(ENV_REFRESH_HOUR) && ENV_REFRESH_HOUR >= 0 && ENV_REFRESH_HOUR <= 23 ? ENV_REFRESH_HOUR : 3

let totalBytes = 0

const TAG_TTL: Record<string, number> = {}

const SCHEDULED_REFRESH: Record<string, number> = {
  poster: REFRESH_HOUR,
  catalog: REFRESH_HOUR,
}

function isScheduledRefresh(tags: string[]): number | null {
  for (const tag of tags) {
    if (SCHEDULED_REFRESH[tag] !== undefined) return SCHEDULED_REFRESH[tag]
  }
  return null
}

function ttlForTags(tags: string[]): number {
  for (const tag of tags) {
    if (TAG_TTL[tag]) return TAG_TTL[tag]
  }
  return MAX_TTL
}

function isExpired(entry: CacheEntry<unknown>): boolean {
  const refreshHour = isScheduledRefresh(entry.tags)
  if (refreshHour !== null) {
    // Use UTC so the refresh time is the same regardless of server timezone
    const now = Date.now()
    const nowDate = new Date(now)
    const todayRefresh = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate(), refreshHour, 0, 0, 0)

    if (now >= todayRefresh) {
      return entry.timestamp < todayRefresh
    } else {
      const yesterdayRefresh = todayRefresh - 86400000
      return entry.timestamp < yesterdayRefresh
    }
  }
  const ttl = entry.ttl || ttlForTags(entry.tags)
  return Date.now() - entry.timestamp > ttl
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null
let cleanupActive = false

function startCleanup() {
  if (cleanupActive) return
  cleanupActive = true
  cleanupTimer = setInterval(() => {
    if (store.size === 0) {
      // Cache empty — stop the timer until next use
      if (cleanupTimer) {
        clearInterval(cleanupTimer)
        cleanupTimer = null
      }
      cleanupActive = false
      return
    }
    for (const [key, entry] of store) {
      if (isExpired(entry)) deleteEntry(key)
    }
  }, 60_000)
}

/**
 * Stima la dimensione in bytes di un valore per il memory tracking.
 * Per Buffer usa byteLength, per gli oggetti usa JSON.stringify.
 */
function estimateBytes(data: unknown): number {
  if (Buffer.isBuffer(data)) return data.byteLength
  if (typeof data === "string") return Buffer.byteLength(data)
  try {
    return Buffer.byteLength(JSON.stringify(data))
  } catch {
    // Circular references or non-serializable — fallback a 1KB
    return 1024
  }
}

function makeSpace(count: number, incomingBytes: number = 0): void {
  if (store.size + count < MAX_ENTRIES && totalBytes + incomingBytes < MAX_BYTES) return
  // Map preserves insertion order; delete+set on read promotes accessed entries to end.
  // First keys are the least recently used. Evict in batches.
  let evicted = 0
  const entryLimit = Math.min(store.size + count - MAX_ENTRIES + EVICT_BATCH, store.size)
  const byteTarget = totalBytes + incomingBytes - Math.floor(MAX_BYTES * 0.9)
  for (const key of store.keys()) {
    if (evicted >= entryLimit && totalBytes <= byteTarget) break
    const entry = store.get(key)
    if (entry) {
      totalBytes -= estimateBytes(entry.data)
    }
    store.delete(key)
    evicted++
  }
}

function deleteEntry(key: string): void {
  const entry = store.get(key)
  if (entry) totalBytes -= estimateBytes(entry.data)
  store.delete(key)
}

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (isExpired(entry)) {
    deleteEntry(key)
    return null
  }
  // Promote to most-recently-used (Map preserves insertion order)
  store.delete(key)
  store.set(key, entry)
  return entry.data
}

export function cacheGetStale<T>(key: string): { data: T | null; stale: boolean } {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return { data: null, stale: false }
  if (isExpired(entry)) {
    return { data: entry.data as T, stale: true }
  }
  store.delete(key)
  store.set(key, entry)
  return { data: entry.data, stale: false }
}

export function cacheSet<T>(key: string, data: T, tags: string[] = [], ttlMs?: number): void {
  if (!cleanupActive) startCleanup()
  const incomingBytes = estimateBytes(data)
  if (!store.has(key)) {
    makeSpace(1, incomingBytes)
  } else {
    // Sottrai i byte dell'entry esistente prima di rimpiazzarla
    const existing = store.get(key)
    if (existing) totalBytes -= estimateBytes(existing.data)
  }
  totalBytes += incomingBytes
  store.set(key, { data, timestamp: Date.now(), tags, ttl: ttlMs })
}

export function cacheHas(key: string): boolean {
  return cacheGet(key) !== null
}

export function cacheInvalidate(tag: string): void {
  for (const [key, entry] of store) {
    if (entry.tags.includes(tag)) deleteEntry(key)
  }
}

export function cacheInvalidatePosterData(): void {
  cacheInvalidate("poster")
  cacheInvalidate("catalog")
  cacheInvalidate("stremio")
  cacheInvalidate("badge")
}

/**
 * Invalida solo la cache relativa a un mapping specifico (poster + badge).
 * Più mirato di cacheInvalidatePosterData() che svuota tutto.
 */
export function cacheInvalidatePosterDataFor(type: string, tmdbId: number): void {
  const mappingTag = `poster:${type}:${tmdbId}`
  cacheInvalidate(mappingTag)
}

export function cacheStatus(): CacheStatus {
  const tagCounts = new Map<string, number>()
  let totalEntries = 0
  let untaggedEntries = 0

  // Cleanup pass: remove expired entries and adjust byte count
  const expiredKeys: string[] = []
  for (const [key, entry] of store) {
    if (isExpired(entry)) expiredKeys.push(key)
  }
  for (const key of expiredKeys) deleteEntry(key)

  for (const entry of store.values()) {
    totalEntries += 1

    if (entry.tags.length === 0) {
      untaggedEntries += 1
      continue
    }

    for (const tag of entry.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  const taggedEntries = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag))

  return {
    totalEntries,
    taggedEntries,
    untaggedEntries,
    totalBytes,
    maxBytes: MAX_BYTES,
    maxEntries: MAX_ENTRIES,
  }
}

export function cacheClear(): void {
  store.clear()
  totalBytes = 0
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  cleanupActive = false
}
