import fsp from "node:fs/promises"
import path from "node:path"
import type { Mapping } from "@/lib/types"
import { DATA_DIR } from "@/lib/data-dir"
import { createLogger } from "@/lib/logger"

export type { Mapping }

const log = createLogger("store")

const useKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

export function getStorageMode(): "kv" | "file" {
  return useKv ? "kv" : "file"
}

const debugStore = process.env.POSTERIUM_DEBUG === "1"

if (!useKv && debugStore) {
  log.info("Data directory", { dir: DATA_DIR, file: path.join(DATA_DIR, "mappings.json") })
}

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
let writeQueue = Promise.resolve()
// In-memory mirror so reads never go stale during a write
let memCache: Record<string, Mapping> | null = null
let memCacheTime = 0

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

/** Consecutive write failures — resets to 0 on success */
let writeFailures = 0

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task)
  writeQueue = run.then(
    () => { writeFailures = 0 },
    (error) => {
      writeFailures++
      const msg = error instanceof Error ? error.message : String(error)
      log.error("Write queue task failed", { error: msg, consecutiveFailures: writeFailures })
      if (writeFailures >= 5) {
        log.error("Write queue has 5+ consecutive failures — check disk permissions or storage backend")
      }
    },
  )
  return run
}

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true }).catch((e) => {
    const msg = e instanceof Error ? e.message : String(e)
    log.error(`Failed to create data dir '${DATA_DIR}': ${msg}`)
    throw new Error(`Cannot create data directory: ${msg}`)
  })
}

/**
 * Read from disk, then update the in-memory mirror.
 */
async function loadFromDisk(): Promise<Record<string, Mapping>> {
  try {
    const stat = await fsp.stat(DATA_FILE).catch(() => null)
    const raw = await fsp.readFile(DATA_FILE, "utf-8")
    const data = JSON.parse(raw) as Record<string, Mapping>
    memCache = data
    memCacheTime = stat ? stat.mtimeMs : Date.now()
    return data
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      memCache = {}
      memCacheTime = Date.now()
      return {}
    }
    const message = error instanceof Error ? error.message : String(error)
    log.warn("Failed to load mappings", { error: message })
    return memCache ?? {}
  }
}

/**
 * Fast read via in-memory mirror, refreshing from disk if file was modified.
 */
async function readFromMem(): Promise<Record<string, Mapping>> {
  try {
    const stat = await fsp.stat(DATA_FILE)
    if (memCache && stat.mtimeMs <= memCacheTime) return memCache
  } catch {
    if (memCache) return memCache
  }
  return loadFromDisk()
}

async function persist(data: Record<string, Mapping>) {
  await ensureDataDir()
  const tmp = `${DATA_FILE}.tmp`
  try {
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2))
    await fsp.rename(tmp, DATA_FILE)
    // Aggiorna la memCache SOLO dopo la write riuscita: se la persist fallisce,
    // la memCache resta coerente con il disco e non serve dati mai persistiti.
    memCache = data
    memCacheTime = Date.now()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log.error("Failed to write mappings", { file: DATA_FILE, error: msg })
    if (msg.includes("EACCES") || msg.includes("EPERM")) {
      log.error("Permission error — check that data dir is writable", { dir: DATA_DIR })
      log.error("If using HF Storage Bucket, verify it's linked in Space Settings -> Storage")
    }
    throw new Error(`Cannot persist mappings: ${msg}`)
  }
}

// ---- Exported API ----

export async function getAll(): Promise<Mapping[]> {
  if (useKv) return kvGetAll()
  return Object.values(await readFromMem())
}

export async function getById(type: "movie" | "tv", id: number): Promise<Mapping | null> {
  if (useKv) return kvGetById(type, id)
  const key = `${type}:${id}`
  const data = await readFromMem()
  return data[key] ?? null
}

export async function upsert(mapping: Mapping) {
  if (useKv) {
    await kvUpsert(mapping)
    return
  }
  return enqueueWrite(async () => {
    const data = await loadFromDisk()
    const key = `${mapping.mediaType}:${mapping.tmdbId}`
    data[key] = { ...mapping, updatedAt: new Date().toISOString() }
    await persist(data)
  })
}

export async function remove(type: "movie" | "tv", id: number) {
  if (useKv) {
    await kvRemove(type, id)
    return
  }
  return enqueueWrite(async () => {
    const data = await loadFromDisk()
    const key = `${type}:${id}`
    delete data[key]
    await persist(data)
  })
}

export async function removeAll() {
  if (useKv) {
    await kvRemoveAll()
    return
  }
  return enqueueWrite(async () => {
    await persist({})
  })
}

export async function importMappings(mappings: Mapping[]) {
  if (useKv) {
    await kvImportMappings(mappings)
    return
  }
  return enqueueWrite(async () => {
    const data = await loadFromDisk()
    for (const m of mappings) {
      const key = `${m.mediaType}:${m.tmdbId}`
      data[key] = m
    }
    await persist(data)
  })
}
