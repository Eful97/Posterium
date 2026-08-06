import { NextRequest } from "next/server"
import { getServerDefaults, setServerDefaults, maskKey, isMaskedValue, type ServerDefaults } from "@/lib/server-defaults"
import { cacheInvalidatePosterData } from "@/lib/cache"
import { checkAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { getWarmupCatalogs } from "@/lib/catalog-definitions"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import { BADGE_STYLES, RANKING_BADGE_STYLES } from "@/lib/badge-styles"

const log = createLogger("defaults")

const defaultsSchema = z.object({
  badgeStyle: z.enum(BADGE_STYLES).optional(),
  rankingBadgeStyle: z.enum(RANKING_BADGE_STYLES).optional(),
  blurEnabled: z.boolean().optional(),
  blurIntensity: z.number().optional(),
  blurFade: z.number().optional(),
  blurDarkness: z.number().optional(),
  gradientHeight: z.number().optional(),
  globalBadges: z.boolean().optional(),
  rankingBadges: z.boolean().optional(),
  badgeGenre: z.boolean().optional(),
  badgeYear: z.boolean().optional(),
  badgeRating: z.boolean().optional(),
  autoRotateClean: z.boolean().optional(),
  defaultLogoFitEnabled: z.boolean().optional(),
  networkLogo: z.boolean().optional(),
  ribbonSide: z.enum(["left", "right"]).optional(),
  // Chiavi d'istanza — in GET mai per intero (solo •••• + ultimi 4).
  tmdbApiKey: z.string().max(200).optional(),
  mdblistApiKey: z.string().max(200).optional(),
})

export async function GET() {
  const d = getServerDefaults()
  return Response.json({
    ...d,
    tmdbApiKey: maskKey(d.tmdbApiKey),
    mdblistApiKey: maskKey(d.mdblistApiKey),
  })
}

export async function PUT(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "defaults")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = defaultsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }
  try {
    // Preserva i segreti d'istanza se il client ha rimandato il placeholder
    // mascherato (••••): non sovrascrivere. Inviare "" cancella la chiave;
    // un valore reale la salva.
    const current = getServerDefaults()
    const next: Record<string, unknown> = { ...parsed.data }
    if (isMaskedValue(parsed.data.tmdbApiKey)) {
      delete next.tmdbApiKey
      if (current.tmdbApiKey) next.tmdbApiKey = current.tmdbApiKey
    }
    if (isMaskedValue(parsed.data.mdblistApiKey)) {
      delete next.mdblistApiKey
      if (current.mdblistApiKey) next.mdblistApiKey = current.mdblistApiKey
    }
    setServerDefaults(next as ServerDefaults)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: `Failed to save: ${message}` }, { status: 500 })
  }
  cacheInvalidatePosterData()
  // Warm catalog cache — ricostruisci cataloghi principali in background.
  // Usa un origin interno fisso (127.0.0.1) invece dell'origin derivato dall'
  // header Host della richiesta: quest'ultimo è controllabile dal client
  // (host header injection → SSRF). Su Vercel (serverless) il self-fetch non
  // esiste: lo saltiamo per evitare warning ingannevoli.
  if (!process.env.VERCEL) {
    const internalOrigin = `http://127.0.0.1:${process.env.PORT || "3000"}`
    for (const catalog of getWarmupCatalogs()) {
      const catalogUrl = `${internalOrigin}/catalog/${catalog.type}/${catalog.id}.json`
      void fetch(catalogUrl, { signal: AbortSignal.timeout(15000) }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        log.warn(`Catalog warmup failed for ${catalog.id}`, { error: message })
      })
    }
  }
  return Response.json({ ok: true })
}
