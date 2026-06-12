import { NextRequest } from "next/server"
import { getById, remove, upsert } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheInvalidate } from "@/lib/cache"

type RouteParams = { id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  const mapping = getById(type as "movie" | "tv", tmdbId)
  if (!mapping) return Response.json({ error: "not found" }, { status: 404 })
  return Response.json(mapping)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  if (!tmdbId || !type || (type !== "movie" && type !== "tv")) {
    return Response.json({ error: "Invalid id format" }, { status: 400 })
  }
  const existing = getById(type as "movie" | "tv", tmdbId)
  const body = await req.json()
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 })
  }
  upsert({
    tmdbId,
    mediaType: type as "movie" | "tv",
    title: String(body.title || existing?.title || ""),
    posterPath: body.posterPath ? String(body.posterPath) : existing?.posterPath || "",
    logoPath: body.logoPath ?? null,
    originalPosterPath: body.originalPosterPath ?? null,
    language: body.language ?? null,
    logoScale: body.logoScale ?? existing?.logoScale,
    logoOffsetX: body.logoOffsetX ?? existing?.logoOffsetX,
    logoOffsetY: body.logoOffsetY ?? existing?.logoOffsetY,
    showBadges: body.showBadges ?? existing?.showBadges,
    genreName: body.genreName ?? existing?.genreName ?? null,
    voteAverage: body.voteAverage ?? existing?.voteAverage ?? null,
    trendRank: body.trendRank ?? existing?.trendRank,
    trendPeriod: body.trendPeriod ?? existing?.trendPeriod,
    updatedAt: new Date().toISOString(),
  })
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  remove(type as "movie" | "tv", tmdbId)
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}
