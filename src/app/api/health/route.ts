import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

const DATA_FILE = path.join(process.cwd(), "data", "mappings.json")

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
  const cached = cacheGet("health")
  if (cached) return NextResponse.json(cached)
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
  const mappingsCount = (() => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8")
        const data = JSON.parse(raw)
        return Object.keys(data).length
      }
      return 0
    } catch {
      return -1
    }
  })()
  const health = {
    status: tmdbTrending.ok && tmdbSearch.ok ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    tmdb: { apiKey: !!apiKey, apiKeyLength: apiKey.length, trending: tmdbTrending, search: tmdbSearch, popular: tmdbPopular, externalIds },
    streaming: { justwatch, flixpatrol },
    storage: { mappingsCount, dataFileExists: fs.existsSync(DATA_FILE) },
    system: { node: process.version, platform: process.platform, env: process.env.NODE_ENV },
  }
  cacheSet("health", health, ["health"])
  const statusCode = health.status === "healthy" ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}
