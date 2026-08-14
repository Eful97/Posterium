import fsp from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { DATA_DIR } from "@/lib/data-dir"
import type { PosteriumUserConfig } from "@/lib/config-token"
import type { Mapping } from "@/lib/types"
import { createLogger } from "@/lib/logger"

const log = createLogger("profile-store")

// ---- Encryption helpers for API keys (AES-256-GCM) ----

const ENCRYPTION_KEY_SECRET = process.env.PROFILE_ENCRYPTION_KEY

if (process.env.NODE_ENV === "production" && !ENCRYPTION_KEY_SECRET) {
  log.warn("PROFILE_ENCRYPTION_KEY non impostata — apiKeys e token OAuth dei profili verranno salvati in chiaro su disco/KV. Imposta la variabile per cifrarli a riposo (AES-256-GCM).")
}

function deriveEncryptionKey(): Buffer | null {
  if (!ENCRYPTION_KEY_SECRET) return null
  return crypto.createHash("sha256").update(ENCRYPTION_KEY_SECRET).digest()
}

const ENC_PREFIX = "v1"

function encryptValue(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag().toString("hex")
  return `${ENC_PREFIX}:${iv.toString("hex")}:${authTag}:${encrypted}`
}

function decryptValue(ciphertext: string, key: Buffer): string | null {
  try {
    const parts = ciphertext.split(":")
    if (parts[0] !== ENC_PREFIX || parts.length !== 4) return null
    const iv = Buffer.from(parts[1], "hex")
    const authTag = Buffer.from(parts[2], "hex")
    const encrypted = parts[3]
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch {
    return null
  }
}

/**
 * Trasforma un apiKey salvata nel valore reale da esporre, gestendo tutti gli
 * stati di cifratura (finding 9):
 * - `v1:...` (cifrata) → decifra se la chiave è configurata, altrimenti ritorna
 *   il valore così com'è (garbage, ma non muta il dato salvato);
 * - `plain:...` → strip del prefisso;
 * - legacy senza prefisso → ritorna così com'è (plaintext storico).
 */
function unwrapApiKey(stored: string, encKey: Buffer | null): string {
  if (stored.startsWith("plain:")) return stored.slice("plain:".length)
  if (stored.startsWith(`${ENC_PREFIX}:`)) {
    if (encKey) {
      const d = decryptValue(stored, encKey)
      if (d) return d
    }
    return stored
  }
  return stored
}

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

/** Regex UUID condivisa: usata per validare i profileId in ingresso e nei load path. */
const PROFILE_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True se la stringa è un profileId UUID valido (stessa regex usata nei load path). */
export function isValidProfileId(id: string): boolean {
  return PROFILE_ID_REGEX.test(id)
}

const PROFILES_FILE = path.join(DATA_DIR, "profiles.json")
const useKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

/** Storage attivo per i profili: "kv" o "file". Utile per errori chiari. */
export function isKvStorageConfigured(): boolean {
  return useKv
}

// ---- Password helpers ----

function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString("hex")
  return new Promise((resolve, reject) => {
    // scrypt async: scryptSync bloccava l'event loop (~decine di ms per hash),
    // un burst di create/update profilo congelava tutta l'istanza (finding 19).
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err)
      resolve({ hash: derivedKey.toString("hex"), salt })
    })
  })
}

function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false)
      const derived = derivedKey.toString("hex")
      if (derived.length !== hash.length) return resolve(false)
      resolve(crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash)))
    })
  })
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

// Cache in-memory delle letture KV: su istanze pubbliche la route poster fa
// getFullProfileData per ogni richiesta con ?u= (sui cache miss). Senza cache,
// ogni lettura = 1 comando KV (budget Upstash free limitato). TTL breve +
// invalidazione sulla write: l'unico rischio è 10s di stale cross-istanza.
const KV_READ_TTL_MS = 10_000
const KV_READ_CACHE_MAX = 500
const kvReadCache = new Map<string, { data: ProfileData | null; ts: number }>()

function kvReadCacheGet(uuid: string): { data: ProfileData | null; ts: number } | undefined {
  return kvReadCache.get(uuid)
}

function kvReadCacheSet(uuid: string, data: ProfileData | null): void {
  if (kvReadCache.size >= KV_READ_CACHE_MAX) {
    const oldest = kvReadCache.keys().next().value
    if (oldest !== undefined) kvReadCache.delete(oldest)
  }
  kvReadCache.set(uuid, { data, ts: Date.now() })
}

function kvReadCacheClear(uuid: string): void {
  kvReadCache.delete(uuid)
}

async function kvGetProfileRaw(uuid: string): Promise<unknown> {
  const { kv } = await import("@vercel/kv")
  return kv.hget("profiles", uuid)
}

async function kvSetProfile(uuid: string, data: ProfileData): Promise<void> {
  const { kv } = await import("@vercel/kv")
  await kv.hset("profiles", { [uuid]: data })
  kvReadCacheClear(uuid)
}

async function kvDeleteProfile(uuid: string): Promise<void> {
  const { kv } = await import("@vercel/kv")
  await kv.hdel("profiles", uuid)
  kvReadCacheClear(uuid)
}

// ---- File-based helpers ----

let writeQueue = Promise.resolve()
let memCache: Record<string, ProfileData> | null = null
let memCacheTime = 0

// Come store.ts: lo stat del file a ogni lettura è costoso su storage remoti
// (HF Spaces FUSE). Stat al massimo ogni READ_STAT_TTL_MS; 0 nei test per
// mantenere il determinismo.
const READ_STAT_TTL_MS = process.env.NODE_ENV === "test" ? 0 : 500
let lastStatAt = 0

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
    log.warn("Failed to load profiles", { error: error instanceof Error ? error.message : String(error) })
    return memCache ?? {}
  }
}

async function readProfilesFromMem(): Promise<Record<string, ProfileData>> {
  const now = Date.now()
  if (memCache && now - lastStatAt < READ_STAT_TTL_MS) return memCache
  lastStatAt = now
  try {
    const stat = await fsp.stat(PROFILES_FILE)
    if (memCache && stat.mtimeMs <= memCacheTime) return memCache
  } catch {
    if (memCache) return memCache
  }
  return loadProfilesFromDisk()
}

async function persistProfiles(data: Record<string, ProfileData>) {
  await ensureDataDir()
  const tmp = `${PROFILES_FILE}.tmp`
  try {
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2))
    await fsp.rename(tmp, PROFILES_FILE)
    // Aggiorna la memCache SOLO dopo la write riuscita: se la persist fallisce,
    // la memCache resta coerente con il disco e non serve dati mai persistiti.
    memCache = data
    memCacheTime = Date.now()
  } catch (e) {
    log.error("Failed to write profiles", { error: e instanceof Error ? e.message : String(e) })
    throw e
  }
}

async function fileGetProfile(uuid: string): Promise<ProfileData | null> {
  const data = await readProfilesFromMem()
  return data[uuid] ?? null
}

async function fileSetProfile(uuid: string, data: ProfileData): Promise<void> {
  return enqueueWrite(async () => {
    const all = await readProfilesFromMem()
    all[uuid] = data
    await persistProfiles(all)
  })
}

async function fileDeleteProfile(uuid: string): Promise<void> {
  return enqueueWrite(async () => {
    const data = await readProfilesFromMem()
    delete data[uuid]
    await persistProfiles(data)
  })
}

// ---- Internal full-profile getter ----

async function getFullProfile(profileId: string): Promise<ProfileData | null> {
  if (useKv) {
    const cached = kvReadCacheGet(profileId)
    if (cached && Date.now() - cached.ts < KV_READ_TTL_MS) return cached.data
    const raw = await kvGetProfileRaw(profileId)
    const data = toProfileData(raw)
    kvReadCacheSet(profileId, data)
    return data
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
  // Defense-in-depth (finding 2): il store non deve MAI usare una chiave
  // arbitraria (la route valida già, ma altri chiamanti potrebbero non farlo).
  if (existingProfileId && !isValidProfileId(existingProfileId)) {
    throw new Error("Invalid profileId")
  }
  const existing = existingProfileId ? await getFullProfile(existingProfileId) : null
  const uuid = existing ? existingProfileId! : (existingProfileId || generateProfileId())

  // Encrypt apiKeys at rest if encryption key is configured. Le chiavi salvate
  // in chiaro vengono marcate con prefisso `plain:` (finding 9): così
  // getFullProfileData può sempre restituire il valore reale anche quando la
  // PROFILE_ENCRYPTION_KEY viene rimossa/reinserita dopo un primo uso.
  const encKey = deriveEncryptionKey()
  let storedApiKeys: ProfileData["apiKeys"] | undefined
  if (apiKeys) {
    storedApiKeys = {}
    if (apiKeys.tmdbKey) {
      storedApiKeys.tmdbKey = encKey ? encryptValue(apiKeys.tmdbKey, encKey) : `plain:${apiKeys.tmdbKey}`
    }
    if (apiKeys.mdblistApiKey) {
      storedApiKeys.mdblistApiKey = encKey ? encryptValue(apiKeys.mdblistApiKey, encKey) : `plain:${apiKeys.mdblistApiKey}`
    }
  } else {
    // Keep existing keys as-is (already encrypted or legacy plaintext)
    storedApiKeys = existing?.apiKeys
  }

  const data: ProfileData = {
    config,
    apiKeys: storedApiKeys,
    mappings: mappings ?? existing?.mappings,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (password) {
    const { hash, salt } = await hashPassword(password)
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
  if (!isValidProfileId(profileId)) {
    return null
  }
  const full = await getFullProfile(profileId)
  return full?.config ?? null
}

export async function getFullProfileData(profileId: string): Promise<ProfileData | null> {
  if (!isValidProfileId(profileId)) {
    return null
  }
  const raw = await getFullProfile(profileId)
  if (!raw) return null
  if (!raw.apiKeys) return raw

  // Unwrap di ogni apiKey (cifrata o plaintext): a differenza del vecchio
  // codice che usciva subito senza chiave, il prefisso `plain:` permette di
  // restituire sempre il valore reale, anche con PROFILE_ENCRYPTION_KEY rimossa.
  const encKey = deriveEncryptionKey()

  // Copy to avoid mutating the internal cache reference
  const result: ProfileData = { ...raw }
  result.apiKeys = { ...raw.apiKeys }
  if (result.apiKeys.tmdbKey) {
    result.apiKeys.tmdbKey = unwrapApiKey(result.apiKeys.tmdbKey, encKey)
  }
  if (result.apiKeys.mdblistApiKey) {
    result.apiKeys.mdblistApiKey = unwrapApiKey(result.apiKeys.mdblistApiKey, encKey)
  }
  return result
}

export async function verifyProfilePassword(profileId: string, password: string): Promise<boolean> {
  if (!isValidProfileId(profileId)) {
    return false
  }
  const full = await getFullProfile(profileId)
  if (!full?.passwordHash || !full?.salt) return false
  return verifyPassword(password, full.passwordHash, full.salt)
}

export async function deleteProfile(profileId: string): Promise<void> {
  if (!isValidProfileId(profileId)) {
    return
  }
  if (useKv) {
    await kvDeleteProfile(profileId)
  } else {
    await fileDeleteProfile(profileId)
  }
}
