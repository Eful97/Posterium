let warmerStarted = false

export async function GET() {
  if (!warmerStarted) {
    warmerStarted = true
    if (process.env.CACHE_WARMER === "1") {
      import("@/lib/cache-warmer").then((m) => m.startCacheWarmer())
    }
  }
  return Response.json({ ok: true })
}
