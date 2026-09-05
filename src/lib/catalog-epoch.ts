import fsp from "node:fs/promises"
import path from "node:path"
import { DATA_DIR } from "@/lib/data-dir"
import { createLogger } from "@/lib/logger"

/**
 * Epoch globale dei cataloghi Stremio (F3).
 *
 * La cache dei cataloghi è in-process (`lib/cache.ts`) con refresh schedulato:
 * su deploy multi-istanza (Vercel serverless) l'invalidazione locale
 * `cacheInvalidate("stremio")` non raggiunge le altre istanze e il cambio
 * poster / cambio default resta invisibile fino a ~24h. Includendo questa epoch
 * nel cache key del catalogo, ogni save (mapping o defaults) cambia la chiave
 * su TUTTE le istanze entro il TTL di lettura — invalidazione cross-instance
 * senza refactor della cache.
 *
 * L'epoch è un token opaco che cambia a ogni bump (timestamp + random: niente
 * race read-modify-write tra istanze). Persistenza file (single-instance) o KV
 * (serverless), stessi pattern di `lib/store.ts`.
 */

const log = createLogger("catalog-epoch")

const useKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
const KV_KEY = "catalog_epoch"
const FILE = path.join(DATA_DIR, "catalog-epoch.json")

// TTL lettura: speculare a store.ts (500ms, 0 nei test per determinismo).
const READ_TTL_MS = process.env.NODE_ENV === "test" ? 0 : 500
let memCache: string | null = null
let memCacheAt = 0

function newEpoch(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

async function readFromDisk(): Promise<string | null> {
  try {
    const raw = await fsp.readFile(FILE, "utf-8")
    const data = JSON.parse(raw) as { epoch?: unknown }
    return typeof data.epoch === "string" && data.epoch ? data.epoch : null
  } catch {
    return null
  }
}

async function kvRead(): Promise<string | null> {
  try {
    const { kv } = await import("@vercel/kv")
    const raw = await kv.get<string>(KV_KEY)
    return typeof raw === "string" && raw ? raw : null
  } catch (e) {
    log.warn("epoch KV read failed", { error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

/**
 * Epoch corrente ("0" se mai impostata). Lettura cachata a finestra breve:
 * il costo per richiesta catalogo è uno stat file / get KV al massimo ogni
 * 500ms, come per i mapping.
 */
export async function getCatalogEpoch(): Promise<string> {
  const now = Date.now()
  if (memCache !== null && now - memCacheAt < READ_TTL_MS) return memCache
  const stored = useKv ? await kvRead() : await readFromDisk()
  memCache = stored ?? "0"
  memCacheAt = Date.now()
  return memCache
}

/**
 * Fa avanzare l'epoch (da chiamare su ogni scrittura mapping/defaults).
 * Aggiorna subito la mem-cache locale così l'istanza che scrive non serve
 * stale nemmeno dentro la finestra TTL.
 */
export async function bumpCatalogEpoch(): Promise<string> {
  const next = newEpoch()
  try {
    if (useKv) {
      const { kv } = await import("@vercel/kv")
      await kv.set(KV_KEY, next)
    } else {
      await fsp.mkdir(DATA_DIR, { recursive: true })
      await fsp.writeFile(FILE, JSON.stringify({ epoch: next }))
    }
  } catch (e) {
    // L'epoch è un'ottimizzazione di invalidazione, mai un hard-fail del save:
    // se la persist fallisce, la cache in-process resta comunque invalidata.
    log.warn("epoch persist failed", { error: e instanceof Error ? e.message : String(e) })
    return memCache ?? "0"
  }
  memCache = next
  memCacheAt = Date.now()
  return next
}
