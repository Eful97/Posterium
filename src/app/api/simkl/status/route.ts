import { NextRequest } from "next/server"
import { handleOAuthStatus } from "@/lib/oauth-flow"
import { simklOAuthConfig } from "@/lib/oauth-platforms"

export async function GET(req: NextRequest) {
  return handleOAuthStatus(req, simklOAuthConfig)
}
