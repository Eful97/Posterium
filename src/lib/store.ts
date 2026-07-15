import fsp from "node:fs/promises"
import path from "node:path"
import type { Mapping } from "@/lib/types"
import { DATA_DIR } from "@/lib/data-dir"

export type { Mapping }

const useKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

export function getStorageMode(): "kv" | "file" {
  return useKv ? "kv" : "file"
}

const debugStore = process.env.POSTERIUM_DEBUG === "1"

if (!useKv && debugStore) {
  console.log(`[store] Data directory: ${DATA_DIR}, file: ${path.join(DATA_DIR, "mappings.json")}`)
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

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task)
  writeQueue = run.then(() => undefined, () => undefined)
  return run
}

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true }).catch((e) => {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[store] Failed to create data dir '${DATA_DIR}': ${msg}`)
    throw new Error(`Cannot create data directory: ${msg}`)
  })
}

async function loadFromDisk(): Promise<Record<string, Mapping>> {
  try {
    const raw = await fsp.readFile(DATA_FILE, "utf-8")
    return JSON.parse(raw)
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return {}
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[store] Failed to load mappings: ${message}`)
    return {}
  }
}

async function persist(data: Record<string, Mapping>) {
  await ensureDataDir()
  const tmp = `${DATA_FILE}.tmp`
  try {
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2))
    await fsp.rename(tmp, DATA_FILE)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[store] Failed to write mappings to ${DATA_FILE}: ${msg}`)
    if (msg.includes("EACCES") || msg.includes("EPERM")) {
      console.error(`[store] Permission error — check that '${DATA_DIR}' is writable by the current user`)
      console.error(`[store] If using HF Storage Bucket, verify it's linked in Space Settings → Storage`)
    }
    throw new Error(`Cannot persist mappings: ${msg}`)
  }
}

// ---- Exported API ----

export async function getAll(): Promise<Mapping[]> {
  if (useKv) return kvGetAll()
  return Object.values(await loadFromDisk())
}

export async function getById(type: "movie" | "tv", id: number): Promise<Mapping | null> {
  if (useKv) return kvGetById(type, id)
  const key = `${type}:${id}`
  const data = await loadFromDisk()
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
