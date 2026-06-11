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

function loadFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"))
      if (raw && typeof raw === "object") {
        for (const [key, entry] of Object.entries(raw)) {
          const e = entry as CacheEntry<unknown>
          if (Date.now() - e.timestamp < MAX_TTL) {
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
        if (Date.now() - entry.timestamp < MAX_TTL) {
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
      if (now - entry.timestamp > MAX_TTL) store.delete(key)
    }
  }, 60_000)
}

const MAX_TTL = 30 * 60 * 1000

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.timestamp > MAX_TTL) {
    store.delete(key)
    return null
  }
  return entry.data
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
