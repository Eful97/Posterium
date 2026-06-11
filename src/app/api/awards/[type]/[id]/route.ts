import { NextRequest } from "next/server"
import { fetchAwards } from "@/lib/awards"

type RouteParams = { type: string; id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { type, id } = await params
  const mediaType = type === "tv" || type === "series" ? "tv" : "movie"
  const tmdbId = Number(id)
  if (!tmdbId) return Response.json({ awards: [] })
  const awards = await fetchAwards(tmdbId, mediaType)
  return Response.json({ awards })
}
