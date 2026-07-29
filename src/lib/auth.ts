import crypto from "node:crypto"
import { createLogger } from "@/lib/logger"

const log = createLogger("auth")

function resolveAdminToken(): string | undefined {
  return process.env.POSTERIUM_ADMIN_TOKEN || process.env.ADMIN_TOKEN || undefined
}

if (!resolveAdminToken()) {
  log.warn("⚠️  Nessun ADMIN_TOKEN configurato — in produzione le route admin saranno bloccate.")
  log.warn("   Imposta POSTERIUM_ADMIN_TOKEN (o ADMIN_TOKEN) per abilitare la protezione admin.")
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function checkAdminToken(request: Request): boolean {
  const token = resolveAdminToken()
  // Fail-closed in produzione; in development/test senza token le route admin sono accessibili
  if (!token) return process.env.NODE_ENV !== "production"

  const headers = request.headers
  const bearer = headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const xtoken = headers.get("x-admin-token")
  if (bearer && constantTimeEqual(bearer, token)) return true
  if (xtoken && constantTimeEqual(xtoken, token)) return true
  return false
}

export function adminAuthResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized. Set x-admin-token or Authorization: Bearer header." }), {
    status: 401,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  })
}
