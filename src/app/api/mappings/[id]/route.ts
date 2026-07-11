import { NextRequest } from "next/server"
import { getById, remove, upsert } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheInvalidate } from "@/lib/cache"
import { mappingUpdateSchema } from "@/lib/validation"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"

type RouteParams = { id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  const mapping = await getById(type as "movie" | "tv", tmdbId)
  if (!mapping) return Response.json({ error: "not found" }, { status: 404 })
  return Response.json(mapping)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  if (!tmdbId || !type || (type !== "movie" && type !== "tv")) {
    return Response.json({ error: "Invalid id format" }, { status: 400 })
  }
  const [body, existing] = await Promise.all([
    req.json(),
    getById(type as "movie" | "tv", tmdbId),
  ])
  const parsed = mappingUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }
  if (!existing) return Response.json({ error: "not found" }, { status: 404 })
  await upsert({
    ...existing,
    ...parsed.data,
    logoPath: parsed.data.logoPath ?? existing.logoPath,
    originalPosterPath: parsed.data.originalPosterPath ?? existing.originalPosterPath,
    language: parsed.data.language ?? existing.language,
    genreName: parsed.data.genreName ?? existing.genreName,
    voteAverage: parsed.data.voteAverage ?? existing.voteAverage,
    trendRank: parsed.data.trendRank ?? existing.trendRank,
    trendPeriod: parsed.data.trendPeriod ?? existing.trendPeriod,
    tvType: parsed.data.tvType ?? existing.tvType,
    tvStatus: parsed.data.tvStatus ?? existing.tvStatus,
    accentColor: parsed.data.accentColor ?? existing.accentColor,
    badgeExtra: parsed.data.badgeExtra ?? existing.badgeExtra,
    badgeRank: parsed.data.badgeRank ?? existing.badgeRank,
    badgeLabel: parsed.data.badgeLabel ?? existing.badgeLabel,
    customBadge: parsed.data.customBadge ?? existing.customBadge,
    releaseDate: parsed.data.releaseDate ?? existing.releaseDate,
    firstAirDate: parsed.data.firstAirDate ?? existing.firstAirDate,
    backdropPath: parsed.data.backdropPath ?? existing.backdropPath,
    logoDisabled: parsed.data.logoDisabled ?? existing.logoDisabled,
    tmdbId: existing.tmdbId,
    mediaType: existing.mediaType,
    updatedAt: new Date().toISOString(),
  })
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  await remove(type as "movie" | "tv", tmdbId)
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}
