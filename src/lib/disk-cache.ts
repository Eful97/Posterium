import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const root = (() => {
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

const CACHE_DIR = path.join(root, "cache")

function ensureDir(dir: string) {
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
}

export function hashKey(key: string): string {
  return crypto.createHash("md5").update(key).digest("hex").slice(0, 16)
}

export function diskCacheGet(namespace: string, key: string, ttlMs: number): Buffer | null {
  const filePath = path.join(CACHE_DIR, namespace, `${hashKey(key)}.dat`)
  try {
    const stat = fs.statSync(filePath)
    if (Date.now() - stat.mtimeMs < ttlMs) {
      return fs.readFileSync(filePath)
    }
    fs.unlinkSync(filePath)
  } catch {}
  return null
}

export function diskCacheSet(namespace: string, key: string, data: Buffer): void {
  const dir = path.join(CACHE_DIR, namespace)
  ensureDir(dir)
  const filePath = path.join(dir, `${hashKey(key)}.dat`)
  try { fs.writeFileSync(filePath, data) } catch {}
}

export function diskCacheRemove(namespace: string, key: string): void {
  const filePath = path.join(CACHE_DIR, namespace, `${hashKey(key)}.dat`)
  try { fs.unlinkSync(filePath) } catch {}
}

export function diskCacheClear(namespace: string): void {
  const dir = path.join(CACHE_DIR, namespace)
  try {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      try { fs.unlinkSync(path.join(dir, f)) } catch {}
    }
  } catch {}
}
