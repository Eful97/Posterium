# Posterium - Cataloghi Stremio (architettura & id metadati)

> Le regole qui descritte sono il contratto per chi modifica i cataloghi. Quando
> questo file e il codice discordano, vince il codice (CODE WINS) — aggiorna il file.

## Vista d'insieme

Posterium espone cataloghi Stremio **solo per generare i poster**. La risoluzione dei
**metadati** (nome, trama, locandina originale) NON avviene qui: alla click su un
elemento, Stremio chiede `/meta/{type}/{id}` agli addon esterni (tipicamente
AIOMetadata). Per questo l'`id` esposto nel catalogo DEVE essere un id che quegli
addon sanno risolvere.

### REGOLA D'ORO — id metadati risolvibili

AIOMetadata e gli altri addon risolvono i metadati **solo** da id `tt...` (IMDb) o
`provider:id` (es. `tmdb:12345`). Un **numero nudo** (`12345`) NON è risolvibile →
"no metadata" al click.

Risoluzione dell'id (helper `catalogMetaId` in `catalog-handler.ts`):
1. `imdbId` fornito dalla fonte (JustWatch lo restituisce già nella query GraphQL);
2. altrimenti TMDB `/{type}/{id}/external_ids` (`resolveImdbId`, che passa la chiave
   della richiesta);
3. altrimenti fallback provider `tmdb:<id>`.

Mai emettere un id numerico nudo come `id` del meta.

## Cataloghi supportati (`POSTERIUM_CATALOGS` in `catalog-definitions.ts`)

| Prefix catalogo | Fonte | Tipo | Richiede |
|---|---|---|---|
| `posterium-jw-movies` / `posterium-jw-series` | JustWatch StreamingCharts (GraphQL) | movie/series | Chiave TMDB |
| `posterium-netflix/prime/disney/apple/hbo/paramount-*` | FlixPatrol Top 10 | movie/series | Chiave TMDB |
| `posterium-anime` | MDBList `mdblistAnime` | series | Chiave MDBList |

Warmup automatico: `posterium-jw-movies`, `posterium-jw-series`, `posterium-anime`
(`WARMUP_CATALOG_IDS`).

## Flusso per catalogo

### JustWatch (`posterium-jw-*`)
1. `getJWRankings("MOVIE"|"SHOW", "IT", 20)` in `lib/justwatch.ts` — query GraphQL
   a `apis.justwatch.com` (o `JUSTWATCH_API_URL` nei test). Cache condivisa 30 min
   con `/api/trending/rank` e warmup. Restituisce `{ tmdbId, imdbId, rank }`:
   **l'`imdbId` arriva già da JustWatch** — non rifare una chiamata TMDB per ottenerlo.
2. Per ogni riga: `getDetails` TMDB (`it-IT`) con la chiave risolta da
   `resolveRequestApiKey(req)`.
3. Id del meta: `row.imdbId` → fallback `resolveImdbId(...)` → fallback `tmdb:<id>`.
4. Poster: `/api/poster/{type}/{tmdbId}?rv=...` (+ `mv` se esiste un mapping salvato).

### Piattaforme FlixPatrol
`getTop10(slug, "italy", apiKey)` → top 10 film/serie → stessa risoluzione id via
TMDB `external_ids` → `tmdb:<id>` se manca. La fonte non fornisce `imdbId`: qui il
catalogo dipende interamente da `resolveImdbId`.

### Anime (MDBList)
`fetchMDBList("mdblistAnime", key)` — la riga MDBList può già contenere `imdb`; se
manca, `resolveImdbId("tv", tmdbId)` → fallback `tmdb:<id>`.

## Chiavi API

`resolveRequestApiKey(req)` in `lib/tmdb.ts` — priorità:
1. header `x-api-key`;
2. query `api_key`.

**Nessuna chiave d'istanza di default** (`TMDB_API_KEY`/`MDBLIST_API_KEY` non
sono lette). La fonte primaria di chiavi è la richiesta (header `x-api-key` >
query `api_key`) o il profilo utente (`?u=`): senza chiave esplicita la chiamata
TMDB/MDBList fallisce (poster 404, cataloghi vuoti). `resolveImdbId` DEVE
ricevere la chiave della richiesta (è così oggi).

**Fallback d'istanza (opt-in, per istanze personali)**: `POSTERIUM_TMDB_KEY` e
`POSTERIUM_MDBLIST_KEY` sono lette come FALLBACK quando la richiesta e il profilo
non portano la chiave. Pensate per deploy personali (es. Vercel con un solo
utente) dove i cataloghi devono funzionare senza che Stremio passi la chiave.
Per istanze multi-utente pubbliche NON configurarle: la policy storica (nessuna
chiave d'istanza condivisa) resta valida per quel caso.

## Caching & risposte

- Cache catalogo (`cacheSet`/`cacheGet` in `lib/cache.ts`): key include tipo,
  `catalogId`, `POSTER_URL_VERSION`, hash `config` e hash `mdblist_key`.
  TTL: refresh schedulato alle 3:00 UTC (tag `catalog`); catalogo **vuoto** → 60 s.
- Cache JustWatch (30 min) condivisa anche da `/api/trending/rank` e warmup.
- `metas: []` = catalogo non riconosciuto, chiave mancante o errore. Rate limit →
  429 con `Retry-After`.
- Header risposta: `Cache-Control: no-cache`, CORS `*`.
- Route con `maxDuration = 60`: un catalogo freddo fa ~20 `getDetails` + ranking.

## Cosa NON fare

- Non emettere mai `id` numerici nudi nel catalogo.
- Non reintrodurre la chiamata TMDB extra per l'`imdbId` nei cataloghi JustWatch:
  la fonte lo fornisce già.
- Non rimuovere il passaggio della chiave della richiesta in `resolveImdbId`.
- Non hardcoddare nuovi cataloghi nel route: aggiungili a `POSTERIUM_CATALOGS` (e a
  `WARMUP_CATALOG_IDS` se devono essere preriscaldati).

## File coinvolti

- `src/lib/catalog-definitions.ts` — elenco cataloghi + warmup
- `src/lib/catalog-handler.ts` — `posteriumCatalog(req, mediaType, rawId, userParam, configParam)` (logica unica). `userParam` (param `u=`/`user`) è il profilo UUID: entra nel cache key come `:u<uuid>` e nei poster URL come `user` (`&u=`). `configParam` è il config token (`config=`).
- `src/lib/justwatch.ts` — `getJWRankings` (GraphQL + cache)
- `src/lib/flixpatrol.ts` — `getTop10` per le piattaforme
- `src/lib/mdblist.ts` — `fetchMDBList`
- `src/lib/tmdb.ts` — `getDetails`, `getExternalIds`, `resolveRequestApiKey`
- `src/lib/store.ts` — mapping salvati (parametro `mv` nel poster URL)
- `src/app/catalog/[type]/[id]/route.ts` — route Stremio
- `src/app/api/trending/rank/route.ts` — rank JustWatch per il badge
- `src/app/api/warmup/route.ts` — preriscaldamento poster (trending + JW + mapping)
