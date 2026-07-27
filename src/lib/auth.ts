import { createLogger } from "@/lib/logger"

const log = createLogger("auth")

function resolveAdminToken(): string | undefined {
  return process.env.POSTERIUM_ADMIN_TOKEN || process.env.ADMIN_TOKEN || undefined
}

if (!resolveAdminToken()) {
  log.warn("⚠️  Nessun ADMIN_TOKEN configurato — tutte le route admin sono accessibili senza autenticazione.")
  log.warn("   Imposta POSTERIUM_ADMIN_TOKEN (o ADMIN_TOKEN) in produzione.")
}

export function checkAdminToken(request: Request): boolean {
  const token = resolveAdminToken()
  if (!token) return true

  const headers = request.headers
  const bearer = headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const xtoken = headers.get("x-admin-token")
  return bearer === token || xtoken === token
}

export function adminAuthResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized. Set x-admin-token or Authorization: Bearer header." }), {
    status: 401,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  })
}
