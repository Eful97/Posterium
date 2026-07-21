import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { DATA_DIR } from "@/lib/data-dir"

export interface ServerDefaults {
  badgeStyle?: string
  blurEnabled?: boolean
  blurIntensity?: number
  blurFade?: number
  blurDarkness?: number
  gradientHeight?: number
  globalBadges?: boolean
  rankingBadges?: boolean
  autoRotateClean?: boolean
  defaultLogoFitEnabled?: boolean
  networkLogo?: boolean
}

const FILE = path.join(DATA_DIR, "defaults.json")

let cached: ServerDefaults | null = null
let loaded = false
let writeQueue = Promise.resolve()

function logDefaultsError(action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[server-defaults] ${action}: ${message}`)
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

export function getServerDefaults(): ServerDefaults {
  if (loaded && cached) return cached
  // One-time sync read at cold start to keep the API synchronous
  // (callers are all synchronous — making them all async would be a much larger refactor)
  try {
    if (existsSync(FILE)) {
      const raw = require("node:fs").readFileSync(FILE, "utf-8")
      cached = JSON.parse(raw) as ServerDefaults
    }
  } catch (error) {
    logDefaultsError("failed to load defaults (cold start)", error)
  }
  loaded = true
  if (!cached) cached = {}
  // Warm async for next cold start (in case sync read had a race)
  loadFromDisk().then((d) => { cached = d }).catch(() => {})
  return cached
}

export async function setServerDefaults(d: ServerDefaults): Promise<void> {
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
