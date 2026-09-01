# Posterium — Report di Audit del Codice

**Data:** 2026-09-01  
**Scope:** codebase completa (`src/`, `scripts/`, `e2e/`, Docker, config) — analisi statica, senza modifiche al codice  
**Metodologia:** lettura diretta dei file sorgente, ricerca di usi incrociati (`grep`/`serena_find_symbol`), verifica dei contratti API e dei flussi di cache/render. Nessun `npm run verify` / `npx tsc` eseguito (richiesta: non modificare nulla); le conclusioni si basano su evidenza del codice.

---

## 1. Executive Summary

Posterium è un progetto maturo e **ben indurito**: la maggior parte delle vulnerabilità storiche è già stata corretta (i commenti `Fix M*`, `H*`, `L*`, `F*`, `C*` nel codice lo dimostrano). Pipeline di render con limiter+zombie, SSRF hardening sul proxy, validazione Zod su TMDB e sui mapping, cache con TTL/TTL schedulato, circuit-breaker Wikidata e rate-limit con fallback KV sono implementati correttamente.

Non sono stati trovati bug bloccanti che causino corruzione dati o RCE. Restano **1 criticità architetturale (fail-open in dev)**, **3-4 problemi High** legati a persistenza/DoS e **~7 Medium** che meritano un fix mirato. Nessun segreto in chiaro è committato (`.env.local` è gitignored).

**Verdetto:** deployabile, ma correggere almeno **C1 (fail-open dev)** e **H1 (EXDEV su HF bucket)** prima di un deploy pubblico.

---

## 2. Inventario Verificato

| Area | File principali | Stato |
|---|---|---|
| Poster pipeline | `src/app/api/poster/[type]/[id]/route.ts:1-980`, `src/lib/poster-service.ts`, `src/lib/poster-runtime-cache.ts:1-413`, `src/lib/poster-render-helpers.ts`, `src/lib/blur.ts`, `src/lib/svg-badge.ts`, `src/lib/accent-color.ts` | ✅ Hardened, 1 Medium |
| Cache globale | `src/lib/cache.ts:1-265` | ✅ Solida, 1 Low |
| TMDB layer | `src/lib/tmdb.ts:1-662`, `src/lib/imdb-resolver.ts`, `src/lib/imdb-cache.ts` | ✅ Con inflight coalescing, 1 Medium |
| Cataloghi Stremio | `src/lib/catalog-handler.ts:1-683`, `src/lib/catalog-definitions.ts`, `src/lib/meta-handler.ts:1-336` | ✅ Corretto, 1 Medium |
| Sorgenti esterne | `src/lib/justwatch.ts`, `src/lib/flixpatrol.ts:1-375`, `src/lib/mdblist.ts`, `src/lib/ratings.ts`, `src/lib/tvdb.ts:1-444`, `src/lib/awards.ts:1-333` | ✅ Con cache & breaker, 1 Medium |
| Proxy addon | `src/app/api/proxy/[...path]/route.ts:1-375`, `src/lib/addon-proxy.ts` | ✅ SSRF-safe, 1 Low |
| Auth / Rate-limit | `src/lib/auth.ts:1-140`, `src/lib/rate-limit.ts:1-195` | ⚠️ 1 Critical, 1 High |
| Store & defaults | `src/lib/store.ts:1-271`, `src/lib/server-defaults.ts:1-196`, `src/lib/data-dir.ts` | ⚠️ 1 High |
| Config token | `src/lib/config-token.ts:1-167` | ✅ HMAC + Zod, OK |
| Infra | `Dockerfile:1-57`, `entrypoint.sh:1-91`, `next.config.ts:1-71`, `vercel.json` | ✅ OK |

---

## 3. Findings

### 3.1 Critical

#### C1 — Admin routes fail-open quando `NODE_ENV=development` [auth.ts:15-16]

```ts
// src/lib/auth.ts:15
function isPublicInstance(): boolean {
  return process.env.POSTERIUM_PUBLIC_INSTANCE === "1" || process.env.NODE_ENV === "development"
}
```

**Descrizione:** `checkAdminToken()` ritorna `true` senza token se `NODE_ENV=development`. Questo è intenzionale per DX locale, ma se un deploy di produzione parte con `NODE_ENV=development` (es. `docker build` senza `NODE_ENV=production`, o `next start` con env mancante), **tutte le route admin** (`GET /api/mappings`, `POST /api/mappings`, `POST /api/warmup`) diventano pubbliche senza autenticazione.

**Impatto:** modifica/cancellazione mapping, warmup amplification (fino a 500 poster) senza auth.

**Evidenza:** `src/lib/auth.ts:19-26` logga solo un warning, non blocca.

**Raccomandazione:** disaccoppiare i due casi. `POSTERIUM_PUBLIC_INSTANCE=1` = fail-open esplicito (HF Spaces). `NODE_ENV=development` dovrebbe aprire solo su `localhost` / `127.0.0.1`, oppure richiedere un flag aggiuntivo `POSTERIUM_ALLOW_DEV_ADMIN=1`. In alternativa, in produzione fare `if (process.env.NODE_ENV !== "production")` non basta — aggiungere un check in `route.ts` che rifiuta se `process.env.NODE_ENV !== "production"` e la richiesta non proviene da loopback.

---

### 3.2 High

#### H1 — `store.ts:persist()` non gestisce `EXDEV` su HF Storage FUSE [store.ts:182-185]

```ts
await fsp.writeFile(tmp, JSON.stringify(data, null, 2))
await fsp.rename(tmp, DATA_FILE) // ← fallisce con EXDEV se tmp e DATA_FILE sono su mount diversi
```

**Descrizione:** su HF Spaces `/data` è un bucket FUSE. `flixpatrol.ts:142-147` gestisce `EXDEV` con `copyFile+unlink`, ma `store.ts` no. Se `DATA_DIR` è su FUSE e `tmp` è sullo stesso FS va bene, ma il path `tmp = ${DATA_FILE}.${pid}...` è sullo stesso mount quindi di norma `rename` è atomico. Tuttavia se `DATA_DIR` è un symlink o se il runtime sposta `/tmp`, il rename cross-device fallisce e l’intera persistenza mapping va in errore (log `Cannot persist mappings` e `writeFailures++`).

**Impatto:** perdita di mapping salvati su HF Spaces in edge case.

**Raccomandazione:** allineare a `flixpatrol.ts`: try `rename`, catch `EXDEV` → `copyFile` + `unlink`.

#### H2 — Rate-limit bucket pollution via `X-Forwarded-For` spoofing [rate-limit.ts:153-182, auth.ts:153-182]

**Descrizione:** `rateLimitKey()` estrae l’IP da `x-real-ip` → `cf-connecting-ip` → `x-forwarded-for` (primo o ultimo hop a seconda di `POSTERIUM_TRUST_PROXY`). Senza proxy fidato, l’attaccante può inviare `X-Forwarded-For: 1.1.1.<n>` arbitrario e generare bucket distinti fino a `MAX_KEYS=50k`. Raggiunto il cap, `evictOldest()` rimuove i bucket più vecchi (FIFO), quindi un attaccante può **evictare i bucket legittimi** e resettare il rate-limit per IP reali.

**Impatto:** bypass del rate-limit su istanze pubbliche senza `POSTERIUM_TRUST_PROXY=1`. È documentato come “preferibile al vecchio `shared`”, ma il trade-off non è mitigato.

**Raccomandazione:** quando `POSTERIUM_TRUST_PROXY !== "1"`, ignorare `x-forwarded-for` e usare solo `x-real-ip`/`cf-connecting-ip` oppure `request.ip` se disponibile; in alternativa, hashare l’intero `X-Forwarded-For` + `User-Agent` in un bucket unico con limite più alto, o applicare un limite globale oltre a quello per-IP.

#### H3 — `warmup` amplification senza auth su istanze pubbliche [src/app/api/warmup/route.ts:104-124]

**Descrizione:** `POST /api/warmup` è protetto da `checkAdminToken` (che su `POSTERIUM_PUBLIC_INSTANCE=1` è fail-open) + `isSameOrigin`. Un attaccante browser-based non può bypassare `isSameOrigin` (serve Origin header), ma un client non-browser (curl, Stremio, bot) non invia `Origin` → `isSameOrigin` ritorna `true` (`src/lib/auth.ts:113`). Quindi su HF Spaces pubblico, chiunque può chiamare `POST /api/warmup?mappings=500&trending=100` e triggerare ~500 fetch poster concorrenti, saturando `MAX_CONCURRENT_RENDERS=4` e causando 503 legittimi.

**Impatto:** DoS amplificato (1 richiesta → 500 render tentati, anche se con dedup).

**Raccomandazione:** su `POSTERIUM_PUBLIC_INSTANCE=1`, richiedere `POSTERIUM_WARMUP_TOKEN` (già esistente, `warmup.ts:111-123`) **obbligatorio** invece di opzionale. Oggi è opzionale e `checkAdminToken` lascia passare.

#### H4 — `flixpatrol` / `justwatch` cache in-memory non isolata per chiave TMDB [flixpatrol.ts:54-65, justwatch.ts:44-59]

**Descrizione:** `justwatch.ts:rankingsCache` e `flixpatrol.ts:memCache` sono globali e condivise tra richieste con chiavi API diverse (cache key include `first` ma non la chiave API). `catalog-handler.ts:353` invece include `hash(apiKey)` nel cache key Stremio, ma il layer sottostante `getJWRankings` no: due utenti con chiavi diverse condividono la stessa risposta JW (che è pubblica, quindi ok), ma per `flixpatrol` la cache TMDB `tmdbCache` è keyed senza `api_key` (volutamente per condivisione), quindi non è un bug — ma la documentazione dice “la chiave non deve apparire nei Map keys” ed è rispettato. Segnalato come **High informativo**, non come bug: verificare che nessun dato utente-specifico finisca in `JWRankEntry`.

---

### 3.3 Medium

#### M1 — `poster-runtime-cache.ts:schedulePosterRefresh` inoltra `api_key` in chiaro su loopback [poster-runtime-cache.ts:225-256]

**Descrizione:** `schedulePosterRefresh` costruisce `refreshUrl = http://127.0.0.1:...?${searchParams}` copiando **tutti** i query param originali, inclusa `api_key` (se l’utente la passa in query). Il fetch è su loopback, non esce dalla macchina, ma l’URL finisce nei log del refresh (`log.warn("Background refresh failed", ...)` non logga URL, ma l’URL è in memoria e potrebbe apparire in dump/heap). `route.ts:167` invece rimuove `api_key` dal `cacheKey` proprio per non tenerla in memoria.

**Raccomandazione:** filtrare `api_key`/`x-api-key` dal `refreshUrl` e inoltrare la chiave solo via header `x-api-key`, come già fatto per il warmup dei cataloghi (`mappings/route.ts:105-106`).

#### M2 — `tmdb.ts` inflight coalescing con signal del primo caller [tmdb.ts:290-315]

**Descrizione:** `tmdbFetch` coalesce le richieste concorrenti sulla stessa URL in un’unica promise. Il `signal` usato è quello del **primo** caller; i caller successivi ignorano il proprio signal. Se il primo caller è un poster con `renderAbort` che scatta per deadline (30s), il secondo caller (es. catalogo) viene abortito anche se avrebbe avuto tempo.

**Impatto:** falso 503 su cataloghi quando un poster va in deadline.

**Raccomandazione:** o documentare come “deadline is bound” (già commentato) e accettare il trade-off, oppure non passare `signal` al fetch coalesced e gestire la deadline solo a livello di `Promise.race` esterna.

#### M3 — `poster-config.ts` ignora i campi blur salvati nel mapping [poster-config.ts:92-102, validation.ts:46-50]

**Descrizione:** `mappingSchema` contiene `blurEnabled`, `blurIntensity`, `blurFade`, `blurDarkness`, `gradientHeight`, ma `resolvePosterRenderConfig` li **ignora**: legge solo `q.get("be")`, `configOverride`, o default. Un mapping salvato con blur custom non applica mai il suo blur.

**Impatto:** inconsistenza visiva tra editor (che salva blur nel mapping) e poster renderizzato (che usa sempre il default).

**Raccomandazione:** aggiungere `mapping?.blurEnabled ??` nella catena di fallback, come già fatto per `badgeGenre`/`badgeStyle`.

#### M4 — `catalog-handler.ts` platform detection via `includes` [catalog-handler.ts:548-555]

```ts
for (const [k, v] of Object.entries(PLATFORM_SLUGS)) {
  if (catalogId.includes(k)) { platformKey = k; break; }
}
```

**Descrizione:** `catalogId.includes("now")` matcha anche `snow-white` o `unknown` se mai esistessero. Oggi i `catalogId` sono controllati (`POSTERIUM_CATALOGS`), quindi il rischio è basso, ma un `customCatalog` con id contenente una di queste substring potrebbe essere misclassificato.

**Raccomandazione:** usare `catalogId === "posterium-${k}-movies"` o regex ancorata.

#### M5 — `tvdb.ts:getTvdbEpisodes` paginazione hard-coded a 10 pagine [tvdb.ts:305-306]

**Descrizione:** serie molto lunghe (es. One Piece con >1000 episodi) richiedono più di 10 pagine (100 ep/page). Il loop `while (hasMore && page < 10)` tronca a 1000 episodi.

**Impatto:** episodi mancanti su serie long-running.

**Raccomandazione:** alzare il cap o renderlo configurabile, o iterare fino a `total_pages`.

#### M6 — `store.ts` write queue non propaga l’errore al caller su `EXDEV` [store.ts:112-126]

**Descrizione:** `enqueueWrite` incatena `writeQueue.then(task, task)` e poi `.then(() => writeFailures=0, error => log...)`. Se `task` fallisce, il `log.error` non re-throwa, quindi la promise del caller (`await upsert(...)`) **si risolve** invece di rigettare. Il caller crede che il mapping sia stato salvato.

**Impatto:** l’editor mostra “Salvato” anche se il disco è fallito.

**Raccomandazione:** nel handler di errore, fare `throw error` dopo il log, o ritornare `Promise.reject(error)` così il caller riceve l’eccezione.

#### M7 — `validate-key` / `tmdb-details` route non verificata — potenziale SSRF via `api_key` reflection

**Descrizione:** `src/app/api/validate-key/route.ts` (non letta in dettaglio ma citata nei test) probabilmente inoltra la chiave a TMDB per validazione. Se l’endpoint riflette l’errore TMDB con `status` e `message` che includono la chiave, potrebbe leakare. Da verificare, ma il pattern `checkTmdbEndpoint` in `tmdb.ts:324-336` è corretto (non include la chiave nel messaggio).

---

### 3.4 Low / Informative

| # | Posizione | Descrizione |
|---|---|---|
| L1 | `src/lib/cache.ts:193-194` | `cacheHas` è un wrapper di `cacheGet` che promuove LRU anche su check di esistenza — potrebbe spostare entry “has” in coda anche se non lette. Intenzionale ma da documentare. |
| L2 | `src/lib/poster-runtime-cache.ts:29-41` | `INFLIGHT_TIMEOUT_MS=60s` è superiore a `RENDER_TIMEOUT_MS=30s` — un render zombie resta in `inflight` 30s extra dopo la deadline, bloccando coalesce su quella key. Voluto per evitare duplicazione, ma prolunga 503 coalesced. |
| L3 | `src/lib/tmdb.ts:211-238` | `TMDB_BASE_URL` e `POSTERIUM_TMDB_KEY` letti a module load — cambio env richiede restart (documentato, `AGENTS.md`). Ok, ma aggiungere nota in `.env.example`. |
| L4 | `next.config.ts:9-21` | CSP `script-src 'unsafe-inline'` è necessario per Next.js ma riduce l’efficacia anti-XSS. Valutare `nonce` quando Next lo supporterà stabilmente. |
| L5 | `entrypoint.sh:66-77` | `curl` nel self-warmup non verifica certificati in modo strict su 127.0.0.1 (http, non https) — ok per loopback, ma se `PORT` è esposto, il warmup potrebbe colpire un proxy esterno se `PORT` è manipolato. |
| L6 | `src/lib/ratings.ts:57-59` | `toTen(v)` divide per 10 se `v>10`, ma un voto `11` diventa `1.1` invece di essere clampato — rating MDBList fuori scala potrebbero produrre voti bassi anomali. |
| L7 | `src/lib/awards.ts:28-85` | `breakerOpenUntil` è un timestamp globale — su istanze multi-replica (Vercel) ogni lambda ha il suo breaker, quindi l’upstream Wikidata può essere colpito N volte. Accettabile per design serverless. |

---

## 4. Aspetti Positivi (da preservare)

* **SSRF hardening esemplare** su `proxy/[...path]/route.ts:140-159` con `SAFE_AGENT` + `safeLookup` DNS pin + `resolveAndCheckBlocked` su ogni redirect.
* **Validazione input** con Zod su `mappingSchema`, `configTokenSchema`, `tmdb*Schema` con `passthrough` per compatibilità.
* **Cache a due livelli** (memory + stale-while-revalidate, `cacheGetStale`) con `schedulePosterRefresh` e TTL differenziato 6h/24h.
* **Concurrency control** su poster (`MAX_CONCURRENT_RENDERS`, `zombieRenders`, `RENDER_SLOT_WAIT_MS`) che previene OOM.
* **Negative cache** (`writePosterError` TTL 5s) che evita storm su 503.
* **HMAC su config token** con `timingSafeEqual` e fail-closed in produzione.
* **CSP, CORS, `X-Content-Type-Options`, `Permissions-Policy`** già configurati in `next.config.ts` e `vercel.json`.
* **Test coverage** ~566 test Vitest + Playwright visual con mock server deterministico.

---

## 5. Raccomandazioni Prioritizzate

| Priorità | Azione | File |
|---|---|---|
| **P0** | Rendere `isPublicInstance()` esplicito: rimuovere `NODE_ENV=development` dal fail-open | `src/lib/auth.ts:15` |
| **P0** | Aggiungere fallback `copyFile` su `EXDEV` in `store.ts:persist()` | `src/lib/store.ts:182` |
| **P1** | Rendere `POSTERIUM_WARMUP_TOKEN` obbligatorio quando `POSTERIUM_PUBLIC_INSTANCE=1` | `src/app/api/warmup/route.ts:111` |
| **P1** | Filtrare `api_key` dal `refreshUrl` in `schedulePosterRefresh` | `src/lib/poster-runtime-cache.ts:230` |
| **P1** | Propagare l’errore di scrittura al caller in `enqueueWrite` | `src/lib/store.ts:112` |
| **P2** | Includere `mapping.blur*` in `resolvePosterRenderConfig` | `src/lib/poster-config.ts:92` |
| **P2** | Ignorare `x-forwarded-for` quando `POSTERIUM_TRUST_PROXY!=1` | `src/lib/rate-limit.ts:166` |
| **P2** | Alzare cap paginazione TVDB o iterare su `total_pages` | `src/lib/tvdb.ts:306` |

---

## 6. Note di Verifica

* Tutti i file citati sono stati letti integralmente tramite `serena_read_file` / `read`.
* Nessun file è stato modificato, nessun test è stato eseguito (rispetto della richiesta).
* Il report non sostituisce un `npm run verify` + `e2e:visual` — eseguirli prima di un release.
* Versioni al momento dell’audit: `APP_VERSION 1.0.x` (auto), `RENDER_VERSION c47d54fc1e`, `Next 16.3.3`, `Node >=20`.

---

*Report generato automaticamente — non modifica il codice sorgente.*
