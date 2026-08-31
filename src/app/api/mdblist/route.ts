import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { MDBLISTS, fetchMDBList } from "@/lib/mdblist"
import { createLogger } from "@/lib/logger"

const log = createLogger("mdblist")

export async function GET(req: NextRequest) {
  const rl = await rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const imdbId = req.nextUrl.searchParams.get('imdb')
  if (!imdbId) return Response.json({ match: null })

  const cacheKey = `mdblist:${imdbId}`
  const cached = cacheGet<{ key: string; rank: number } | { noMatch: true }>(cacheKey)
  if (cached !== null) {
    if ("noMatch" in cached) return Response.json({ match: null })
    return Response.json({ match: cached })
  }

  const apiKey = req.nextUrl.searchParams.get('api_key') || ""
  if (!apiKey) return Response.json({ match: null })

  try {
    // Fix L11: si riusa fetchMDBList (cache keyed per chiave, TTL 30min, e
    // rispetta MDBLIST_API_URL dell'override E2E) — prima la route duplicava
    // URL hardcoded (api.mdblist.com) e parsing, rendendo i test E2E non
    // deterministici e la cache del tutto separata.
    // A3: i 3 list fetch partono in parallelo; allSettled: un errore su una
    // lista non blocca le altre; solo se TUTTE falliscono non si cacha il
    // no-match (ritenta al prossimo accesso).
    const settled = await Promise.allSettled(MDBLISTS.map((list) => fetchMDBList(list.key, apiKey)))
    if (settled.every((s) => s.status === "rejected")) {
      // Errore di rete: NON cachare il fallimento, ritenta al prossimo accesso.
      log.error("All list fetches failed")
      return Response.json({ match: null })
    }
    for (let li = 0; li < MDBLISTS.length; li++) {
      const s = settled[li]
      if (s.status !== "fulfilled") continue
      const idx = s.value.findIndex(e => e.imdb === imdbId)
      if (idx >= 0 && idx < 20) {
        const match = { key: MDBLISTS[li].key, rank: idx + 1 }
        cacheSet(cacheKey, match, ["mdblist"])
        return Response.json({ match })
      }
    }
  } catch (e) {
    // Fallback di sicurezza: NON cachare il fallimento.
    log.error("Fetch failed", { error: e instanceof Error ? e.message : String(e) })
    return Response.json({ match: null })
  }
  // No-match: TTL breve — l'item può comparire in classifica a breve.
  cacheSet(cacheKey, { noMatch: true }, ["mdblist"], 60_000)
  return Response.json({ match: null })
}
