import dns from "node:dns"
import { NextRequest } from "next/server"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { rewriteMetasPosters, rewriteSingleMetaPoster, type StremioItemMeta } from "@/lib/addon-proxy"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"

const log = createLogger("addon-proxy")

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache, max-age=0, must-revalidate",
  }
}

/** Blocca richieste a IP privati / localhost per prevenire SSRF */
function isPrivateHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    /^127\./.test(hostname) ||               // tutto loopback 127.0.0.0/8
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::]" ||
    hostname === "::" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.startsWith("10.") ||             // RFC 1918 10.0.0.0/8
    hostname.startsWith("192.168.") ||        // RFC 1918 192.168.0.0/16
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||  // RFC 1918 172.16.0.0/12
    /^169\.254\./.test(hostname) ||           // link-local
    // IPv6 link-local / ULA / unspecified / loopback letterali
    hostname.startsWith("fc") || hostname.startsWith("fd") ||  // fc00::/7 ULA
    hostname.startsWith("fe8") || hostname.startsWith("fe9") || hostname.startsWith("fea") || hostname.startsWith("feb") || // fe80::/10 link-local
    hostname.startsWith("[fc") || hostname.startsWith("[fd") ||
    hostname.startsWith("[fe8") || hostname.startsWith("[fe9") || hostname.startsWith("[fea") || hostname.startsWith("[feb") ||
    hostname.startsWith("[::1") ||
    hostname.startsWith("::ffff:")            // IPv4-mapped IPv6 (:::ffff:a.b.c.d)
  )
}

/** Verifica se un indirizzo IP risolto (IPv4 o IPv6) è privato/non routabile. */
function isPrivateIp(address: string): boolean {
  const lower = address.toLowerCase()
  if (lower === "::1" || lower === "::" || lower === "[::1]" || lower === "[::]") return true
  if (lower.startsWith("::ffff:") || lower.startsWith("0:0:0:0:0:ffff:")) {
    // IPv4-mapped IPv6: estrai il quad e valutalo come IPv4
    const v4 = lower.split(":").pop() || ""
    if (isPrivateHost(v4)) return true
    return /^127\./.test(v4) || v4 === "0.0.0.0"
  }
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true // ULA fc00::/7
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true // link-local
  if (isPrivateHost(lower)) return true
  return false
}


/**
 * Risolve un hostname a IP (entrambe le famiglie) e verifica che nessuno sia privato.
 * Protegge da:
 * - DNS rebinding (il controllo viene fatto dopo la risoluzione DNS)
 * - IP alternativi (decimali, hex, IPv4-mapped IPv6)
 * - Hostname locali
 * - IPv6 (fetch/undici usa Happy Eyeballs: può connettersi via AAAA anche se il check
 *   considera solo A — quindi dobbiamo bloccare se QUALSIASI indirizzo risolto è privato)
 */
async function resolveAndCheckBlocked(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    // Controllo rapido su hostname prima di risolvere
    if (isPrivateHost(hostname)) return true
    // Risolvi a IP per prevenire bypass con rappresentazioni alternative.
    // family 0 + all: tutte le family, tutti gli IP. Blocca se uno qualsiasi è privato.
    const addresses = await dns.promises.lookup(hostname, { family: 0, all: true })
    for (const entry of addresses) {
      if (isPrivateIp(entry.address)) return true
    }
    return false
  } catch {
    return true // in caso di errore DNS, blocca per sicurezza
  }
}

/**
 * Esegue un fetch con redirect manuali, validando ogni destinazione.
 * Previene SSRF via redirect 302 verso IP privati.
 */
async function safeFetch(url: string, options: RequestInit & { signal: AbortSignal }): Promise<Response> {
  let currentUrl = url
  let redirectCount = 0
  const MAX_REDIRECTS = 5
  while (redirectCount <= MAX_REDIRECTS) {
    const res = await fetch(currentUrl, { ...options, redirect: "manual" })
    if (res.status < 300 || res.status >= 400) return res
    // Redirect — validiamo la destinazione
    const location = res.headers.get("location")
    if (!location) return res
    const targetUrl = new URL(location, currentUrl).href
    if (await resolveAndCheckBlocked(targetUrl)) {
      log.warn("Blocked SSRF redirect", { from: currentUrl, to: targetUrl })
      return new Response(JSON.stringify({ error: "Redirect to blocked target" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      })
    }
    currentUrl = targetUrl
    redirectCount++
  }
  return new Response(JSON.stringify({ error: "Too many redirects" }), {
    status: 400,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const rl = rateLimit(rateLimitKey(req), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { path } = await params
  const origin = getOriginFromRequest(req)
  const searchParams = req.nextUrl.searchParams
  const rawTargetUrl = searchParams.get("target") || searchParams.get("url")
  const userUuid = searchParams.get("u") || searchParams.get("user") || null

  if (!rawTargetUrl) {
    return Response.json({ error: "Missing target URL parameter (?url= or ?target=)" }, { status: 400, headers: corsHeaders() })
  }

  let targetUrl = rawTargetUrl.trim()
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = `https://${targetUrl}`
  }

  if (await resolveAndCheckBlocked(targetUrl)) {
    log.warn("Blocked SSRF attempt", { target: targetUrl })
    return Response.json({ error: "Invalid target URL" }, { status: 400, headers: corsHeaders() })
  }

  const firstPath = path[0] || ""

  // 1. Manifest Proxy
  if (firstPath === "manifest") {
    try {
      const manifestRes = await safeFetch(targetUrl, { signal: AbortSignal.timeout(10000) })
      if (!manifestRes.ok) {
        return Response.json({ error: `Failed to fetch target manifest: ${manifestRes.statusText}` }, { status: manifestRes.status, headers: corsHeaders() })
      }
      const origManifest = await manifestRes.json()
      const baseUrl = targetUrl.replace(/\/manifest\.json$/, "").replace(/\/$/, "")

      const userSuffix = userUuid ? `.${userUuid.slice(0, 8)}` : ""
      const proxiedManifest = {
        ...origManifest,
        id: `org.posterium.proxy.${Buffer.from(baseUrl).toString("base64url").slice(0, 12)}${userSuffix}`,
        name: `${origManifest.name || "Addon"} (Posterium)`,
        description: `${origManifest.description || ""} — Poster personalizzati via Posterium`.trim(),
        logo: origManifest.logo || `${origin}/App.png`,
      }

      return Response.json(proxiedManifest, { headers: corsHeaders() })
    } catch (e) {
      log.error("Manifest proxy error", { error: e instanceof Error ? e.message : String(e) })
      return Response.json({ error: "Error fetching manifest" }, { status: 500, headers: corsHeaders() })
    }
  }

  // 2. Resource Proxy (catalog, meta, etc.)
  try {
    const subPath = path.join("/")
    const targetBase = targetUrl.replace(/\/manifest\.json$/, "").replace(/\/$/, "")
    const fullTargetUrl = `${targetBase}/${subPath}`
    const res = await safeFetch(fullTargetUrl, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) {
      return Response.json({ error: `Failed to fetch proxy resource: ${res.statusText}` }, { status: res.status, headers: corsHeaders() })
    }

    const data = await res.json()

    if (data && Array.isArray(data.metas)) {
      data.metas = rewriteMetasPosters(data.metas as StremioItemMeta[], origin, userUuid)
    } else if (data && data.meta) {
      data.meta = rewriteSingleMetaPoster(data.meta as StremioItemMeta, origin, userUuid)
    }

    return Response.json(data, { headers: corsHeaders() })
  } catch (e) {
    log.error("Resource proxy error", { error: e instanceof Error ? e.message : String(e) })
    return Response.json({ error: "Proxy resource error" }, { status: 500, headers: corsHeaders() })
  }
}
