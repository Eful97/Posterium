import fs from "node:fs"
import path from "node:path"

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

const DATA_DIR = (() => {
  const hfData = "/data"
  try {
    if (fs.existsSync(hfData)) {
      const testFile = path.join(hfData, ".write_test")
      fs.writeFileSync(testFile, "ok")
      fs.unlinkSync(testFile)
      return hfData
    }
  } catch {}
  return path.join(process.cwd(), "data")
})()

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
