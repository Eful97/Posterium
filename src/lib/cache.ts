interface CacheEntry<T> {
  data: T
  timestamp: number
  tags: string[]
  ttl?: number
}

const store = new Map<string, CacheEntry<unknown>>()

const MAX_TTL = 30 * 60 * 1000
const MAX_ENTRIES = 1000
const REFRESH_HOUR = 3

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
    const now = new Date()
    const todayRefresh = new Date(now)
    todayRefresh.setHours(refreshHour, 0, 0, 0)

    if (now >= todayRefresh) {
      return entry.timestamp < todayRefresh.getTime()
    } else {
      const yesterdayRefresh = new Date(todayRefresh)
      yesterdayRefresh.setDate(yesterdayRefresh.getDate() - 1)
      return entry.timestamp < yesterdayRefresh.getTime()
    }
  }
  const ttl = entry.ttl || ttlForTags(entry.tags)
  return Date.now() - entry.timestamp > ttl
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    for (const [key, entry] of store) {
      if (isExpired(entry)) store.delete(key)
    }
  }, 60_000)
}

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (isExpired(entry)) {
    store.delete(key)
    return null
  }
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
  startCleanup()
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const first = store.keys().next().value
    if (first) store.delete(first)
  }
  store.set(key, { data, timestamp: Date.now(), tags, ttl: ttlMs })
}

export function cacheInvalidate(tag: string): void {
  for (const [key, entry] of store) {
    if (entry.tags.includes(tag)) store.delete(key)
  }
}

export function cacheClear(): void {
  store.clear()
}
