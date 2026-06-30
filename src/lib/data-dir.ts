import fs from "node:fs"
import path from "node:path"

export const DATA_DIR = (() => {
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

export const CACHE_DIR = path.join(DATA_DIR, "cache")
export const POSTER_CACHE_DIR = path.join(CACHE_DIR, "poster")
export const TMDB_CACHE_DIR = path.join(CACHE_DIR, "tmdb")
