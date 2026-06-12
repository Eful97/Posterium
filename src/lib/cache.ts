import fs from "node:fs"
import path from "node:path"

interface CacheEntry<T> {
  data: T
  timestamp: number
  tags: string[]
}

const store = new Map<string, CacheEntry<unknown>>()
const CACHE_FILE = path.join(process.cwd(), "data", "cache.json")
let persistTimer: ReturnType<typeof setTimeout> | null = null

const MAX_TTL = 30 * 60 * 1000

const TAG_TTL: Record<string, number> = {
  poster: 24 * 60 * 60 * 1000,
}

function ttlForTags(tags: string[]): number {
  for (const tag of tags) {
    if (TAG_TTL[tag]) return TAG_TTL[tag]
  }
  return MAX_TTL
}

function entryTtl(entry: CacheEntry<unknown>): number {
  return ttlForTags(entry.tags)
}

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp > entryTtl(entry)
}

function loadFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"))
      if (raw && typeof raw === "object") {
        for (const [key, entry] of Object.entries(raw)) {
          const e = entry as CacheEntry<unknown>
          if (!isExpired(e)) {
            store.set(key, e)
          }
        }
      }
    }
  } catch {}
}

function persistToDisk() {
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    try {
      const obj: Record<string, CacheEntry<unknown>> = {}
      for (const [key, entry] of store) {
        if (!isExpired(entry)) {
          obj[key] = entry
        }
      }
      const dir = path.dirname(CACHE_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj))
    } catch {}
  }, 2000)
}

loadFromDisk()

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now - entry.timestamp > entryTtl(entry)) store.delete(key)
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
  return entry.data
}

export function cacheGetStale<T>(key: string): { data: T | null; stale: boolean } {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return { data: null, stale: false }
  if (isExpired(entry)) {
    const expired = entry.data as T
    store.delete(key)
    return { data: expired, stale: true }
  }
  return { data: entry.data, stale: false }
}

export function cacheSet<T>(key: string, data: T, tags: string[] = []): void {
  startCleanup()
  store.set(key, { data, timestamp: Date.now(), tags })
  persistToDisk()
}

export function cacheInvalidate(tag: string): void {
  for (const [key, entry] of store) {
    if (entry.tags.includes(tag)) store.delete(key)
  }
  persistToDisk()
}

export function cacheClear(): void {
  store.clear()
  persistToDisk()
}
