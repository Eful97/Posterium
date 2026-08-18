import { NextRequest } from "next/server"
import { getAll, getById, upsert, removeAll } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheInvalidatePosterData, cacheInvalidatePosterDataFor } from "@/lib/cache"
import { mappingSchema } from "@/lib/validation"
import { checkAdminToken, requireAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { getWarmupCatalogs } from "@/lib/catalog-definitions"
import { getServerDefaults } from "@/lib/server-defaults"
import { buildStremioPosterUrl } from "@/lib/stremio-poster-url"
import { resolveRequestApiKey } from "@/lib/tmdb"
import { getFullProfileData, createOrUpdateProfile, verifyProfilePassword } from "@/lib/profile-store"
import { createLogger } from "@/lib/logger"
import { readJsonBody, BodyTooLargeError, DEFAULT_MAX_BODY_BYTES } from "@/lib/read-body"

const log = createLogger("mappings")

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  // Fail-open senza ADMIN_TOKEN (istanza pubblica HF Spaces); fail-closed con token.
  if (!checkAdminToken(req)) return adminAuthResponse()
  const mappings = await getAll()
  return Response.json({ mappings })
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  let body: unknown
  try {
    body = await readJsonBody(req, DEFAULT_MAX_BODY_BYTES)
  } catch (e) {
    if (e instanceof BodyTooLargeError) return Response.json({ error: "Request body too large" }, { status: 413 })
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const parsed = mappingSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }
  const newMapping = {
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
    animeRank: parsed.data.animeRank ?? undefined,
    customBadge: parsed.data.customBadge ?? undefined,
    releaseDate: parsed.data.releaseDate ?? undefined,
    firstAirDate: parsed.data.firstAirDate ?? undefined,
    backdropPath: parsed.data.backdropPath ?? null,
    logoDisabled: parsed.data.logoDisabled ?? undefined,
    updatedAt: new Date().toISOString(),
  }

  await upsert(newMapping)

  // Il mapping si salva anche nel profilo, se la richiesta lo indica (un utente
  // con profilo attivo). profileId sta nel body raw: mappingSchema scarta i campi
  // sconosciuti ma non li rifiuta.
  const rawBody = body as Record<string, unknown>
  const profileId = typeof rawBody.profileId === "string" && rawBody.profileId.length > 0 ? rawBody.profileId : null
  if (profileId) {
    const fullProfile = await getFullProfileData(profileId)
    if (fullProfile) {
      // Fix H7: il write-back nel profilo richiede la password del profilo
      // (o un admin token valido). Prima chiunque conoscesse l'UUID — esposto
      // nelle URL poster pubbliche — poteva sovrascrivere i mapping salvati
      // della vittima su istanze pubbliche. Profilo protetto senza password
      // fornita → 401; password errata → 401. Il mapping globale è già stato
      // salvato sopra: si rifiuta solo la parte profilo.
      const password = typeof rawBody.password === "string" ? rawBody.password : ""
      const adminOverride = requireAdminToken(req)
      if (fullProfile.passwordHash && fullProfile.salt) {
        if (!adminOverride && (!password || !(await verifyProfilePassword(profileId, password)))) {
          return Response.json({ error: "Invalid profile password" }, { status: 401 })
        }
      } else if (!adminOverride) {
        // Profilo legacy senza password: come in /api/profile (finding 1) il
        // write-back da non-admin è rifiutato, altrimenti l'UUID pubblico
        // basta a sovrascrivere i mapping altrui.
        return Response.json({ error: "Profile password required" }, { status: 401 })
      }
      const updatedMappings = {
        ...(fullProfile.mappings || {}),
        [`${newMapping.mediaType}:${newMapping.tmdbId}`]: newMapping,
      }
      await createOrUpdateProfile(
        fullProfile.config,
        profileId,
        undefined,
        fullProfile.apiKeys,
        updatedMappings,
      )
    }
  }

  // Invalidazione mirata al mapping salvato, non globale (i default impattano
  // tutto, un singolo mapping solo il suo poster/badge).
  cacheInvalidatePosterDataFor(parsed.data.mediaType, parsed.data.tmdbId)
  // Warm poster cache — impopola cache TMDB + poster prima che Stremio/utenti richiedano.
  // Guardia VERCEL (fix M11): il self-fetch su 127.0.0.1 non esiste su Vercel
  // serverless; prima il warmup falliva sempre e loggava warning ingannevoli.
  if (!process.env.VERCEL) {
    const internalOrigin = `http://127.0.0.1:${process.env.PORT || "3000"}`
    void (async () => {
      const savedMapping = await getById(parsed.data.mediaType, parsed.data.tmdbId)
      const warmUrl = buildStremioPosterUrl({
        origin: internalOrigin,
        type: parsed.data.mediaType === "tv" ? "series" : "movie",
        id: parsed.data.tmdbId,
        defaults: getServerDefaults(),
        mapping: savedMapping,
        lang: parsed.data.language || "it",
      })
      await fetch(warmUrl, { signal: AbortSignal.timeout(25000) })
    })().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      log.warn("Poster warmup failed", { error: message })
    })
    // Warm catalog cache — ricostruisci cataloghi principali in background.
    // Fix M11: la chiave TMDB della richiesta viene inoltrata — senza, i
    // cataloghi keyed (JW) venivano cacchettati vuoti per 60s sotto la cache
    // key `aknone` che nessuna richiesta reale riusa.
    const requestApiKey = resolveRequestApiKey(req)
    for (const catalog of getWarmupCatalogs()) {
      const keyParam = requestApiKey ? `?api_key=${encodeURIComponent(requestApiKey)}` : ""
      const catalogUrl = `${internalOrigin}/catalog/${catalog.type}/${catalog.id}.json${keyParam}`
      void fetch(catalogUrl, { signal: AbortSignal.timeout(15000) }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        log.warn("Catalog warmup failed", { catalog: catalog.id, error: message })
      })
    }
  }
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  // Wipe-all: richiede SEMPRE admin token, anche su istanze pubbliche senza
  // ADMIN_TOKEN configurato (fail-closed). Nessun client lo invoca.
  if (!requireAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  await removeAll()
  cacheInvalidatePosterData()
  return Response.json({ ok: true })
}
