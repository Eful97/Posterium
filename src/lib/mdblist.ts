export interface MDBListEntry {
  imdb: string
  title: string
  year: number
  tmdb?: number
}

export const MDBLISTS = [
  { key: 'mdblistMovie', label: 'Di tendenza', url: 'https://mdblist.com/lists/snoak/trending-movies' },
  { key: 'mdblistShow', label: 'Serie di tendenza', url: 'https://mdblist.com/lists/snoak/trakt-s-trending-shows' },
  { key: 'mdblistAnime', label: 'Anime di tendenza', url: 'https://mdblist.com/lists/snoak/trending-anime-shows' },
] as const

export async function fetchMDBList(listKey: string, apiKey?: string): Promise<MDBListEntry[]> {
  const list = MDBLISTS.find(l => l.key === listKey)
  if (!list) return []
  const key = apiKey || process.env.MDBLIST_API_KEY
  try {
    const slug = list.url.split('/').pop()
    const baseUrl = key
      ? `https://api.mdblist.com/lists/snoak/${slug}/items?apikey=${encodeURIComponent(key)}&limit=20`
      : `https://mdblist.com/api/lists/snoak/${slug}`
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json()
    const payload = key ? (data?.data || data) : data
    return ((payload?.items || payload || []) as any[]).map((item: any) => ({
      imdb: item.imdb_id || item.imdb || '',
      title: item.title || '',
      year: item.year || 0,
      tmdb: item.tmdb_id || item.tmdb || undefined,
    }))
  } catch {
    return []
  }
}

export async function checkMDBLists(imdbId: string): Promise<{ key: string; rank: number } | null> {
  for (const list of MDBLISTS) {
    const entries = await fetchMDBList(list.key)
    const idx = entries.findIndex(e => e.imdb === imdbId)
    if (idx >= 0) return { key: list.key, rank: idx + 1 }
  }
  return null
}
