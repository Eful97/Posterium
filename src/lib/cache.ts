import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

interface CacheEntry<T> {
  data: T
  timestamp: number
  tags: string[]
}

const store = new Map<string, CacheEntry<unknown>>()

const MAX_TTL = 30 * 60 * 1000
const MAX_ENTRIES = 1000

const TAG_TTL: Record<string, number> = {
  poster: 24 * 60 * 60 * 1000,
  catalog: 2 * 60 * 60 * 1000,
}

function ttlForTags(tags: string[]): number {
  for (const tag of tags) {
    if (TAG_TTL[tag]) return TAG_TTL[tag]
  }
  return MAX_TTL
}

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp > ttlForTags(entry.tags)
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now - entry.timestamp > ttlForTags(entry.tags)) store.delete(key)
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
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const first = store.keys().next().value
    if (first) store.delete(first)
  }
  store.set(key, { data, timestamp: Date.now(), tags })
}

export function cacheInvalidate(tag: string): void {
  for (const [key, entry] of store) {
    if (entry.tags.includes(tag)) store.delete(key)
  }
}

export function cacheClear(): void {
  store.clear()
}

// Disk cache for poster images (survives container restarts on HF)
const DISK_DIR = (() => {
  try { if (fs.existsSync("/data")) return path.join("/data", "posters") } catch {}
  return path.join(process.cwd(), "data", "posters")
})()

function diskKey(key: string): string {
  return path.join(DISK_DIR, crypto.createHash("sha256").update(key).digest("hex").slice(0, 16))
}

export function cacheGetDisk(key: string): Buffer | null {
  try {
    const f = diskKey(key)
    if (fs.existsSync(f)) {
      const stat = fs.statSync(f)
      if (Date.now() - stat.mtimeMs < TAG_TTL.poster) {
        return fs.readFileSync(f)
      }
      fs.unlinkSync(f)
    }
  } catch {}
  return null
}

let diskCleanupDone = false
const DISK_MAX_AGE = 48 * 60 * 60 * 1000 // 48 hours

function cleanupDiskCache() {
  if (diskCleanupDone) return
  diskCleanupDone = true
  try {
    if (!fs.existsSync(DISK_DIR)) return
    const files = fs.readdirSync(DISK_DIR)
    if (files.length <= 1000) return
    const now = Date.now()
    const items = files
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(DISK_DIR, f)).mtimeMs }))
      .sort((a, b) => a.mtime - b.mtime)
    for (const item of items) {
      if (files.length <= 1000 && now - item.mtime < DISK_MAX_AGE) break
      fs.unlinkSync(path.join(DISK_DIR, item.name))
      files.length--
    }
  } catch {}
}

export function cacheSetDisk(key: string, data: Buffer): void {
  try {
    if (!fs.existsSync(DISK_DIR)) fs.mkdirSync(DISK_DIR, { recursive: true })
    cleanupDiskCache()
    fs.writeFileSync(diskKey(key), data)
  } catch {}
}
