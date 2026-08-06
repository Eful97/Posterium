import fs from "node:fs/promises"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { DATA_DIR } from "@/lib/data-dir"
import { createLogger } from "@/lib/logger"
import type { BadgeStyle, RankingBadgeStyle } from "@/lib/badge-styles"

const log = createLogger("server-defaults")

export interface ServerDefaults {
  badgeStyle?: BadgeStyle
  rankingBadgeStyle?: RankingBadgeStyle
  blurEnabled?: boolean
  blurIntensity?: number
  blurFade?: number
  blurDarkness?: number
  gradientHeight?: number
  globalBadges?: boolean
  rankingBadges?: boolean
  badgeGenre?: boolean
  badgeYear?: boolean
  badgeRating?: boolean
  autoRotateClean?: boolean
  defaultLogoFitEnabled?: boolean
  networkLogo?: boolean
  ribbonSide?: "left" | "right"
  /** Chiave TMDB d'istanza (impostabile dalle impostazioni, mascherata in GET). */
  tmdbApiKey?: string
  /** Chiave MDBList d'istanza (impostabile dalle impostazioni, mascherata in GET). */
  mdblistApiKey?: string
}

const FILE = path.join(DATA_DIR, "defaults.json")
const useKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
const KV_KEY = "defaults"

let cached: ServerDefaults | null = null
let warmPromise: Promise<void> | null = null
let writeQueue = Promise.resolve()

function logDefaultsError(action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  log.warn(action, { error: message })
}

async function loadFromDisk(): Promise<ServerDefaults> {
  try {
    const raw = await fs.readFile(FILE, "utf-8")
    return JSON.parse(raw) as ServerDefaults
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist yet — fine
    } else {
      logDefaultsError("failed to load defaults", error)
    }
    return {}
  }
}

async function kvLoadDefaults(): Promise<ServerDefaults> {
  try {
    const { kv } = await import("@vercel/kv")
    const raw = await kv.get<ServerDefaults>(KV_KEY)
    return raw ?? {}
  } catch (error) {
    logDefaultsError("failed to load defaults (KV)", error)
    return {}
  }
}

/** Carica i defaults in cache (una sola volta per cold start). */
function warmDefaults(): Promise<void> {
  if (warmPromise) return warmPromise
  warmPromise = (async () => {
    const d = useKv ? await kvLoadDefaults() : await loadFromDisk()
    cached = d
  })().catch(() => {})
  return warmPromise
}

export function getServerDefaults(): ServerDefaults {
  if (cached) return cached
  // In modalità file: lettura sync una tantum al cold start (i chiamanti sono
  // sync). In modalità KV: la lettura è async, la cache si riempie con
  // warmDefaults() — i primi millisecondi restituiscono {} e le chiavi cadono
  // sulle env (fallback accettabile, Vercel tiene le istanze calde).
  if (!useKv) {
    try {
      if (existsSync(FILE)) {
        const raw = readFileSync(FILE, "utf-8")
        cached = JSON.parse(raw) as ServerDefaults
      }
    } catch (error) {
      logDefaultsError("failed to load defaults (cold start)", error)
    }
  }
  if (!cached) cached = {}
  warmDefaults()
  return cached
}
export async function setServerDefaults(d: ServerDefaults): Promise<void> {
  if (useKv) {
    try {
      const { kv } = await import("@vercel/kv")
      await kv.set(KV_KEY, d)
      cached = { ...d }
    } catch (error) {
      logDefaultsError("failed to write defaults (KV)", error)
      throw error
    }
    return
  }
  const existing = writeQueue
  writeQueue = (async () => {
    await existing
    try {
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(FILE, JSON.stringify(d, null, 2))
      cached = { ...d }
    } catch (error) {
      logDefaultsError("failed to write defaults", error)
      throw error
    }
  })()
  await writeQueue
}

/** Mascara un segreto: mai mostrato per intero (•••• + ultimi 4). */
export function maskKey(value: string | undefined): string {
  if (!value) return ""
  if (value.length <= 4) return "••••"
  return `••••${value.slice(-4)}`
}

/** True se il valore inviato dal client è il placeholder mascherato (non va salvato). */
export function isMaskedValue(value: string | undefined): boolean {
  return typeof value === "string" && value.startsWith("••••")
}
