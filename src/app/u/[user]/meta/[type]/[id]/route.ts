import { NextRequest } from "next/server"
import { posteriumMeta } from "@/lib/meta-handler"

export const maxDuration = 60

type RouteParams = { user: string; type: string; id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { user, type: mediaType, id: rawId } = await params
  const configParam = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  return posteriumMeta(req, mediaType, rawId, user, configParam)
}
