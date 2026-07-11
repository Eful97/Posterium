import { NextResponse } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { DATA_DIR } from "@/lib/data-dir"
import { accessSync, constants, readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { join } from "node:path"

async function checkEndpoint(url: string): Promise<{ ok: boolean; status: number; time: number }> {
  const start = performance.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    return { ok: res.ok, status: res.status, time: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, status: 0, time: Math.round(performance.now() - start) }
  }
}

function storageInfo() {
  const info: {
    path: string
    exists: boolean
    writable: boolean
    writeTest: boolean
    fileCount: number
    dataFileExists: boolean
    mappingsCount: number
    envDataDir: string | undefined
    hfStorageDir: string | undefined
    storageLinked: boolean
    cwd: string
    uid: number
    dirEntries: string[]
  } = {
    path: DATA_DIR,
    exists: false,
    writable: false,
    writeTest: false,
    fileCount: 0,
    dataFileExists: false,
    mappingsCount: 0,
    envDataDir: process.env.POSTERIUM_DATA_DIR,
    hfStorageDir: process.env.HF_STORAGE_DIR,
    storageLinked: false,
    cwd: process.cwd(),
    uid: typeof process.getuid === "function" ? process.getuid() : -1,
    dirEntries: [],
  }

  // Check HF Storage Bucket linking
  const hfStorage = process.env.HF_STORAGE_DIR
  info.storageLinked = !!(hfStorage && hfStorage === DATA_DIR)

  try {
    accessSync(DATA_DIR, constants.R_OK | constants.W_OK)
    info.exists = true
    info.writable = true
    const entries = readdirSync(DATA_DIR)
    info.fileCount = entries.length
    info.dirEntries = entries
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    info.dirEntries = [`access error: ${msg}`]
  }

  // Runtime write test (catches FUSE mount issues)
  const testFile = join(DATA_DIR, ".health_write_test")
  try {
    writeFileSync(testFile, `health-check-${Date.now()}`)
    unlinkSync(testFile)
    info.writeTest = true
  } catch {
    info.writeTest = false
  }

  const mappingsPath = join(DATA_DIR, "mappings.json")
  try {
    accessSync(mappingsPath, constants.R_OK)
    info.dataFileExists = true
    const raw = JSON.parse(readFileSync(mappingsPath, "utf-8"))
    info.mappingsCount = Object.keys(raw).length
  } catch { /* ok */ }
  return info
}

export async function GET(request: Request) {
  const rl = rateLimit(rateLimitKey(request), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { searchParams } = new URL(request.url)
  const apiKey = searchParams.get("api_key") || process.env.TMDB_API_KEY || ""
  const tmdbTrending = apiKey
    ? await checkEndpoint(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`)
    : { ok: false, status: 401, time: 0 }
  const tmdbSearch = apiKey
    ? await checkEndpoint(`https://api.themoviedb.org/3/search/multi?query=test&api_key=${apiKey}`)
    : { ok: false, status: 401, time: 0 }
  const tmdbPopular = apiKey
    ? await checkEndpoint(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}`)
    : { ok: false, status: 401, time: 0 }
  const justwatch = apiKey
    ? await checkEndpoint(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&watch_region=IT`)
    : { ok: false, status: 401, time: 0 }
  const flixpatrol = apiKey
    ? await checkEndpoint(`https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}`)
    : { ok: false, status: 401, time: 0 }
  const externalIds = apiKey
    ? await checkEndpoint(`https://api.themoviedb.org/3/movie/550/external_ids?api_key=${apiKey}`)
    : { ok: false, status: 401, time: 0 }
  const storage = storageInfo()
  const health = {
    status: tmdbTrending.ok && tmdbSearch.ok ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    tmdb: { apiKey: !!apiKey, apiKeyLength: apiKey.length, trending: tmdbTrending, search: tmdbSearch, popular: tmdbPopular, externalIds },
    streaming: { justwatch, flixpatrol },
    system: { node: process.version, platform: process.platform, env: process.env.NODE_ENV },
    storage,
  }
  const storageOk = storage.writeTest || storage.mappingsCount === 0
  const statusCode = (tmdbTrending.ok && tmdbSearch.ok && storageOk) ? 200 : (storageOk ? 503 : 503)
  return NextResponse.json(health, { status: statusCode })
}
