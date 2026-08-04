import { NextRequest } from "next/server"
import { handleOAuthDisconnect } from "@/lib/oauth-flow"
import { simklOAuthConfig } from "@/lib/oauth-platforms"

export async function POST(req: NextRequest) {
  return handleOAuthDisconnect(req, simklOAuthConfig)
}
