import { NextRequest } from "next/server"
import { posteriumCatalog } from "@/lib/catalog-handler"

export const maxDuration = 60

type RouteParams = { config: string; type: string; id: string; extra: string[] }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { config, type: mediaType, id: rawId, extra } = await params
  const userParam = req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("user")
  return posteriumCatalog(req, mediaType, rawId, userParam, config, extra)
}
