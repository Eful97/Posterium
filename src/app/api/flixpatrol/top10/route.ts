import { NextRequest } from "next/server"
import { getTop10, getSupportedPlatforms } from "@/lib/flixpatrol"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const platform = req.nextUrl.searchParams.get("platform") || "netflix"
  const country = req.nextUrl.searchParams.get("country") || "italy"
  const valid = getSupportedPlatforms().find((p) => p.slug === platform)
  if (!valid) {
    return Response.json({ error: `Unknown platform: ${platform}` }, { status: 400 })
  }
  try {
    const data = await getTop10(platform, country, apiKey)
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=300, s-maxage=1800" } })
  } catch (err) {
    console.error("FlixPatrol top10 error:", err)
    return Response.json({ error: "Failed to fetch FlixPatrol data" }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }
}
