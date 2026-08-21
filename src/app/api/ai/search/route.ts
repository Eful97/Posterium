import { NextRequest } from "next/server"
import { searchAi } from "@/lib/groq"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { jsonGzip } from "@/lib/json-response"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "search")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const rawQuery = req.nextUrl.searchParams.get("q")
  const query = rawQuery ? rawQuery.trim().slice(0, 300) : null
  const language = req.nextUrl.searchParams.get("language") || "it-IT"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const acceptEncoding = req.headers.get("accept-encoding")

  if (!query || query.length < 2) {
    return jsonGzip(
      { results: [], explanation: "", query: "", model: "", total_results: 0 },
      200,
      undefined,
      acceptEncoding
    )
  }

  try {
    const data = await searchAi(query, language, apiKey)
    const body = {
      results: data.results,
      total_results: data.results.length,
      explanation: data.explanation,
      query: data.query,
      model: data.model,
      error: data.error,
    }
    return jsonGzip(
      body,
      200,
      { "Cache-Control": "public, max-age=300, s-maxage=1800" },
      acceptEncoding
    )
  } catch {
    return jsonGzip(
      { results: [], total_results: 0, explanation: "", query, model: "", error: "server_error" },
      200,
      { "Cache-Control": "no-store" },
      acceptEncoding
    )
  }
}
