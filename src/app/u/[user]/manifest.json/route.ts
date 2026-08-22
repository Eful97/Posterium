import { NextRequest } from "next/server"
import { buildManifestResponse } from "@/lib/build-manifest"

type RouteParams = { user: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { user } = await params
  const config = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  return await buildManifestResponse(req, user, config)
}
