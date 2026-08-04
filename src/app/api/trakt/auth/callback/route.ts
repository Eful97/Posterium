import { NextRequest } from "next/server"
import { handleOAuthCallback } from "@/lib/oauth-flow"
import { traktOAuthConfig } from "@/lib/oauth-platforms"

export async function GET(req: NextRequest) {
  return handleOAuthCallback(req, traktOAuthConfig)
}
