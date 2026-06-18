import { NextRequest } from "next/server"
import { importMappings } from "@/lib/store"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"

export async function POST(req: NextRequest) {
  if (!checkAdminToken(req)) return adminAuthResponse()
  const body = await req.json()
  // Support both new format { schemaVersion, mappings } and old format { mappings: [...] }
  const mappings = Array.isArray(body) ? body : body.mappings
  if (!Array.isArray(mappings)) {
    return Response.json({ error: "mappings array required" }, { status: 400 })
  }
  await importMappings(mappings)
  return Response.json({ ok: true, count: mappings.length })
}
