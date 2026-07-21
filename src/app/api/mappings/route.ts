import { NextRequest } from "next/server"
import { getAll, getById, upsert, removeAll } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheInvalidatePosterData } from "@/lib/cache"
import { mappingSchema } from "@/lib/validation"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"
import { getWarmupCatalogs } from "@/lib/catalog-definitions"
import { getServerDefaults } from "@/lib/server-defaults"
import { buildStremioPosterUrl } from "@/lib/stremio-poster-url"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const mappings = await getAll()
  return Response.json({ mappings })
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  const body = await req.json()
  const parsed = mappingSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }
  await upsert({
    ...parsed.data,
    logoPath: parsed.data.logoPath ?? null,
    originalPosterPath: parsed.data.originalPosterPath ?? null,
    language: parsed.data.language ?? null,
    genreName: parsed.data.genreName ?? undefined,
    voteAverage: parsed.data.voteAverage ?? undefined,
    trendRank: parsed.data.trendRank ?? undefined,
    trendPeriod: parsed.data.trendPeriod ?? undefined,
    tvType: parsed.data.tvType ?? undefined,
    tvStatus: parsed.data.tvStatus ?? undefined,
    accentColor: parsed.data.accentColor ?? undefined,
    badgeExtra: parsed.data.badgeExtra ?? undefined,
    badgeRank: parsed.data.badgeRank ?? undefined,
    badgeLabel: parsed.data.badgeLabel ?? undefined,
    customBadge: parsed.data.customBadge ?? undefined,
    releaseDate: parsed.data.releaseDate ?? undefined,
    firstAirDate: parsed.data.firstAirDate ?? undefined,
    backdropPath: parsed.data.backdropPath ?? null,
    logoDisabled: parsed.data.logoDisabled ?? undefined,
    updatedAt: new Date().toISOString(),
  })
  cacheInvalidatePosterData()
  // Warm poster cache — impopola cache TMDB + poster prima che Stremio/utenti richiedano
  const internalOrigin = `http://127.0.0.1:${process.env.PORT || "3000"}`
  void (async () => {
    const savedMapping = await getById(parsed.data.mediaType, parsed.data.tmdbId)
    const warmUrl = buildStremioPosterUrl({
      origin: internalOrigin,
      type: parsed.data.mediaType === "tv" ? "series" : "movie",
      id: parsed.data.tmdbId,
      defaults: getServerDefaults(),
      mapping: savedMapping,
      apiKey: process.env.TMDB_API_KEY,
      lang: parsed.data.language || "it",
    })
    await fetch(warmUrl, { signal: AbortSignal.timeout(25000) })
  })().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[mappings] Poster warmup failed: ${message}`)
  })
  // Warm catalog cache — ricostruisci cataloghi principali in background
  for (const catalog of getWarmupCatalogs()) {
    const catalogUrl = `${internalOrigin}/catalog/${catalog.type}/${catalog.id}.json`
    void fetch(catalogUrl, { signal: AbortSignal.timeout(15000) }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[mappings] Catalog warmup failed for ${catalog.id}: ${message}`)
    })
  }
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  await removeAll()
  cacheInvalidatePosterData()
  return Response.json({ ok: true })
}
