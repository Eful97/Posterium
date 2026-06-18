import { NextRequest } from "next/server"
import { getAll, upsert, removeAll } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheInvalidate } from "@/lib/cache"
import { mappingSchema } from "@/lib/validation"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const mappings = await getAll()
  return Response.json({ mappings })
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
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
    backdropPath: parsed.data.backdropPath ?? null,
    updatedAt: new Date().toISOString(),
  })
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  await removeAll()
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}
