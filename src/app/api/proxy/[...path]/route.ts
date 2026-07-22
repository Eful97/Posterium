import { NextRequest } from "next/server"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { rewriteMetasPosters, rewriteSingleMetaPoster, type StremioItemMeta } from "@/lib/addon-proxy"

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache, max-age=0, must-revalidate",
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const origin = getOriginFromRequest(req)
  const searchParams = req.nextUrl.searchParams
  const rawTargetUrl = searchParams.get("target") || searchParams.get("url")

  if (!rawTargetUrl) {
    return Response.json({ error: "Missing target URL parameter (?url= or ?target=)" }, { status: 400, headers: corsHeaders() })
  }

  let targetUrl = rawTargetUrl.trim()
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = `https://${targetUrl}`
  }

  const firstPath = path[0] || ""

  // 1. Manifest Proxy
  if (firstPath === "manifest" || targetUrl.endsWith("manifest.json")) {
    try {
      const manifestRes = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) })
      if (!manifestRes.ok) {
        return Response.json({ error: `Failed to fetch target manifest: ${manifestRes.statusText}` }, { status: manifestRes.status, headers: corsHeaders() })
      }
      const origManifest = await manifestRes.json()
      const baseUrl = targetUrl.replace(/\/manifest\.json$/, "").replace(/\/$/, "")

      const proxiedManifest = {
        ...origManifest,
        id: `org.posterium.proxy.${Buffer.from(baseUrl).toString("base64url").slice(0, 16)}`,
        name: `${origManifest.name || "Addon"} (Posterium)`,
        description: `${origManifest.description || ""} — Poster personalizzati via Posterium`.trim(),
        logo: origManifest.logo || `${origin}/App.png`,
      }

      return Response.json(proxiedManifest, { headers: corsHeaders() })
    } catch (e) {
      console.error("[addon-proxy] Manifest proxy error:", e)
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
      data.metas = rewriteMetasPosters(data.metas as StremioItemMeta[], origin)
    } else if (data && data.meta) {
      data.meta = rewriteSingleMetaPoster(data.meta as StremioItemMeta, origin)
    }

    return Response.json(data, { headers: corsHeaders() })
  } catch (e) {
    console.error("[addon-proxy] Resource proxy error:", e)
    return Response.json({ error: "Proxy resource error" }, { status: 500, headers: corsHeaders() })
  }
}
