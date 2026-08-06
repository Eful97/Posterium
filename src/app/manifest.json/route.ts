import { NextRequest } from "next/server"
import { buildManifestResponse } from "@/lib/build-manifest"

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("user")
  const config = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  return buildManifestResponse(req, user, config)
}
