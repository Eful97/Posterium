import { NextRequest } from "next/server"
import { getById, remove, upsert } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheInvalidate, cacheInvalidatePosterDataFor } from "@/lib/cache"
import { mappingUpdateSchema } from "@/lib/validation"
import { checkAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { readJsonBody, BodyTooLargeError, DEFAULT_MAX_BODY_BYTES } from "@/lib/read-body"

type RouteParams = { id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = await rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  // Stessa validazione di PUT/DELETE (finding 17): evita chiavi arbitrarie
  // (es. "garbage:NaN") verso lo store.
  if (!tmdbId || !type || (type !== "movie" && type !== "tv")) {
    return Response.json({ error: "Invalid id format" }, { status: 400 })
  }
  const mapping = await getById(type as "movie" | "tv", tmdbId)
  if (!mapping) return Response.json({ error: "not found" }, { status: 404 })
  // Fix L34: header cache esplicito. Nota fail-open: su istanza pubblica senza
  // ADMIN_TOKEN questa GET è aperta (l'editor la usa per il WYSIWYG) — i dati
  // dei mapping non sono segreti (stesso livello dei poster pubblici), ma sono
  // mutabili: no-store evita che browser/CDN servano copie stantie.
  return Response.json(mapping, { headers: { "Cache-Control": "no-store" } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = await rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  if (!tmdbId || !type || (type !== "movie" && type !== "tv")) {
    return Response.json({ error: "Invalid id format" }, { status: 400 })
  }
  const existingPromise = getById(type as "movie" | "tv", tmdbId)
  let body: unknown
  try {
    body = await readJsonBody(req, DEFAULT_MAX_BODY_BYTES)
  } catch (e) {
    if (e instanceof BodyTooLargeError) return Response.json({ error: "Request body too large" }, { status: 413 })
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const existing = await existingPromise
  const parsed = mappingUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }
  if (!existing) return Response.json({ error: "not found" }, { status: 404 })
  const hasField = <K extends keyof typeof parsed.data>(key: K) =>
    Object.prototype.hasOwnProperty.call(parsed.data, key)
  await upsert({
    ...existing,
    ...parsed.data,
    logoPath: hasField("logoPath") ? (parsed.data.logoPath ?? null) : existing.logoPath,
    backdropPath: hasField("backdropPath") ? (parsed.data.backdropPath ?? null) : existing.backdropPath,
    customBadge: hasField("customBadge") ? (parsed.data.customBadge ?? null) : existing.customBadge,
    badgeExtra: hasField("badgeExtra") ? (parsed.data.badgeExtra ?? null) : existing.badgeExtra,
    originalPosterPath: parsed.data.originalPosterPath ?? existing.originalPosterPath,
    language: parsed.data.language ?? existing.language,
    genreName: parsed.data.genreName ?? existing.genreName,
    voteAverage: parsed.data.voteAverage ?? existing.voteAverage,
    trendRank: parsed.data.trendRank ?? existing.trendRank,
    trendPeriod: parsed.data.trendPeriod ?? existing.trendPeriod,
    tvType: parsed.data.tvType ?? existing.tvType,
    tvStatus: parsed.data.tvStatus ?? existing.tvStatus,
    accentColor: parsed.data.accentColor ?? existing.accentColor,
    badgeRank: parsed.data.badgeRank ?? existing.badgeRank,
    badgeLabel: parsed.data.badgeLabel ?? existing.badgeLabel,
    animeRank: hasField("animeRank") ? (parsed.data.animeRank ?? null) : existing.animeRank,
    releaseDate: parsed.data.releaseDate ?? existing.releaseDate,
    firstAirDate: parsed.data.firstAirDate ?? existing.firstAirDate,
    logoDisabled: parsed.data.logoDisabled ?? existing.logoDisabled,
    episodeGroupId: hasField("episodeGroupId") ? (parsed.data.episodeGroupId ?? null) : existing.episodeGroupId,
    tmdbId: existing.tmdbId,
    mediaType: existing.mediaType,
    updatedAt: new Date().toISOString(),
  })
  cacheInvalidatePosterDataFor(type, tmdbId)
  cacheInvalidate("stremio")
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = await rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  const { id } = await params
  const [type, tmdbIdStr] = id.split(":")
  const tmdbId = Number(tmdbIdStr)
  // Stessa validazione del PUT: evita remove() con type/chiavi malformati
  if (!tmdbId || !type || (type !== "movie" && type !== "tv")) {
    return Response.json({ error: "Invalid id format" }, { status: 400 })
  }
  await remove(type as "movie" | "tv", tmdbId)
  cacheInvalidatePosterDataFor(type as "movie" | "tv", tmdbId)
  cacheInvalidate("stremio")
  return Response.json({ ok: true })
}
