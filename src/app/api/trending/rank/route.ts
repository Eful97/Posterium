import { NextRequest } from "next/server"
import { getJWRankings } from "@/lib/justwatch"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { createLogger } from "@/lib/logger"

const log = createLogger("trending-rank")

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const type = req.nextUrl.searchParams.get("type") as "movie" | "tv" | null
  const id = Number(req.nextUrl.searchParams.get("id"))
  if (!type || !id) return Response.json({ rank: null })
  const cacheKey = `rank:v2:${type}:${id}`
  const cached = cacheGet<{ rank: number | null; period?: string }>(cacheKey)
  if (cached) return Response.json(cached)
  const headers = { "Cache-Control": "public, max-age=300, s-maxage=1800" }
  try {
    const rankings = await getJWRankings(type === "movie" ? "MOVIE" : "SHOW", "IT")
    const found = rankings.find((r) => r.tmdbId === id)
    if (found) {
      const body = { rank: found.rank, period: "day" }
      cacheSet(cacheKey, body, ["rank", "justwatch"])
      return Response.json(body, { headers })
    }
    // No-match: TTL breve — un item può entrare in classifica nel giro di
    // minuti, ma il fallimento (o l'assenza) non deve congelarsi per MAX_TTL.
    const body = { rank: null }
    cacheSet(cacheKey, body, ["rank", "justwatch"], 60_000)
    return Response.json(body, { headers })
  } catch (e) {
    // Errore di rete: NON cachare il fallimento, ritenta al prossimo accesso.
    log.error("Fetch failed", { error: e instanceof Error ? e.message : String(e) })
    return Response.json({ rank: null }, { headers: { "Cache-Control": "no-store" } })
  }
}
