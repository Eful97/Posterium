import fsp from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { DATA_DIR } from "@/lib/data-dir"
import type { PosteriumUserConfig } from "@/lib/config-token"
import type { Mapping } from "@/lib/types"

export type { PosteriumUserConfig }

export interface ProfileData {
  config: PosteriumUserConfig
  apiKeys?: {
    tmdbKey?: string
    mdblistApiKey?: string
  }
  mappings?: Record<string, Mapping>
  passwordHash?: string
  salt?: string
  createdAt?: string
  updatedAt?: string
}

const PROFILES_FILE = path.join(DATA_DIR, "profiles.json")
const useKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

// ---- Password helpers ----

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return { hash, salt }
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex")
  if (derived.length !== hash.length) return false
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash))
}

// ---- Normalize old-style (raw PosteriumUserConfig) to ProfileData ----

function toProfileData(raw: unknown): ProfileData | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  if (obj.config && typeof obj.config === "object") {
    const pd = raw as ProfileData
    if (pd.config && typeof pd.config.globalBadges === "boolean") return pd
    return null
  }
  if (typeof obj.globalBadges !== "boolean") return null
  return { config: raw as PosteriumUserConfig }
}

// ---- KV helpers ----

async function kvGetProfileRaw(uuid: string): Promise<unknown> {
  const { kv } = await import("@vercel/kv")
  return kv.hget("profiles", uuid)
}

async function kvSetProfile(uuid: string, data: ProfileData): Promise<void> {
  const { kv } = await import("@vercel/kv")
  await kv.hset("profiles", { [uuid]: data })
}

async function kvDeleteProfile(uuid: string): Promise<void> {
  const { kv } = await import("@vercel/kv")
  await kv.hdel("profiles", uuid)
}

// ---- File-based helpers ----

let writeQueue = Promise.resolve()
let memCache: Record<string, ProfileData> | null = null
let memCacheTime = 0
const MEM_CACHE_TTL = 2000

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task)
  writeQueue = run.then(() => undefined, () => undefined)
  return run
}

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true }).catch(() => {})
}

async function loadProfilesFromDisk(): Promise<Record<string, ProfileData>> {
  try {
    const stat = await fsp.stat(PROFILES_FILE).catch(() => null)
    const raw = await fsp.readFile(PROFILES_FILE, "utf-8")
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const data: Record<string, ProfileData> = {}
    for (const [key, val] of Object.entries(parsed)) {
      const normalized = toProfileData(val)
      if (normalized) data[key] = normalized
    }
    memCache = data
    memCacheTime = stat ? stat.mtimeMs : Date.now()
    return data
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      memCache = {}
      memCacheTime = Date.now()
      return {}
    }
    console.warn("[profile-store] Failed to load profiles:", error instanceof Error ? error.message : String(error))
    return memCache ?? {}
  }
}

async function readProfilesFromMem(): Promise<Record<string, ProfileData>> {
  try {
    const stat = await fsp.stat(PROFILES_FILE)
    if (memCache && stat.mtimeMs <= memCacheTime) return memCache
  } catch {
    if (memCache) return memCache
  }
  return loadProfilesFromDisk()
}

async function persistProfiles(data: Record<string, ProfileData>) {
  memCache = data
  memCacheTime = Date.now()
  await ensureDataDir()
  const tmp = `${PROFILES_FILE}.tmp`
  try {
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2))
    await fsp.rename(tmp, PROFILES_FILE)
  } catch (e) {
    console.error("[profile-store] Failed to write profiles:", e instanceof Error ? e.message : String(e))
    throw e
  }
}

async function fileGetProfile(uuid: string): Promise<ProfileData | null> {
  const data = await readProfilesFromMem()
  return data[uuid] ?? null
}

async function fileSetProfile(uuid: string, data: ProfileData): Promise<void> {
  return enqueueWrite(async () => {
    const all = await loadProfilesFromDisk()
    all[uuid] = data
    await persistProfiles(all)
  })
}

async function fileDeleteProfile(uuid: string): Promise<void> {
  return enqueueWrite(async () => {
    const data = await loadProfilesFromDisk()
    delete data[uuid]
    await persistProfiles(data)
  })
}

// ---- Internal full-profile getter ----

async function getFullProfile(profileId: string): Promise<ProfileData | null> {
  if (useKv) {
    const raw = await kvGetProfileRaw(profileId)
    return toProfileData(raw)
  }
  return fileGetProfile(profileId)
}

// ---- Exported API ----

export function generateProfileId(): string {
  return crypto.randomUUID()
}

export async function createOrUpdateProfile(
  config: PosteriumUserConfig,
  existingProfileId?: string,
  password?: string,
  apiKeys?: { tmdbKey?: string; mdblistApiKey?: string },
  mappings?: Record<string, Mapping>,
): Promise<string> {
  const existing = existingProfileId ? await getFullProfile(existingProfileId) : null
  const uuid = existing ? existingProfileId! : (existingProfileId || generateProfileId())

  const data: ProfileData = {
    config,
    apiKeys: apiKeys ?? existing?.apiKeys,
    mappings: mappings ?? existing?.mappings,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (password) {
    const { hash, salt } = hashPassword(password)
    data.passwordHash = hash
    data.salt = salt
  } else if (existing) {
    data.passwordHash = existing.passwordHash
    data.salt = existing.salt
  }

  if (useKv) {
    await kvSetProfile(uuid, data)
  } else {
    await fileSetProfile(uuid, data)
  }
  return uuid
}

export async function getProfile(profileId: string): Promise<PosteriumUserConfig | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) {
    return null
  }
  const full = await getFullProfile(profileId)
  return full?.config ?? null
}

export async function getFullProfileData(profileId: string): Promise<ProfileData | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) {
    return null
  }
  return getFullProfile(profileId)
}

export async function verifyProfilePassword(profileId: string, password: string): Promise<boolean> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) {
    return false
  }
  const full = await getFullProfile(profileId)
  if (!full?.passwordHash || !full?.salt) return false
  return verifyPassword(password, full.passwordHash, full.salt)
}

export async function deleteProfile(profileId: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) {
    return
  }
  if (useKv) {
    await kvDeleteProfile(profileId)
  } else {
    await fileDeleteProfile(profileId)
  }
}
