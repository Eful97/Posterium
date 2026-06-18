let warmed = false
const MAX_WARM = 50

async function warmPosters(mappings: { tmdbId: number; mediaType: string }[]) {
  if (warmed || process.env.CACHE_WARMER !== "1") return
  warmed = true
  const count = Math.min(mappings.length, MAX_WARM)
  console.log(`[cache-warmer] Starting: ${count} posters...`)
  let done = 0
  for (const m of mappings.slice(0, count)) {
    try {
      const type = m.mediaType === "tv" ? "tv" : "movie"
      const apiKey = process.env.TMDB_API_KEY
      const url = `http://localhost:${process.env.PORT || 3000}/api/poster/${type}/${m.tmdbId}?api_key=${apiKey}&lang=it`
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (res.ok) done++
    } catch {}
    if (done % 10 === 0) await new Promise((r) => setTimeout(r, 1000))
  }
  console.log(`[cache-warmer] Done: ${done}/${count}`)
}

export function startCacheWarmer() {
  if (process.env.CACHE_WARMER !== "1") return
  setTimeout(async () => {
    try {
      const { getAll } = await import("@/lib/store")
      const mappings = await getAll()
      const items = Object.values(mappings).map((m: any) => ({ tmdbId: m.tmdbId, mediaType: m.mediaType }))
      await warmPosters(items)
    } catch (e) {
      console.error("[cache-warmer] Failed:", e)
    }
  }, 15000) // wait 15s after startup
}
