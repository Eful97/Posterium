import { cacheGet, cacheSet } from "./cache"

const OMDb = "https://www.omdbapi.com"

async function fetchViaOMDb(imdbId: string): Promise<number | null> {
  const key = process.env.OMDB_API_KEY
  if (!key) return null
  try {
    const res = await fetch(`${OMDb}/?i=${imdbId}&apikey=${key}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.Response === "False") return null
    const r = parseFloat(data.imdbRating)
    return isNaN(r) ? null : r
  } catch {
    return null
  }
}

async function fetchViaScrape(imdbId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.imdb.com/title/${imdbId}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()

    // Try all JSON-LD blocks
    const jsonMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    for (const m of jsonMatches) {
      try {
        const json = JSON.parse(m[1])
        const r = parseFloat(json?.aggregateRating?.ratingValue)
        if (!isNaN(r)) return r
      } catch {}
    }

    // Fallback: meta tag with ratingValue
    const metaMatch = html.match(/<meta[^>]+itemprop="ratingValue"[^>]+content="(\d+\.?\d*)"/)
    if (metaMatch) {
      const r = parseFloat(metaMatch[1])
      if (!isNaN(r)) return r
    }

    // Fallback: any "ratingValue" in a script context
    const scriptMatch = html.match(/"ratingValue":\s*(\d+\.?\d*)/)
    if (scriptMatch) {
      const r = parseFloat(scriptMatch[1])
      if (!isNaN(r)) return r
    }

    return null
  } catch {
    return null
  }
}

export async function fetchImdbRating(imdbId: string): Promise<number | null> {
  if (!imdbId) return null
  const cacheKey = `imdb:rating:${imdbId}`
  const cached = cacheGet<number | null>(cacheKey)
  if (cached !== undefined) return cached

  const rating = (await fetchViaOMDb(imdbId)) ?? (await fetchViaScrape(imdbId))
  cacheSet(cacheKey, rating, ["imdb"])
  return rating
}
