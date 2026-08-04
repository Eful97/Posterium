import { NextRequest } from "next/server"
import { handleOAuthStart } from "@/lib/oauth-flow"
import { traktOAuthConfig } from "@/lib/oauth-platforms"

export async function GET(req: NextRequest) {
  return handleOAuthStart(req, traktOAuthConfig)
}
