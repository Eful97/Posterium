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
function isBlockedTarget(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1") return true
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true
    if (hostname.startsWith("10.")) return true
    if (hostname.startsWith("192.168.")) return true
    // Blocca solo 172.16.0.0/12 (non tutto 172.x.x.x)
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true
    if (parsed.port && Number(parsed.port) < 1024) return true
    return false
  } catch {
    return true
  }
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

  if (isBlockedTarget(targetUrl)) {
    log.warn("Blocked SSRF attempt", { target: targetUrl })
    return Response.json({ error: "Invalid target URL" }, { status: 400, headers: corsHeaders() })
  }

  const firstPath = path[0] || ""

  // 1. Manifest Proxy
  if (firstPath === "manifest") {
    try {
      const manifestRes = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) })
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
    const res = await fetch(fullTargetUrl, { signal: AbortSignal.timeout(12000) })
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
