import fs from "node:fs"
import fsp from "node:fs/promises"
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
const MAX_CACHE_SIZE = 500 * 1024 * 1024

function ensureDir(dir: string) {
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
}

export function hashKey(key: string): string {
  return crypto.createHash("md5").update(key).digest("hex").slice(0, 16)
}

// --- Sync (kept for backward compat, but async preferred) ---

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
  evictIfNeeded(dir)
}

// --- Async (non-blocking) ---

export async function diskCacheGetAsync(namespace: string, key: string, ttlMs: number): Promise<Buffer | null> {
  const filePath = path.join(CACHE_DIR, namespace, `${hashKey(key)}.dat`)
  try {
    const stat = await fsp.stat(filePath)
    if (Date.now() - stat.mtimeMs < ttlMs) {
      return await fsp.readFile(filePath)
    }
    await fsp.unlink(filePath).catch(() => {})
  } catch {}
  return null
}

export async function diskCacheSetAsync(namespace: string, key: string, data: Buffer): Promise<void> {
  const dir = path.join(CACHE_DIR, namespace)
  await fsp.mkdir(dir, { recursive: true }).catch(() => {})
  const filePath = path.join(dir, `${hashKey(key)}.dat`)
  await fsp.writeFile(filePath, data).catch(() => {})
}

// --- Eviction ---

let evictPending = false

function evictIfNeeded(dir: string): void {
  if (evictPending) return
  evictPending = true
  setTimeout(() => {
    evictPending = false
    try {
      const files = fs.readdirSync(dir).map(f => {
        const fp = path.join(dir, f)
        const stat = fs.statSync(fp)
        return { fp, mtime: stat.mtimeMs, size: stat.size }
      }).sort((a, b) => a.mtime - b.mtime)
      let totalSize = files.reduce((s, f) => s + f.size, 0)
      for (const f of files) {
        if (totalSize <= MAX_CACHE_SIZE) break
        try { fs.unlinkSync(f.fp) } catch {}
        totalSize -= f.size
      }
    } catch {}
  }, 0)
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
