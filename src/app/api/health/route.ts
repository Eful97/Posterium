import fsp from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { DATA_DIR } from "@/lib/data-dir"
import { getAll } from "@/lib/store"

async function fileExists(file: string): Promise<boolean> {
  try {
    await fsp.access(file)
    return true
  } catch {
    return false
  }
}

async function canRead(file: string): Promise<boolean> {
  try {
    await fsp.readFile(file, "utf-8")
    return true
  } catch {
    return false
  }
}

async function canWriteDir(dir: string): Promise<boolean> {
  const probe = path.join(dir, `.posterium-healthcheck-${Date.now()}`)
  try {
    await fsp.writeFile(probe, "ok")
    await fsp.unlink(probe)
    return true
  } catch {
    return false
  }
}

async function checkEndpoint(url: string): Promise<{ ok: boolean; status: number; time: number }> {
  const start = performance.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    return { ok: res.ok, status: res.status, time: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, status: 0, time: Math.round(performance.now() - start) }
  }
}

export async function GET(request: Request) {
  const rl = rateLimit(rateLimitKey(request), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { searchParams } = new URL(request.url)
  const apiKey = searchParams.get("api_key") || process.env.TMDB_API_KEY || ""

  const [tmdbTrending, tmdbSearch, tmdbPopular, externalIds] = apiKey
    ? await Promise.all([
        checkEndpoint(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`),
        checkEndpoint(`https://api.themoviedb.org/3/search/multi?query=test&api_key=${apiKey}`),
        checkEndpoint(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}`),
        checkEndpoint(`https://api.themoviedb.org/3/movie/550/external_ids?api_key=${apiKey}`),
      ])
    : [
        { ok: false, status: 401, time: 0 },
        { ok: false, status: 401, time: 0 },
        { ok: false, status: 401, time: 0 },
        { ok: false, status: 401, time: 0 },
      ]

  const justwatch = apiKey
    ? await checkEndpoint(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&watch_region=IT`)
    : { ok: false, status: 401, time: 0 }
  const flixpatrol = apiKey
    ? await checkEndpoint(`https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}`)
    : { ok: false, status: 401, time: 0 }

  const mappingsFile = path.join(DATA_DIR, "mappings.json")
  const defaultsFile = path.join(DATA_DIR, "defaults.json")

  await fsp.mkdir(DATA_DIR, { recursive: true }).catch(() => {})

  const mappings = await getAll().catch(() => [])
  const lastMappingUpdatedAt = mappings
    .map((m) => m.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  const storage = {
    dataDir: DATA_DIR,
    dataDirExists: await fileExists(DATA_DIR),
    dataDirWritable: await canWriteDir(DATA_DIR),
    mappingsFileExists: await fileExists(mappingsFile),
    dataFileExists: await fileExists(mappingsFile),
    mappingsReadable: await canRead(mappingsFile),
    mappingsWritable: await canWriteDir(DATA_DIR),
    defaultsFileExists: await fileExists(defaultsFile),
    defaultsReadable: await canRead(defaultsFile),
    defaultsWritable: await canWriteDir(DATA_DIR),
    mappingCount: mappings.length,
    mappingsCount: mappings.length,
    lastMappingUpdatedAt,
  }

  const health = {
    status: tmdbTrending.ok && tmdbSearch.ok ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    tmdb: { apiKey: !!apiKey, trending: tmdbTrending, search: tmdbSearch, popular: tmdbPopular, externalIds },
    streaming: { justwatch, flixpatrol },
    system: { node: process.version, platform: process.platform, env: process.env.NODE_ENV },
    storage,
  }

  const storageOk = storage.dataDirWritable || storage.mappingCount === 0
  const statusCode = tmdbTrending.ok && tmdbSearch.ok && storageOk ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}
