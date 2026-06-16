import { NextRequest } from "next/server"
import { fetchAllWikidata } from "@/lib/awards"

type RouteParams = { type: string; id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { type, id } = await params
  const mediaType = type === "tv" || type === "series" ? "tv" : "movie"
  const tmdbId = Number(id)
  if (!tmdbId) return Response.json({ awards: [], nominations: [], studios: [] })
  const data = await fetchAllWikidata(tmdbId, mediaType)
  return Response.json(data)
}
