import crypto from "node:crypto"
import { createLogger } from "@/lib/logger"

const log = createLogger("auth")

function resolveAdminToken(): string | undefined {
  return process.env.POSTERIUM_ADMIN_TOKEN || process.env.ADMIN_TOKEN || undefined
}

if (!resolveAdminToken()) {
  log.warn("⚠️  Nessun ADMIN_TOKEN configurato — route admin aperte (istanza pubblica, es. HF Spaces).")
  log.warn("   Imposta POSTERIUM_ADMIN_TOKEN (o ADMIN_TOKEN) per proteggere le route admin (x-admin-token / Bearer).")
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function checkAdminToken(request: Request): boolean {
  const token = resolveAdminToken()
  // Nessun token configurato → istanza pubblica (HF Spaces, multi-utente via
  // profili UUID): le route restano aperte. Il client non invia mai il token
  // admin, quindi bloccare senza token rompe il salvataggio in produzione
  // (POST /api/mappings → 401). Se un token È configurato, la protezione è
  // fail-closed: token assente o errato → rifiutato (constant-time).
  if (!token) return true

  const headers = request.headers
  const bearer = headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const xtoken = headers.get("x-admin-token")
  if (bearer && constantTimeEqual(bearer, token)) return true
  if (xtoken && constantTimeEqual(xtoken, token)) return true
  return false
}

/**
 * Fail-closed admin check: richiede SEMPRE un token admin configurato e valido.
 * A differenza di checkAdminToken (che resta aperto su istanze pubbliche senza
 * ADMIN_TOKEN), questa restituisce false quando non c'è token configurato.
 * Da usare SOLO per le operazioni che devono restare protette anche su HF Spaces
 * (es. DELETE /api/mappings wipe-all, DELETE /api/profile).
 */
export function requireAdminToken(request: Request): boolean {
  const token = resolveAdminToken()
  if (!token) return false

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

function hostnameOf(value: string | null): string | null {
  if (!value) return null
  // X-Forwarded-Host può essere una lista separata da virgole
  const first = value.split(",")[0].trim()
  try {
    return new URL(`https://${first}`).hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * CSRF guard per le mutazioni: se la richiesta include un header Origin
 * (i browser lo inviano sempre per POST/PUT/DELETE cross-origin), il suo
 * hostname deve combaciare con l'host pubblico della richiesta
 * (X-Forwarded-Host se presente — reverse proxy — altrimenti Host).
 * Le richieste senza Origin (curl, test, Stremio, tooling) passano.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return true
  let originHost: string
  try {
    originHost = new URL(origin).hostname.toLowerCase()
  } catch {
    return false
  }
  // Preferenza: X-Forwarded-Host (reverse proxy) → Host → hostname dell'URL
  // della richiesta (fallback: NextRequest può non popolare l'header Host).
  const host =
    hostnameOf(request.headers.get("x-forwarded-host")) ||
    hostnameOf(request.headers.get("host")) ||
    hostnameOf(new URL(request.url).hostname)
  if (!host) return true
  return originHost === host
}

export function originMismatchResponse(): Response {
  return new Response(JSON.stringify({ error: "Cross-origin request rejected" }), {
    status: 403,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  })
}
