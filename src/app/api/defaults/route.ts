import { NextRequest } from "next/server"
import { getServerDefaults, setServerDefaults } from "@/lib/server-defaults"
import { cacheInvalidate } from "@/lib/cache"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { z } from "zod"

const defaultsSchema = z.object({
  badgeStyle: z.string().optional(),
  rankingBadgeStyle: z.string().optional(),
  blurEnabled: z.boolean().optional(),
  blurIntensity: z.number().optional(),
  blurFade: z.number().optional(),
  blurDarkness: z.number().optional(),
  gradientHeight: z.number().optional(),
  globalBadges: z.boolean().optional(),
  rankingBadges: z.boolean().optional(),
  autoRotateClean: z.boolean().optional(),
  defaultLogoFitEnabled: z.boolean().optional(),
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
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}
