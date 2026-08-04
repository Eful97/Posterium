import { NextRequest } from "next/server"
import { importMappings } from "@/lib/store"
import { mappingSchema } from "@/lib/validation"
import { checkAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

const MAX_BODY_BYTES = 100_000
const MAX_MAPPINGS = 1000

export async function POST(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()

  // Cap sulla dimensione del body: l'import è un'operazione in blocco e un
  // body enorme può saturare memoria + disco.
  const contentLength = Number(req.headers.get("content-length") || "0")
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 })
  }

  const body = await req.json()
  let raw = Array.isArray(body) ? body : body.mappings
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    raw = Object.values(raw)
  }
  if (!Array.isArray(raw)) {
    return Response.json({ error: "mappings array required" }, { status: 400 })
  }
  if (raw.length > MAX_MAPPINGS) {
    return Response.json({ error: `Too many mappings (max ${MAX_MAPPINGS})` }, { status: 413 })
  }
  const valid: typeof raw = []
  const errors: Record<number, unknown> = {}
  raw.forEach((item: unknown, i: number) => {
    const parsed = mappingSchema.safeParse(item)
    if (parsed.success) {
      valid.push(item)
    } else {
      errors[i] = parsed.error.flatten()
    }
  })
  if (valid.length === 0) {
    return Response.json({ error: "No valid mappings found", details: errors }, { status: 400 })
  }
  await importMappings(valid)
  return Response.json({ ok: true, count: valid.length, errors: Object.keys(errors).length > 0 ? errors : undefined })
}
