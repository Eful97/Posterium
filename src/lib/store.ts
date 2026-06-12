import fs from "node:fs"
import path from "node:path"

export interface Mapping {
  tmdbId: number
  mediaType: "movie" | "tv"
  title: string
  posterPath: string
  logoPath: string | null
  originalPosterPath: string | null
  language: string | null
  updatedAt: string
  logoScale?: number
  logoOffsetX?: number
  logoOffsetY?: number
  showBadges?: boolean
  genreName?: string
  voteAverage?: number
  trendRank?: number
  trendPeriod?: string
}

const isVercel = !!process.env.VERCEL

// ---- Vercel KV helpers ----

async function kvGetAll(): Promise<Mapping[]> {
  const { kv } = await import("@vercel/kv")
  const raw = await kv.hgetall<Record<string, Mapping>>("mappings")
  if (!raw) return []
  return Object.values(raw)
}

async function kvGetById(type: "movie" | "tv", id: number): Promise<Mapping | null> {
  const { kv } = await import("@vercel/kv")
  const key = `${type}:${id}`
  return kv.hget<Mapping>("mappings", key)
}

async function kvUpsert(mapping: Mapping) {
  const { kv } = await import("@vercel/kv")
  const key = `${mapping.mediaType}:${mapping.tmdbId}`
  await kv.hset("mappings", { [key]: { ...mapping, updatedAt: new Date().toISOString() } })
}

async function kvRemove(type: "movie" | "tv", id: number) {
  const { kv } = await import("@vercel/kv")
  await kv.hdel("mappings", `${type}:${id}`)
}

async function kvRemoveAll() {
  const { kv } = await import("@vercel/kv")
  await kv.del("mappings")
}

async function kvImportMappings(mappings: Mapping[]) {
  const { kv } = await import("@vercel/kv")
  const entries: Record<string, Mapping> = {}
  for (const m of mappings) {
    entries[`${m.mediaType}:${m.tmdbId}`] = m
  }
  await kv.hset("mappings", entries)
}

// ---- File-based helpers (HF) ----

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "mappings.json")

let fileCache: Record<string, Mapping> | null = null
let cacheDirty = false

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadFromDisk(): Record<string, Mapping> {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
  } catch {
    return {}
  }
}

function getData(): Record<string, Mapping> {
  if (fileCache === null) {
    fileCache = loadFromDisk()
  }
  return fileCache
}

function persist() {
  if (!cacheDirty || fileCache === null) return
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(fileCache, null, 2))
  cacheDirty = false
}

// ---- Exported API ----

export async function getAll(): Promise<Mapping[]> {
  if (isVercel) return kvGetAll()
  return Object.values(getData())
}

export async function getById(type: "movie" | "tv", id: number): Promise<Mapping | null> {
  if (isVercel) return kvGetById(type, id)
  const key = `${type}:${id}`
  return getData()[key] ?? null
}

export async function upsert(mapping: Mapping) {
  if (isVercel) {
    await kvUpsert(mapping)
    return
  }
  const data = getData()
  const key = `${mapping.mediaType}:${mapping.tmdbId}`
  data[key] = { ...mapping, updatedAt: new Date().toISOString() }
  cacheDirty = true
  persist()
}

export async function remove(type: "movie" | "tv", id: number) {
  if (isVercel) {
    await kvRemove(type, id)
    return
  }
  const data = getData()
  const key = `${type}:${id}`
  delete data[key]
  cacheDirty = true
  persist()
}

export async function removeAll() {
  if (isVercel) {
    await kvRemoveAll()
    return
  }
  fileCache = {}
  cacheDirty = true
  persist()
}

export async function importMappings(mappings: Mapping[]) {
  if (isVercel) {
    await kvImportMappings(mappings)
    return
  }
  const data = getData()
  for (const m of mappings) {
    const key = `${m.mediaType}:${m.tmdbId}`
    data[key] = m
  }
  cacheDirty = true
  persist()
}
