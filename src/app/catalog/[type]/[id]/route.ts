import { NextRequest } from "next/server"
import { posteriumCatalog } from "@/lib/catalog-handler"

// Vercel: i cataloghi freddi fanno 20 getDetails + ranking → fino a ~10s.
export const maxDuration = 60

type RouteParams = { type: string; id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { type: mediaType, id: rawId } = await params
  const configParam = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  return posteriumCatalog(req, mediaType, rawId, configParam)
}
