import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getTvdbSeasonTypes, getTvdbSeriesId } from "@/lib/tvdb"
import crypto from "node:crypto"

function hashFragment(v: string): string {
  return crypto.createHash("sha1").update(v).digest("hex").slice(0, 8)
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { id } = await context.params
  const rawId = (id || "").trim()
  if (!rawId) return Response.json({ error: "Missing id" }, { status: 400 })

  const tvdbKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("tvdb_key") || process.env.POSTERIUM_TVDB_API_KEY || process.env.TVDB_API_KEY || ""
  if (!tvdbKey) return Response.json({ results: [], error: "TVDB key missing" }, { status: 200 })

  const cacheKey = `tvdb:seasonTypes:raw${rawId}:ak${hashFragment(tvdbKey)}`
  const cached = cacheGet<{ results: { id: number; name: string; type: string }[] }>(cacheKey)
  if (cached) return Response.json(cached, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=3600" } })

  try {
    // rawId è solitamente tmdbId o imdb tt... — risolvi tvdbSeriesId via remoteid
    // Se è già numerico tvdb, provalo diretto, altrimenti usa search
    let tvdbSeriesId: number | null = null
    const asNum = parseInt(rawId, 10)
    if (String(asNum) === rawId && asNum > 0) {
      // prova come tmdb/imdb remoteid prima, fallback diretto
      tvdbSeriesId = await getTvdbSeriesId(rawId, tvdbKey)
      if (!tvdbSeriesId) {
        // se rawId sembra tvdb (test con seasonTypes diretto)
        const trial = await getTvdbSeasonTypes(asNum, tvdbKey)
        if (trial.length > 0) {
          const body = { results: trial.map((t) => ({ id: t.id, name: t.name, type: t.type })) }
          cacheSet(cacheKey, body, ["tvdb"], 24 * 60 * 60 * 1000)
          return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=3600" } })
        }
      }
    } else {
      tvdbSeriesId = await getTvdbSeriesId(rawId, tvdbKey)
      // fallback: se rawId è tt... e non trovato, prova come tmdb string numerica senza tt
      if (!tvdbSeriesId && /^tt\d+$/i.test(rawId)) {
        // niente
      }
    }
    if (!tvdbSeriesId) {
      // prova a interpretare rawId come tvdb id diretto se numerico
      if (Number.isFinite(asNum) && asNum > 0) {
        const trial = await getTvdbSeasonTypes(asNum, tvdbKey)
        if (trial.length > 0) {
          const body = { results: trial.map((t) => ({ id: t.id, name: t.name, type: t.type })) }
          cacheSet(cacheKey, body, ["tvdb"], 24 * 60 * 60 * 1000)
          return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=3600" } })
        }
      }
      return Response.json({ results: [] }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } })
    }

    const types = await getTvdbSeasonTypes(tvdbSeriesId, tvdbKey)
    const body = { results: types.map((t) => ({ id: t.id, name: t.name, type: t.type })) }
    cacheSet(cacheKey, body, ["tvdb"], 24 * 60 * 60 * 1000)
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=3600" } })
  } catch {
    return Response.json({ results: [] }, { status: 200 })
  }
}
