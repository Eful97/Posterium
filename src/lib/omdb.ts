const API = "https://www.omdbapi.com"

export async function fetchImdbRating(imdbId: string): Promise<number | null> {
  const key = process.env.OMDB_API_KEY
  if (!key || !imdbId) return null
  try {
    const res = await fetch(`${API}/?i=${imdbId}&apikey=${key}`, {
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
