import { NextRequest } from "next/server"
import { getAll, upsert, removeAll } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheInvalidate } from "@/lib/cache"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const mappings = getAll()
  return Response.json({ mappings })
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const body = await req.json()
  if (!body || typeof body !== "object" || !body.tmdbId || !body.mediaType || !body.posterPath) {
    return Response.json({ error: "Missing required fields: tmdbId, mediaType, posterPath" }, { status: 400 })
  }
  upsert({
    tmdbId: Number(body.tmdbId),
    mediaType: body.mediaType,
    title: String(body.title || ""),
    posterPath: String(body.posterPath),
    logoPath: body.logoPath ?? null,
    originalPosterPath: body.originalPosterPath ?? null,
    language: body.language ?? null,
    logoScale: body.logoScale ?? undefined,
    logoOffsetX: body.logoOffsetX ?? undefined,
    logoOffsetY: body.logoOffsetY ?? undefined,
    showBadges: body.showBadges ?? undefined,
    genreName: body.genreName ?? null,
    voteAverage: body.voteAverage ?? null,
    trendRank: body.trendRank ?? undefined,
    trendPeriod: body.trendPeriod ?? undefined,
    updatedAt: new Date().toISOString(),
  })
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  removeAll()
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}
