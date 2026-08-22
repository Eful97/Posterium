import { NextRequest } from "next/server"
import { buildManifestResponse } from "@/lib/build-manifest"

type RouteParams = { config: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { config } = await params
  const user = req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("user")
  return await buildManifestResponse(req, user, config)
}
