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
}

const FILE = path.join(DATA_DIR, "defaults.json")

let cached: ServerDefaults | null = null
let cachedMtime = 0

export function getServerDefaults(): ServerDefaults {
  try {
    if (fs.existsSync(FILE)) {
      const stat = fs.statSync(FILE)
      if (cached && stat.mtimeMs <= cachedMtime) return cached
      cached = JSON.parse(fs.readFileSync(FILE, "utf-8"))
      cachedMtime = stat.mtimeMs
      return cached!
    }
  } catch {}
  if (cached) return cached
  cached = {}
  return cached
}

export function setServerDefaults(d: ServerDefaults): void {
  cached = { ...d }
  cachedMtime = Date.now()
  try { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)) } catch {}
}
