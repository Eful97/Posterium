import { NextRequest } from "next/server"
import { getServerDefaults, setServerDefaults } from "@/lib/server-defaults"
import { cacheInvalidatePosterData } from "@/lib/cache"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"
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
  autoRotateClean: z.boolean().optional(),
  defaultLogoFitEnabled: z.boolean().optional(),
  networkLogo: z.boolean().optional(),
  ribbonSide: z.enum(["left", "right"]).optional(),
})

export async function GET() {
  return Response.json(getServerDefaults())
}

export async function PUT(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "defaults")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
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
    setServerDefaults(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: `Failed to save: ${message}` }, { status: 500 })
  }
  cacheInvalidatePosterData()
  // Warm catalog cache — ricostruisci cataloghi principali in background.
  // Usa l'origin della richiesta (host pubblico) invece di 127.0.0.1 che su
  // runtime serverless non esiste e renderebbe il self-fetch un timeout sicuro.
  const internalOrigin = new URL(req.url).origin
  for (const catalog of getWarmupCatalogs()) {
    const catalogUrl = `${internalOrigin}/catalog/${catalog.type}/${catalog.id}.json`
    void fetch(catalogUrl, { signal: AbortSignal.timeout(15000) }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      log.warn(`Catalog warmup failed for ${catalog.id}`, { error: message })
    })
  }
  return Response.json({ ok: true })
}
