import { NextRequest } from "next/server"
import { getAll } from "@/lib/store"
import { APP_VERSION } from "@/generated/app-version"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  // Fail-open senza ADMIN_TOKEN (istanza pubblica HF Spaces); fail-closed con token.
  if (!checkAdminToken(req)) return adminAuthResponse()
  const mappings = await getAll()
  return Response.json({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    mappings,
  })
}
