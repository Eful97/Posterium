import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"

const log = createLogger("validate-key")

export async function POST(req: NextRequest): Promise<Response> {
  const rl = await rateLimit(rateLimitKey(req), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  let body: { provider?: string; key?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ valid: false, message: "Invalid JSON body" }, { status: 400 })
  }

  const { provider, key } = body
  const cleanKey = (key || "").trim()

  if (!cleanKey) {
    return Response.json({ valid: false, message: "Missing key" }, { status: 400 })
  }

  if (provider === "tmdb") {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/authentication?api_key=${encodeURIComponent(cleanKey)}`, {
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success === true) {
          return Response.json({ valid: true })
        }
      }
      return Response.json({ valid: false, message: "Chiave TMDB non valida" })
    } catch (e) {
      log.warn("TMDB key validation failed", { error: e instanceof Error ? e.message : String(e) })
      return Response.json({ valid: false, message: "Errore di connessione a TMDB" }, { status: 502 })
    }
  }

  if (provider === "mdblist") {
    try {
      const res = await fetch(`https://mdblist.com/api/?apikey=${encodeURIComponent(cleanKey)}&i=tt0111161`, {
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.response !== false && !data.error) {
          return Response.json({ valid: true })
        }
      }
      return Response.json({ valid: false, message: "Chiave MDBList non valida" })
    } catch (e) {
      log.warn("MDBList key validation failed", { error: e instanceof Error ? e.message : String(e) })
      return Response.json({ valid: false, message: "Errore di connessione a MDBList" }, { status: 502 })
    }
  }

  if (provider === "tvdb") {
    try {
      const res = await fetch("https://api4.thetvdb.com/v4/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: cleanKey }),
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.data?.token) {
          return Response.json({ valid: true })
        }
      }
      return Response.json({ valid: false, message: "Chiave TVDB non valida" })
    } catch (e) {
      log.warn("TVDB key validation failed", { error: e instanceof Error ? e.message : String(e) })
      return Response.json({ valid: false, message: "Errore di connessione a TheTVDB" }, { status: 502 })
    }
  }

  return Response.json({ valid: false, message: "Unknown provider" }, { status: 400 })
}
