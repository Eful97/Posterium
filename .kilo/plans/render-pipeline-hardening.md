# Render Pipeline Hardening — Stress-test & Piano di Implementazione

Obiettivo: indurire la render pipeline poster (`route.ts` → `poster-runtime-cache.ts` → `poster-service.ts`) contro i failure mode emersi dallo stress-test. Ordine confermato: **A → B → C → D → E**.

## Findings verificati (base del piano)

| # | Severità | Problema | Dove |
|---|---|---|---|
| F1 | ✅ ok | Memoria già limitata: slot acquisito PRIMA dei fetch immagini | `route.ts:347` vs `369` |
| F2 | HIGH | Slot holder senza deadline complessivo → upstream degradato = starvation 503 totale | `route.ts:342-624` |
| F3 | MED | Nessuna negative cache su 500/503 → hammering upstream + slot | `route.ts:618-621` |
| F4 | MED | Rank/IMDb Top 250 su poster non-mappati stantii fino a ~24h (TTL 3am UTC + max-age 86400) | `cache.ts:36-39`, `poster-runtime-cache.ts:9` |
| F5 | MED | Cold burst → surplus 503 senza Retry-After (slot wait 5s hardcoded) | `poster-runtime-cache.ts:188` |
| F6 | LOW | Preview editor su titoli non-mappati = pipeline completa per tick (debounce 200ms) | `context.tsx` preview |
| F7 | LOW | Rate limit poster 100 burst/10s → catalog load può 429 | `rate-limit.ts:33` |
| F8 | LOW | Coalesced wait fino a 60s (client lenti) | `poster-runtime-cache.ts:161-168` |

Contesto: tutti i fetch upstream hanno già timeout per-chiamata (tmdb 30s, fetchImg 15s, mdblist 10s, imdb-resolver 8s, wikidata race 4s). Il problema F2 è il tempo **cumulativo** e l'assenza di un rilascio forzato dello slot.

---

## Fase A — Deadline complessivo del render (F2, priorità massima)

**File**: `src/app/api/poster/[type]/[id]/route.ts`, `src/lib/poster-render-helpers.ts`, `src/lib/tmdb.ts`

1. `poster-render-helpers.ts` — `fetchImg(url, signal?: AbortSignal)`: `signal: signal ?? AbortSignal.timeout(15000)`.
2. `tmdb.ts` — aggiungere `signal?: AbortSignal` a `tmdbFetch` + `getDetails`/`getImages`/`getExternalIds`/`getKeywords`; `fetch(fetchUrl, { signal: signal ?? AbortSignal.timeout(30000) })`. Nota: l'inflight coalescing di `tmdbFetch` è condiviso — il signal vale per la prima richiesta (ok, il deadline è il bound).
3. `route.ts` — env `POSTERIUM_RENDER_TIMEOUT_MS` (default 30000, clamp 1s..120s), letto a module level accanto a `MAX_CONCURRENT_RENDERS`.
4. Nel GET, prima di `acquirePosterRenderSlot` (riga ~343):
   ```ts
   let releaseRender: (() => void) | null = null
   let slotReleased = false
   const releaseSlotOnce = () => { if (releaseRender && !slotReleased) { slotReleased = true; releaseRender() } }
   const renderAbort = new AbortController()
   const renderDeadline = setTimeout(() => {
     renderAbort.abort()
     completePosterRender(null) // libera l'inflight map
     releaseSlotOnce()          // libera lo slot anche se il render non abortisce (es. sharp)
   }, RENDER_TIMEOUT_MS)
   ```
   - `finally`: `clearTimeout(renderDeadline); releaseSlotOnce()` (idempotente — il watchdog può già averlo fatto).
   - Passare `renderAbort.signal` a: `fetchImg(...)` (3 call site: poster/logo/backdrop), `getDetails`, `getImages`, `getExternalIds`, `getKeywords`.
   - `resolveImdbToTmdb` (riga 74) e gli altri fetch (JW/wikidata/mdblist) restano con i loro timeout per-chiamata: il watchdog force-release copre il caso peggiore. (Threading incrementale opzionale.)
5. Su abort → i fetch lanciano `AbortError` → il `catch` esistente (riga 618) risponde 500 + libera. Comportamento atteso: sotto il deadline tutto invariato.

**Verifica**: unit test `poster-runtime-cache` — slot con holder che non rilascia + watchdog simula deadline → `activeRenders` torna a 0, inflight svuotata. Test 503 con `POSTERIUM_MAX_CONCURRENT_RENDERS=1`.

---

## Fase B — Negative cache per errori (F3)

**File**: `src/lib/poster-runtime-cache.ts`, `route.ts`

1. `poster-runtime-cache.ts`:
   - `const NEGATIVE_TTL_MS = Number(process.env.POSTERIUM_NEGATIVE_CACHE_TTL_MS) || 5000` (clamp 1s..60s)
   - `writePosterError(cacheKey, status: 500 | 503)` → `cacheSet(\`${cacheKey}:err\`, { status }, ["poster-error"], NEGATIVE_TTL_MS)`
   - `readPosterError(cacheKey)` → `cacheGet` dell'entry, promuove LRU.
2. `route.ts`:
   - Prima del cache-miss render (dopo `readCachedPoster`), leggere l'errore negativo: se presente, rispondere subito lo stesso status (senza `Retry-After` per 500; con `Retry-After: 5` per 503).
   - Nel `catch` (riga 618) e sul ramo 503 (riga 348-351): `writePosterError(cacheKey, status)` PRIMA di rispondere.
3. La negative cache si svuota da sola (TTL breve): non serve invalidation esplicita.

**Verifica**: test che un 500 ripetuto non ri-render per il TTL (mock server che fallisce 2 volte di fila → 1 solo render effettivo); stato `/status` espone contatori errori negativi.

---

## Fase C — TTL differenziato per poster non-mappati (F4)

**File**: `poster-runtime-cache.ts`, `route.ts`

1. `poster-runtime-cache.ts` — nuovo header set per i non-mappati:
   - `POSTER_DYNAMIC_CACHE_CONTROL = "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400"` (6h invece di 24h), `CDN-Cache-Control` coerente.
2. `route.ts` — `posterHeaders(etag, immutable, isPreview, dynamic?)`: `dynamic=true` quando `!mapping` (poster non-mappato). `posterResponse(...)` e `posterNotModifiedHeaders(...)` allineati.
3. Opzionale (se serve freschezza rank nel giorno): includere `finalRank` nel cache key per i non-mappati SOLO quando un badge ranking è attivo (`rankingEnabledEarly` && (rank da query o JW)) — più preciso ma frammenta la cache; valutare.
4. Non toccare l'immutable path (mappato + `rv`+`mv`): resta `max-age=31536000, immutable`.

**Verifica**: unit test su `posterHeaders`/`posterResponse` per i 3 casi (immutable mappato, non-mappato 6h, preview no-store). Visuali e2e invariati (nessun cambio di resa).

---

## Fase D — Gestione cold burst (F5)

**File**: `poster-runtime-cache.ts`, `route.ts`

1. `poster-runtime-cache.ts`:
   - `RENDER_SLOT_WAIT_MS` → env `POSTERIUM_RENDER_SLOT_WAIT_MS` (default 5000, clamp 500..60000), letto a module level.
   - Opzionale: coda bounded — env `POSTERIUM_RENDER_QUEUE` (default 0 = comportamento attuale con 503). Con `N>0`, i waiter oltre `N` ricevono 503; gli altri attendono fino al timeout. Mantiene la backpressure senza starvation totali.
2. `route.ts` — sul 503 aggiungere header `Retry-After: <waitMs/1000>` così Stremio/CDN fanno backoff esplicito.
3. Documentare in README/AGENTS la coppia `POSTERIUM_MAX_CONCURRENT_RENDERS` + `POSTERIUM_RENDER_SLOT_WAIT_MS`.

**Verifica**: script di load smoke (`scripts/load-smoke.mjs`, nuovo) — N=40 richieste concorrenti su titoli freddi col mock server: misura % 503, poster/sec, `process.memoryUsage().heapUsed` prima/dopo. Assert: nessun OOM, heap < 250MB su default 384MB.

---

## Fase E — Ottimizzazioni basse (F6/F7/F8)

**File**: `context.tsx` / `usePosterPreview.ts` (F6), `rate-limit.ts` (F7), `poster-runtime-cache.ts` (F8)

1. **F6 — session cache editor**: cache in-memory (Map, TTL 10min, max ~50) delle `details`/`images`/`keywords` TMDB per `type:id` durante la sessione editor, così i tick di preview su titolo non-mappato non rifanno la pipeline di rete. Chiave per `type:id`, invaldata su cambio selezione.
2. **F7 — rate limit poster**: bucket `poster` → `{ maxTokens: 200, refillRate: 20, refillWindow: 1000 }` (o via env `POSTERIUM_RATELIMIT_POSTER_MAX`). Aggiornare `rate-limit.ts:33`.
3. **F8 — cap coalesced wait**: il waiter coalesced attende al massimo `RENDER_SLOT_WAIT_MS`; oltre risponde 503. Evita client lenti che tengono connessioni 60s.

**Verifica**: unit test per la session cache (2 richieste stesso titolo → 1 solo fetch), e2e smoke invariati.

---

## Ordine, rischio e verifica finale

| Fase | Rischio | Valore | Verifica chiave |
|---|---|---|---|
| A | basso | massimo | unit limiter + 503 con 1 slot |
| B | basso | alto | 500 ripetuto → 1 solo render |
| C | basso | medio | header 3 casi + visuali invariati |
| D | medio | medio | load-smoke: 0 OOM, % 503 misurata |
| E | basso | basso | session cache: 1 fetch per 2 preview |

**Gate finale** (obbligatorio): `npx vitest run` + `npx playwright test e2e/` + `npx tsc --noEmit` + `npx eslint .` + `node scripts/write-render-version.mjs` se toccato un render file (route/poster-cache non sono in `RENDER_FILES`? verificare: `route.ts` NON hashato, `poster-runtime-cache.ts` NON hashato → RENDER_VERSION invariata; se un file in `RENDER_FILES` cambia, rigenerare).

**Nota di configurazione**: questo piano è stato scritto in modalità planning (solo file di piano). L'esecuzione richiede un agente con permessi di edit sul sorgente (es. sessione di implementazione).
