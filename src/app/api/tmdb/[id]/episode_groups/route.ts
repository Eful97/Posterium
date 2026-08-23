import { NextRequest } from "next/server"
import { getTVEpisodeGroups, resolveRequestApiKey } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { id } = await params
  const tvId = parseInt(id, 10)
  if (Number.isNaN(tvId) || tvId <= 0) {
    return Response.json({ results: [] }, { status: 400 })
  }

  const apiKey = resolveRequestApiKey(req)
  const results = await getTVEpisodeGroups(tvId, apiKey)
  return Response.json({ results })
}
