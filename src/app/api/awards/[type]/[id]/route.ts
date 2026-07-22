import { NextRequest } from "next/server"
import { fetchAllWikidata } from "@/lib/awards"
import { getKeywords } from "@/lib/tmdb"

type RouteParams = { type: string; id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { type, id } = await params
  const mediaType = type === "tv" || type === "series" ? "tv" : "movie"
  const tmdbId = Number(id)
  if (!tmdbId) return Response.json({ awards: [], nominations: [], studios: [], keywords: [] })
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const [data, keywords] = await Promise.all([
    fetchAllWikidata(tmdbId, mediaType),
    getKeywords(mediaType, tmdbId, apiKey),
  ])
  return Response.json({ ...data, keywords })
}
