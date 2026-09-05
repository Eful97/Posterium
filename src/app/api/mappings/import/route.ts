import { NextRequest } from "next/server"
import { importMappings } from "@/lib/store"
import type { Mapping } from "@/lib/types"
import { mappingSchema } from "@/lib/validation"
import { checkAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { readJsonBody, BodyTooLargeError, InvalidJsonBodyError } from "@/lib/read-body"
import { cacheInvalidatePosterData } from "@/lib/cache"
import { bumpCatalogEpoch } from "@/lib/catalog-epoch"

// Il body cap deve stare sopra al massimo payload legittimo: MAX_MAPPINGS
// mapping completi (decine di campi ciascuno) possono pesare centinaia di KB,
// quindi 100KB li rifiuterebbe a priori. 1MB lascia spazio a 1000 mapping pieni
// mantenendo un limite di memoria rigoroso per body anomali.
const MAX_BODY_BYTES = 1_000_000
const MAX_MAPPINGS = 1000

export async function POST(req: NextRequest) {
  const rl = await rateLimit(rateLimitKey(req), "mappings")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()

  // Cap sulla dimensione del body: l'import è un'operazione in blocco e un
  // body enorme può saturare memoria + disco. Il check content-length è un
  // fast-path; readJsonBody applica il cap reale anche in chunked encoding.
  const contentLength = Number(req.headers.get("content-length") || "0")
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 })
  }

  let body: unknown
  try {
    body = await readJsonBody(req, MAX_BODY_BYTES)
  } catch (e) {
    if (e instanceof BodyTooLargeError) return Response.json({ error: "Request body too large" }, { status: 413 })
    if (e instanceof InvalidJsonBodyError) return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    throw e
  }
  let raw = Array.isArray(body) ? body : (body as { mappings?: unknown } | null)?.mappings
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    raw = Object.values(raw)
  }
  if (!Array.isArray(raw)) {
    return Response.json({ error: "mappings array required" }, { status: 400 })
  }
  if (raw.length > MAX_MAPPINGS) {
    return Response.json({ error: `Too many mappings (max ${MAX_MAPPINGS})` }, { status: 413 })
  }
  const valid: Mapping[] = []
  const errors: Record<number, unknown> = {}
  raw.forEach((item: unknown, i: number) => {
    const parsed = mappingSchema.safeParse(item)
    if (parsed.success) {
      valid.push({
        ...parsed.data,
        updatedAt: (parsed.data as { updatedAt?: string }).updatedAt || new Date().toISOString(),
      } as Mapping)
    } else {
      errors[i] = parsed.error.flatten()
    }
  })
  if (valid.length === 0) {
    return Response.json({ error: "No valid mappings found", details: errors }, { status: 400 })
  }
  await importMappings(valid)
  // L'import è un'operazione bulk che può toccare migliaia di mapping: invalida
  // tutta la cache poster/badge/catalog/stremio (come DELETE wipe-all). I cache
  // key dei poster includono updatedAt, quindi con la nuova timbratura i vecchi
  // entry non vengono più serviti comunque — questa invalidazione li libera
  // subito invece di lasciarli scadere col TTL.
  cacheInvalidatePosterData()
  await bumpCatalogEpoch()
  return Response.json({ ok: true, count: valid.length, errors: Object.keys(errors).length > 0 ? errors : undefined })
}
