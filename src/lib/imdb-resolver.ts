import { cacheGet, cacheSet } from "./cache"
import { createLogger } from "@/lib/logger"

const log = createLogger("imdb-resolver")

export async function resolveImdbToTmdb(imdbId: string, mediaType: "movie" | "tv", apiKey?: string): Promise<number | null> {
  // Regex stretta: formato IMDb valido (tt + cifre). Protegge anche l'URL
  // da payload arbitrari (la stringa entra nel path del find).
  const cleanId = imdbId.trim()
  if (!/^tt\d+$/.test(cleanId)) return null

  const cacheKey = `imdb:tmdb:${cleanId}:${mediaType}`
  // Sentinella -1 per i no-match cachati: cacheGet<number> non distingue un
  // null cachato da un miss, quindi il "no-match" viene memorizzato come -1.
  const cached = cacheGet<number>(cacheKey)
  if (cached !== null) return cached === -1 ? null : cached

  // S9: la chiave arriva esplicita (richiesta/profilo), mai da una chiave
  // d'istanza. Resta in query nell'URL outbound perché la v3 TMDB la richiede
  // così; nessun log cattura l'URL completo.
  if (!apiKey) return null

  try {
    const url = `https://api.themoviedb.org/3/find/${encodeURIComponent(cleanId)}?api_key=${encodeURIComponent(apiKey)}&external_source=imdb_id`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()

    let tmdbId: number | undefined
    if (mediaType === "movie") {
      tmdbId = data.movie_results?.[0]?.id
    } else {
      tmdbId = data.tv_results?.[0]?.id || data.movie_results?.[0]?.id
    }

    if (tmdbId && typeof tmdbId === "number" && tmdbId > 0) {
      cacheSet(cacheKey, tmdbId, ["tmdb", "imdb"], 86400 * 7)
      return tmdbId
    }
    // No-match confermato (risposta 200 senza risultati): cache breve — un
    // titolo può essere aggiunto a TMDB nel giro di giorni, non minuti.
    cacheSet(cacheKey, -1, ["tmdb", "imdb"], 60_000)
    return null
  } catch (e) {
    // Errore di rete: NON cachare il fallimento, ritenta al prossimo accesso.
    log.error(`Failed to resolve ${cleanId}`, { error: e instanceof Error ? e.message : String(e) })
  }

  return null
}
