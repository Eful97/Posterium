import dns, { type LookupOptions } from "node:dns"
import { Agent } from "undici"
import { NextRequest } from "next/server"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { rewriteMetasPosters, rewriteSingleMetaPoster, type StremioItemMeta } from "@/lib/addon-proxy"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"

const log = createLogger("addon-proxy")

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024

class ProxyBodyTooLargeError extends Error {}

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
 * Lookup DNS personalizzato per l'Agent undici: risolve il hostname e restituisce
 * SOLO gli indirizzi pubblici. Chiude il TOCTOU di resolveAndCheckBlocked: la
 * connessione avviene esattamente sugli IP verificati, senza finestra di
 * DNS-rebinding tra check e fetch. Se nessun indirizzo è pubblico → errore.
 */
function safeLookup(hostname: string, options: LookupOptions, callback: (err: NodeJS.ErrnoException | null, address: dns.LookupAddress[] | string, family?: number) => void) {
  dns.promises
    .lookup(hostname, { family: 0, all: true })
    .then((addresses) => {
      const safe = addresses.filter((a) => !isPrivateIp(a.address))
      if (safe.length === 0) {
        callback(new Error(`Blocked SSRF: no public IP for ${hostname}`), [])
        return
      }
      if (options.all) {
        callback(null, safe)
      } else {
        callback(null, safe[0].address, safe[0].family)
      }
    })
    .catch((err: NodeJS.ErrnoException) => callback(err, []))
}

/** Agent undici con lookup vincolato agli IP pubblici (DNS pin). */
const SAFE_AGENT = new Agent({ connect: { lookup: safeLookup } })

/** Allowlist opzionale di domini proxy (POSTERIUM_PROXY_ALLOW_DOMAINS). */
function isAllowedByAllowlist(url: URL): boolean {
  const raw = process.env.POSTERIUM_PROXY_ALLOW_DOMAINS
  if (!raw) return true
  const domains = raw.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean)
  if (domains.length === 0) return true
  const host = url.hostname.toLowerCase()
  return domains.some((d) => host === d || host.endsWith(`.${d}`))
}

/** Legge il body JSON applicando un cap sulla dimensione (anti-mem-exhaustion). */
async function readJsonCapped(res: Response): Promise<unknown> {
  const declared = res.headers.get("content-length")
  if (declared && Number(declared) > MAX_RESPONSE_BYTES) {
    throw new ProxyBodyTooLargeError(`Response exceeds ${MAX_RESPONSE_BYTES} bytes`)
  }
  if (!res.body) return res.json()
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {})
      throw new ProxyBodyTooLargeError(`Response exceeds ${MAX_RESPONSE_BYTES} bytes`)
    }
    chunks.push(value)
  }
  const buf = Buffer.concat(chunks)
  return JSON.parse(buf.toString("utf-8"))
}

/**
 * Esegue un fetch con redirect manuali, validando ogni destinazione.
 * Previene SSRF via redirect 302 verso IP privati. Il DNS pin (SAFE_AGENT)
 * garantisce che ogni connessione usi solo indirizzi pubblici verificati.
 */
async function safeFetch(url: string, options: RequestInit & { signal: AbortSignal }): Promise<Response> {
  let currentUrl = url
  let redirectCount = 0
  const MAX_REDIRECTS = 5
  while (redirectCount <= MAX_REDIRECTS) {
    if (!isAllowedByAllowlist(new URL(currentUrl))) {
      log.warn("Blocked by proxy allowlist", { target: currentUrl })
      return Response.json({ error: "Target domain not allowed" }, { status: 403, headers: corsHeaders() })
    }
    // La fetch globale di Node (undici) accetta `dispatcher`; il lib DOM di
    // Next non lo tipizza, quindi il cast è necessario. Il dispatcher SAFE_AGENT
    // vincola la connessione agli IP pubblici verificati (DNS pin).
    const fetchOpts = { ...options, redirect: "manual", dispatcher: SAFE_AGENT } as unknown as RequestInit
    const res = await fetch(currentUrl, fetchOpts)
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
      const origManifest = (await readJsonCapped(manifestRes)) as Record<string, unknown>
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
      if (e instanceof ProxyBodyTooLargeError) {
        return Response.json({ error: "Target manifest too large" }, { status: 413, headers: corsHeaders() })
      }
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

    const data = (await readJsonCapped(res)) as Record<string, unknown> & { metas?: StremioItemMeta[]; meta?: StremioItemMeta }

    if (data && Array.isArray(data.metas)) {
      data.metas = rewriteMetasPosters(data.metas as StremioItemMeta[], origin, userUuid)
    } else if (data && data.meta) {
      data.meta = rewriteSingleMetaPoster(data.meta as StremioItemMeta, origin, userUuid)
    }

    return Response.json(data, { headers: corsHeaders() })
  } catch (e) {
    log.error("Resource proxy error", { error: e instanceof Error ? e.message : String(e) })
    if (e instanceof ProxyBodyTooLargeError) {
      return Response.json({ error: "Proxy resource too large" }, { status: 413, headers: corsHeaders() })
    }
    return Response.json({ error: "Proxy resource error" }, { status: 500, headers: corsHeaders() })
  }
}
