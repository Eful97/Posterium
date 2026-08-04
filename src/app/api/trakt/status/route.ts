import { NextRequest } from "next/server"
import { handleOAuthStatus } from "@/lib/oauth-flow"
import { traktOAuthConfig } from "@/lib/oauth-platforms"

export async function GET(req: NextRequest) {
  return handleOAuthStatus(req, traktOAuthConfig)
}
