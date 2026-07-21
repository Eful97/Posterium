import fs from "node:fs"
import path from "node:path"
import { DATA_DIR } from "@/lib/data-dir"

export interface ServerDefaults {
  badgeStyle?: string
  rankingBadgeStyle?: string
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
let cachedMtime = 0

function logDefaultsError(action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[server-defaults] ${action}: ${message}`)
}

export function getServerDefaults(): ServerDefaults {
  try {
    if (fs.existsSync(FILE)) {
      const stat = fs.statSync(FILE)
      if (cached && stat.mtimeMs <= cachedMtime) return cached
      const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8")) as ServerDefaults
      cached = parsed
      cachedMtime = stat.mtimeMs
      return parsed
    }
  } catch (error) {
    logDefaultsError("failed to load defaults", error)
  }
  if (cached) return cached
  cached = {}
  return cached
}

export function setServerDefaults(d: ServerDefaults): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(d, null, 2))
  cached = { ...d }
  cachedMtime = Date.now()
}
