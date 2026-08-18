import { cacheGet, cacheSet } from "./cache"
import { tmdbFindByImdb } from "@/lib/tmdb"
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
  // d'istanza.
  if (!apiKey) return null

  try {
    // Fix L22: il fetch passa dal layer condiviso tmdb.ts (cache 5min a chiave
    // neutra + inflight coalescing) invece di un fetch dedicato duplicato.
    // La cache lunga (7gg / 60s no-match) resta qui, sopra quella di rete.
    const tmdbId = await tmdbFindByImdb(cleanId, mediaType, apiKey)

    if (tmdbId) {
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
