import fs from "node:fs"
import path from "node:path"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "mappings.json")

interface Mapping {
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

type Mappings = Record<string, Mapping>

let cache: Mappings | null = null
let cacheDirty = false

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadFromDisk(): Mappings {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
  } catch {
    return {}
  }
}

function getData(): Mappings {
  if (cache === null) {
    cache = loadFromDisk()
  }
  return cache
}

function persist() {
  if (!cacheDirty || cache === null) return
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2))
  cacheDirty = false
}

export function getAll(): Mapping[] {
  return Object.values(getData())
}

export function getById(type: "movie" | "tv", id: number): Mapping | null {
  const key = `${type}:${id}`
  return getData()[key] ?? null
}

export function upsert(mapping: Mapping) {
  const data = getData()
  const key = `${mapping.mediaType}:${mapping.tmdbId}`
  data[key] = { ...mapping, updatedAt: new Date().toISOString() }
  cacheDirty = true
  persist()
}

export function remove(type: "movie" | "tv", id: number) {
  const data = getData()
  const key = `${type}:${id}`
  delete data[key]
  cacheDirty = true
  persist()
}

export function removeAll() {
  cache = {}
  cacheDirty = true
  persist()
}

export function importMappings(mappings: Mapping[]) {
  const data = getData()
  for (const m of mappings) {
    const key = `${m.mediaType}:${m.tmdbId}`
    data[key] = m
  }
  cacheDirty = true
  persist()
}
