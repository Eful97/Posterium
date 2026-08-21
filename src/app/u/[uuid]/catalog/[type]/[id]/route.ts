import { NextRequest } from "next/server"
import { posteriumCatalog } from "@/lib/catalog-handler"

export const maxDuration = 60

type RouteParams = { uuid: string; type: string; id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { uuid, type: mediaType, id: rawId } = await params
  const configParam = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  return posteriumCatalog(req, mediaType, rawId, uuid, configParam)
}
