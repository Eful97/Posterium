import { NextRequest } from "next/server"
import { importMappings } from "@/lib/store"
import { mappingSchema } from "@/lib/validation"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"

export async function POST(req: NextRequest) {
  if (!checkAdminToken(req)) return adminAuthResponse()
  const body = await req.json()
  const raw = Array.isArray(body) ? body : body.mappings
  if (!Array.isArray(raw)) {
    return Response.json({ error: "mappings array required" }, { status: 400 })
  }
  const valid: typeof raw = []
  const skipped: number[] = []
  raw.forEach((item: unknown, i: number) => {
    const parsed = mappingSchema.safeParse(item)
    if (parsed.success) {
      valid.push(item)
    } else {
      skipped.push(i)
    }
  })
  if (valid.length === 0) {
    return Response.json({ error: "No valid mappings found", skipped }, { status: 400 })
  }
  await importMappings(valid)
  return Response.json({ ok: true, count: valid.length, skipped: skipped.length > 0 ? skipped : undefined })
}
