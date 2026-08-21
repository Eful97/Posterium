import { NextRequest } from "next/server"
import { getTVEpisodeGroups, resolveRequestApiKey } from "@/lib/tmdb"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tvId = parseInt(id, 10)
  if (Number.isNaN(tvId) || tvId <= 0) {
    return Response.json({ results: [] }, { status: 400 })
  }

  const apiKey = resolveRequestApiKey(req)
  const results = await getTVEpisodeGroups(tvId, apiKey)
  return Response.json({ results })
}
