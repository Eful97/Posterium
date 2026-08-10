import { NextRequest } from "next/server"
import { buildManifestResponse } from "@/lib/build-manifest"

type RouteParams = { uuid: string }

// Profilo via path (query-free, accettato da AIOMetadata):
//   /u/<uuid>/manifest.json
export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { uuid } = await params
  const config = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  return buildManifestResponse(req, uuid, config)
}
