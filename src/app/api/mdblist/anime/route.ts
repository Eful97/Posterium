import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { createLogger } from "@/lib/logger"
import { fetchMDBList } from "@/lib/mdblist"
import { getDetails } from "@/lib/tmdb"
import { resolveImdbToTmdb } from "@/lib/imdb-resolver"

const log = createLogger("mdblist-anime")

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  // Suffisso :enriched: il rank anime della route poster usa la cache interna
  // keyed di fetchMDBList ("mdblist:list:mdblistAnime:*") con shape diversa
  // (entry grezze con campo tmdb) — con la stessa chiave le due route si
  // sovrascrivevano a vicenda dati incompatibili.
  const cacheKey = "mdblist:anime:top10:enriched"

  interface EnrichedAnimeItem {
    id: number
    title: string
    poster_path: string
    rank: number
    media_type: string
  }

  const cached = cacheGet<EnrichedAnimeItem[]>(cacheKey)
  if (cached) return Response.json(cached)

  const mdblistKey = req.nextUrl.searchParams.get("mdblist_key") || ""
  const tmdbKey = req.nextUrl.searchParams.get("api_key") || undefined
  if (!mdblistKey || !tmdbKey) return Response.json([])

  try {
    // Finding 7: fetchMDBList usa MDBLIST_API_URL (override mock E2E), la cache
    // con hash della key e il timeout condiviso — niente fetch hardcodato.
    const entries = await fetchMDBList("mdblistAnime", mdblistKey)

    const results = await Promise.all(
      entries.slice(0, 20).map(async (entry, idx): Promise<EnrichedAnimeItem | null> => {
        // Try TMDB ID first (fetchMDBList espone già il campo tmdb)
        let tmdbId = entry.tmdb
        // Fallback: find by IMDB ID — resolveImdbToTmdb usa TMDB_BASE_URL
        // (override mock E2E) e la cache condivisa (finding 14).
        if (!tmdbId && entry.imdb) {
          tmdbId = (await resolveImdbToTmdb(entry.imdb, "tv", tmdbKey)) ?? undefined
        }
        if (!tmdbId) return null
        try {
          // getDetails usa la lib @/lib/tmdb: TMDB_BASE_URL, cache 5min, inflight
          // coalescing e rate limit condivisi (finding 7).
          const found = await getDetails("tv", tmdbId, "it-IT", tmdbKey)
          return {
            id: tmdbId,
            title: found.name || found.title || entry.title || "",
            poster_path: found.poster_path || "",
            rank: idx + 1,
            media_type: "tv",
          }
        } catch (e) {
          log.error("TMDB lookup failed", { error: e instanceof Error ? e.message : String(e) })
          return null
        }
      }),
    )

    const filtered = results.filter((r): r is EnrichedAnimeItem => r !== null)
    if (filtered.length > 0) cacheSet(cacheKey, filtered, ["mdblist"])
    return Response.json(filtered)
  } catch (e) {
    log.error("Fetch failed", { error: e instanceof Error ? e.message : String(e) })
    return Response.json([])
  }
}
