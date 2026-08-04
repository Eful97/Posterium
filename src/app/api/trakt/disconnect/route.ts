import { NextRequest } from "next/server"
import { handleOAuthDisconnect } from "@/lib/oauth-flow"
import { traktOAuthConfig } from "@/lib/oauth-platforms"

export async function POST(req: NextRequest) {
  return handleOAuthDisconnect(req, traktOAuthConfig)
}
