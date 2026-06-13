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
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    // Try JSON-LD first
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    if (jsonMatch) {
      try {
        const json = JSON.parse(jsonMatch[1])
        const rating = json?.aggregateRating?.ratingValue
        if (rating) {
          const r = parseFloat(rating)
          if (!isNaN(r)) return r
        }
      } catch {}
    }
    // Fallback: scrape rating from meta or span
    const ratingMatch = html.match(/"ratingValue":\s*(\d+\.?\d*)/)
    if (ratingMatch) {
      const r = parseFloat(ratingMatch[1])
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
