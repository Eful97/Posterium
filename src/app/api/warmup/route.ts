import { NextRequest } from "next/server"
import { getTrending } from "@/lib/tmdb"
import { POSTER_URL_VERSION } from "@/lib/render-version"

const WARMUP_TOKEN = process.env.ADMIN_TOKEN || process.env.WARMUP_TOKEN

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "")
  if (WARMUP_TOKEN && auth !== WARMUP_TOKEN) {
    return new Response("Unauthorized", { status: 401 })
  }

  const apiKey = req.nextUrl.searchParams.get("api_key") || process.env.TMDB_API_KEY || undefined

  try {
    // Fetch trending movie + tv IDs
    const [movies, tv] = await Promise.all([
      getTrending("movie", "day", apiKey, 1),
      getTrending("tv", "day", apiKey, 1),
    ])

    const ids: { type: string; id: number }[] = [
      ...movies.results.slice(0, 50).map((r: { id: number }) => ({ type: "movie", id: r.id })),
      ...tv.results.slice(0, 50).map((r: { id: number }) => ({ type: "tv", id: r.id })),
    ]

    const results: { type: string; id: number; status: string }[] = []
    const concurrency = 5

    for (let i = 0; i < ids.length; i += concurrency) {
      const batch = ids.slice(i, i + concurrency)
      const batchResults = await Promise.allSettled(
        batch.map(async ({ type, id }) => {
          const url = new URL(`/api/poster/${type}/${id}`, req.nextUrl.origin)
          url.searchParams.set("rv", String(POSTER_URL_VERSION))
          url.searchParams.set("lang", "it")
          if (apiKey) url.searchParams.set("api_key", apiKey)
          const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          await res.arrayBuffer()
          return "ok"
        })
      )
      for (let j = 0; j < batch.length; j++) {
        results.push({
          type: batch[j].type,
          id: batch[j].id,
          status: batchResults[j].status === "fulfilled" ? "ok" : "fail",
        })
      }
    }

    return Response.json({ total: ids.length, ok: results.filter((r) => r.status === "ok").length, results })
  } catch (e) {
    console.error("[warmup] Failed:", e)
    return new Response("Warmup failed", { status: 500 })
  }
}
