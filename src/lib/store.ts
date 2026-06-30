import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import type { Mapping } from "@/lib/types"
import { DATA_DIR } from "@/lib/data-dir"

export type { Mapping }

const useKv = !!process.env.VERCEL && !!process.env.KV_URL

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

// ---- File-based helpers (HF / local) ----

const DATA_FILE = path.join(DATA_DIR, "mappings.json")

let fileCache: Record<string, Mapping> | null = null
let cacheDirty = false
let initPromise: Promise<void> | null = null

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  } catch (e) { console.error("[store] Failed to create data dir:", e) }
}

async function loadFromDisk(): Promise<Record<string, Mapping>> {
  try {
    const exists = await fsp.access(DATA_FILE).then(() => true).catch(() => false)
    if (!exists) return {}
    const raw = await fsp.readFile(DATA_FILE, "utf-8")
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function getData(): Record<string, Mapping> {
  if (fileCache === null) {
    fileCache = {}
    if (!initPromise) {
      initPromise = loadFromDisk().then((data) => { fileCache = data; initPromise = null })
    }
  }
  return fileCache
}

async function persist() {
  if (!cacheDirty || fileCache === null) return
  ensureDataDir()
  try {
    await fsp.writeFile(DATA_FILE, JSON.stringify(fileCache, null, 2))
  } catch (e) { console.error("[store] Failed to write mappings:", e) }
  cacheDirty = false
}

// ---- Exported API ----

export async function getAll(): Promise<Mapping[]> {
  if (useKv) return kvGetAll()
  if (initPromise) await initPromise
  return Object.values(getData())
}

export async function getById(type: "movie" | "tv", id: number): Promise<Mapping | null> {
  if (useKv) return kvGetById(type, id)
  if (initPromise) await initPromise
  const key = `${type}:${id}`
  return getData()[key] ?? null
}

export async function upsert(mapping: Mapping) {
  if (useKv) {
    await kvUpsert(mapping)
    return
  }
  if (initPromise) await initPromise
  const data = getData()
  const key = `${mapping.mediaType}:${mapping.tmdbId}`
  data[key] = { ...mapping, updatedAt: new Date().toISOString() }
  cacheDirty = true
  await persist()
}

export async function remove(type: "movie" | "tv", id: number) {
  if (useKv) {
    await kvRemove(type, id)
    return
  }
  if (initPromise) await initPromise
  const data = getData()
  const key = `${type}:${id}`
  delete data[key]
  cacheDirty = true
  await persist()
}

export async function removeAll() {
  if (useKv) {
    await kvRemoveAll()
    return
  }
  if (initPromise) await initPromise
  fileCache = {}
  cacheDirty = true
  await persist()
}

export async function importMappings(mappings: Mapping[]) {
  if (useKv) {
    await kvImportMappings(mappings)
    return
  }
  if (initPromise) await initPromise
  const data = getData()
  for (const m of mappings) {
    const key = `${m.mediaType}:${m.tmdbId}`
    data[key] = m
  }
  cacheDirty = true
  await persist()
}
