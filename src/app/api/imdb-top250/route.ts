/**
 * API endpoint: check if an IMDb ID is in the Top 250.
 * Used by the client preview to resolve the "Absolute Cinema" badge.
 *
 * GET /api/imdb-top250?imdbId=tt0111161
 * → { inTop250: true }
 */
import { NextRequest } from "next/server"
import { isImdbTop250 } from "@/lib/imdb-top250"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  // Fix L23: rate limit (prima la route era illimitata e senza header cache).
  const rl = await rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const imdbId = req.nextUrl.searchParams.get("imdbId") || ""
  // Solo id IMDb validi: un input arbitrario non deve scaldare la lookup.
  if (!/^tt\d+$/.test(imdbId)) {
    return Response.json({ inTop250: false }, { headers: { "Cache-Control": "no-store" } })
  }
  try {
    const inTop250 = await isImdbTop250(imdbId)
    return Response.json({ inTop250 }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=1800" } })
  } catch {
    return Response.json({ inTop250: false })
  }
}
