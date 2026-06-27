import { NextRequest } from "next/server"
import { getServerDefaults, setServerDefaults } from "@/lib/server-defaults"
import { cacheInvalidate } from "@/lib/cache"

export async function GET() {
  return Response.json(getServerDefaults())
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  setServerDefaults(body)
  cacheInvalidate("poster")
  return Response.json({ ok: true })
}
