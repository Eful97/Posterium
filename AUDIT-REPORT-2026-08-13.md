# Audit Posterium — Bug e criticità

**Data:** 2026-08-13 · **Commit di riferimento:** `467ff64`
**Tipo:** audit read-only (nessuna modifica al codice)
**Scope:** pipeline render poster, cache, storage/profili, auth, proxy, cataloghi, fonti esterne.

> **Rev. 2** — incorpora la revisione incrociata di un report esterno: 3 finding confermati
> (mdblist/anime, logger, token legacy) e una sezione dedicata ai falsi positivi di quel report.
> Ogni claim è verificato sui call site reali.

> **Rev. 3 (2026-08-14)** — ri-verifica completa su commit corrente: tutti i 13 finding di Rev. 2
> **confermati** (line-verified sui file attuali); aggiunte 6 nuove finding (14–19) individuate in
> questo pass. Nessuna modifica al codice (audit read-only).

Legenda severità: **CRITICO** → **ALTO** → **MEDIO** → **BASSO**.

---

## CRITICO

### 1. Takeover dei profili legacy senza password (chiunque conosca l'UUID li possiede)

- **File:** `src/app/api/profile/route.ts:128-139` · `src/lib/profile-store.ts:282-283`
- **Scenario d'attacco:**
  1. Un profilo **legacy senza `passwordHash`/`salt`** esiste in archivio. Il suo UUID è pubblico: appare in ogni URL poster `/api/poster/{type}/{id}?u=<uuid>` generata nei cataloghi.
  2. L'attaccante POSTa `/api/profile` con `{ profileId: "<uuid>", config: {...}, password: "nuova", apiKeys: {...} }`.
  3. In `route.ts:131` la verifica password scatta **solo se** `existing?.passwordHash && existing?.salt`. Su un profilo passwordless la guardia è **saltata**.
  4. `createOrUpdateProfile` (`profile-store.ts:283`) riusa l'UUID esistente e **sovrascrive config + apiKeys + mappings** (righe 301-307) e imposta **la nuova password dell'attaccante** (righe 309-312).
  5. Risultato: il legittimo proprietario è **chiuso fuori**, le sue apiKeys (TMDB/MDBList) sono **distrutte** e rimpiazzate da quelle dell'attaccante.
- **Nota di raggiungibilità:** oggi `route.ts:142` impone la password alla creazione, quindi il profilo passwordless è **solo legacy**. Va comunque chiuso: il fix è banale e il rischio (profilo esposto in URL pubbliche + lockout + distruzione chiavi) è alto.
- **Fix suggerito:**
  - Se `existing` esiste e **non** ha password → rifiuta l'aggiornamento senza admin token, oppure
  - richiedi SEMPRE la password corrente (o `requireAdminToken`) per aggiornare un profilo esistente, e tratta "impostare la password su un profilo esistente" come operazione riservata.

---

## ALTO

### 2. `/api/profile` non valida il `profileId` come UUID → chiavi arbitrarie in storage

- **File:** `src/app/api/profile/route.ts:120-122` → `src/lib/profile-store.ts:283` (chiave di storage = stringa grezza)
- `existingProfileId` arriva dal body **senza** regex UUID; `createOrUpdateProfile` lo usa **verboatim** come chiave di storage (solo `getFullProfileData` in `route.ts:128` valida la regex, ma restituisce `null` e il valore passa comunque). Conseguenze:
  - Un client con `profileId: "foo"` crea un profilo orfano sotto la chiave `"foo"`, **mai più caricabile** via GET/`?u=` (la regex lo rifiuta) né utilizzabile per i poster: footgun UX.
  - Caso limite reale: `profileId: "__proto__"`. `getFullProfile` legge `data["__proto__"]` (file mode) che restituisce `Object.prototype` (truthy) → il profilo viene scritto con `all["__proto__"] = data`, **inquinando il prototipo** della mappa profili in memoria (prototype pollution). Non persiste (JSON.stringify), ma degrada l'integrità della mappa per la sessione.
- **Fix suggerito:** validare `raw.profileId` con la stessa regex di `getProfile`/`getFullProfileData` e rispondere 400 su mismatch; in aggiunta, duplicare la guardia dentro `createOrUpdateProfile` (defense-in-depth).

### 3. Proxy risorse non inoltra i parametri query dell'addon target

- **File:** `src/app/api/proxy/[...path]/route.ts:277-281`
- `fullTargetUrl = ${targetBase}/${subPath}` inoltra solo il path. I **query param della richiesta originale** (es. `genre`, `skip`, `type`, `id`, `extra` delle risorse Stremio catalog/meta/stream) vengono **scartati** → un catalogo proxato perde filtro e paginazione.
- **Raggiungibilità:** il client (`src/components/ProxyModal.tsx:32`) esercita solo `?url=` sul path `manifest`; il resource proxy è un punto d'ingresso secondario. Resta una lacuna funzionale e **nessun test la copre** (`src/__tests__/addon-proxy.test.ts` testa solo helper/allowlist, non il forwarding).
- **Fix suggerito:** ricostruire la query dell'URL target unendo i param originali (esclusi `target`/`url`/`u`/`user`); aggiungere un test di forwarding.

---

## MEDIO

### 4. Render 404: i waiter coalesced ricevono 503 e il 404 non è negative-cached

- **File:** `src/app/api/poster/[type]/[id]/route.ts:496-503` e `:611-614`
- Su poster non trovato si chiama `completePosterRender(null)` **senza** `writePosterError`. Il waiter coalesced (che attende `pendingPoster`) riceve `null` → `readPosterError` vuoto → **503 generico** invece di 404 (`route.ts:231-237`). Inoltre il 404 non entra in negative cache → ogni richiesta successiva per lo stesso titolo inesistente **ri-esegue l'intera pipeline** (TMDB + best-fit + fetch).
- **Fix suggerito:** propagare lo stato al waiter (es. scrivere un errore "404" riusando la negative cache con un TTL breve, o far arrivare al waiter il payload + status), ed evitare il re-render immediato degli stessi 404 (TTL breve).

### 5. Preview coalesced: header cache NON `no-store`

- **File:** `src/app/api/poster/[type]/[id]/route.ts:227`
- `posterResponse(payload, immutablePoster, false, dynamicPoster)` — `isPreview` è **hardcoded `false`**. Quando due preview (`?preview=1`, stessa cache key) si coalescono, il waiter riceve `Cache-Control: public, max-age=86400` invece di `no-cache, no-store`. Una CDN può quindi servire **preview stale per 24h** (le righe 207 e 212 passano correttamente `isPreview`; solo la riga 227 no).
- **Fix suggerito:** `return posterResponse(payload, immutablePoster, isPreview, dynamicPoster)`.

### 6. Mismatch regex `accentColor` tra validazione e runtime

- **File:** `src/lib/validation.ts:28` (`/^#[0-9a-fA-F]{3,8}$/`) vs `src/lib/poster-render-helpers.ts:40-42` (`/^#([0-9A-Fa-f]{3}){1,2}$/`)
- Lo schema accetta anche 4/5/7 cifre e l'alpha a 8 cifre (`#rrggbbaa`); `isValidHex` accetta solo `#rgb`/`#rrggbb`. Un mapping salvato con `accentColor: "#rrggbbaa"` **passa la validazione** ma viene **ignorato a render** (fallback al colore genere), senza alcun errore.
- **Fix suggerito:** allineare le due regex (schema `^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$` oppure estendere `isValidHex` alle forme a 4/8 cifre).

### 7. `/api/mdblist/anime` bypassa `@/lib/tmdb` (cache, rate limit, mock E2E)

- **File:** `src/app/api/mdblist/anime/route.ts:54-57` e `:74-77`
- La route fa fetch diretti a `https://api.themoviedb.org/3/tv/{id}?...` e `.../find/{imdbId}?...` **senza passare dalle utility**:
  - niente cache condivisa 5 min né inflight coalescing di `tmdb.ts`;
  - niente override `TMDB_BASE_URL` (`tmdb.ts:3`) → nei test E2E il mock server **non intercetta** questa route, che colpisce TMDB reale → test flaky/falliti;
  - niente gestione rate limit TMDB condivisa; la chiave `api_key` finisce in URL outbound senza le mitigazioni documentate in `tmdb.ts` (S9).
  - La URL MDBList è hardcoded, senza l'override `MDBLIST_API_URL` che `mdblist.ts` usa nei test.
- **Fix suggerito:** usare `getDetails("tv", tmdbId, lang, apiKey)` e l'helper `find`/external_ids di `@/lib/tmdb`; eliminare i fetch duplicati.

### 14. `resolveImdbToTmdb` hardcoda la base URL TMDB (bypassa `TMDB_BASE_URL`)

- **File:** `src/lib/imdb-resolver.ts:29`
- La URL è costruita come `https://api.themoviedb.org/3/find/{imdbId}?api_key=...` con la base
  **hardcodata**, non usa `TMDB_BASE_URL` come `tmdb.ts:3`. Stessa classe del finding 7: in modalità
  mock/E2E (`TMDB_BASE_URL` puntato al mock server locale) questa chiamata colpisce **TMDB reale**; in
  produzione è un'inconsistenza col pattern unico delle basi URL sovrascrivibili.
  Nota (più lieve del finding 7): la chiave **non** entra nella cache key
  (`imdb:tmdb:{id}:{type}`, senza hash key) e gli errori di rete non vengono cachati.
- **Fix suggerito:** esportare la base da `tmdb.ts` (o una costante condivisa `TMDB_BASE_URL`) e
  usarla qui (l'`encodeURIComponent` sul path è già presente).

### 15. `POST /api/profile` non valida la `config` con `configTokenSchema` (validazione manuale parziale)

- **File:** `src/app/api/profile/route.ts:85-97` (solo `requiredBools` + `requiredNums` manuali)
- A differenza di `/api/config-token` (che usa `configTokenSchema.safeParse`, `config-token/route.ts:32`),
  il profilo valida solo 6 booleani obbligatori e 4 numeri. Gli **enum** `badgeStyle` /
  `rankingBadgeStyle` / `ribbonSide` e i campi opzionali (`badgeGenre`, `badgeYear`, `badgeRating`,
  `customBadge`) non vengono validati né normalizzati alla scrittura.
- **Impatto (mitigato al render):** `resolvePosterRenderConfig` fa fallback sui valori non validi
  (`poster-config.ts:73` e `:118` via `isBadgeStyle`/`isRankingBadgeStyle`, `:131` per `ribbonSide`)
  e i numeri vengono clampati (`:90-96`). Restano: incoerenza col token path, valori arbitrari
  persistiti nel profilo, e `customBadge` illimitato (~100KB, il body cap) salvato e inoltrato al
  render badge.
- **Fix suggerito:** `configTokenSchema.safeParse(config)` nel POST profilo (come fa
  `/api/config-token`), poi clamp/normalizzazione come in `decodeConfig`.

### 16. `/api/warmup` amplificatore di carico su istanza pubblica (fail-open)

- **File:** `src/app/api/warmup/route.ts:103` (`checkAdminToken` fail-open) e `:108-111` (bound)
- Su istanza pubblica (`POSTERIUM_PUBLIC_INSTANCE=1`, HF Spaces) chiunque può POSTare
  `/api/warmup?concurrency=8&trending=100&justwatch=50&mappings=500` → fino a **~700 render poster**
  per una singola richiesta. `isSameOrigin` blocca solo i browser (curl/script senza Origin passano).
  Il rate limit `warmup` (5 burst / 1 refill per sec, `rate-limit.ts:47`) limita la **frequenza**,
  ma ogni richiesta resta un amplificatore di carico verso la pipeline di render.
- **Nota di compatibilità:** l'entrypoint self-warmup chiama `/api/warmup` **senza** admin token su
  istanze pubbliche (`deploy` skill), quindi un passaggio diretto a `requireAdminToken` lo romperebbe.
- **Fix suggerito:** token dedicato opzionale (se presente, obbligatorio) mantenendo il fail-open
  senza token; oppure ridurre i bound di default (`concurrency`/`mappings`) e/o richiedere un body firmato.

---

## BASSO

### 8. `customBadge` senza limite di lunghezza

- **File:** `src/lib/config-token.ts:36` (`z.string().optional()`)
- Valore illimitato: gonfia il token firmato (URL condivise) e la label SVG del badge. **Fix:** `.max(40)` (o simile) nello schema.

### 9. Rimozione di `PROFILE_ENCRYPTION_KEY` → apiKeys condoppie (criptate + plaintext)

- **File:** `src/lib/profile-store.ts:286-298` e `:342-356`
- Se la chiave viene tolta dopo un primo uso: le nuove apiKeys sono salvate in plaintext mentre le vecchie restano `v1:...`; se la chiave viene **reinserita**, `decryptValue` su un valore plaintext fallisce e l'apiKey **sparisce silenziosamente** dal risultato di `getFullProfileData`. **Fix:** segnare esplicitamente "plaintext" (prefix) o rifiutare il salvataggio senza chiave di cifratura quando già usata.

### 10. `isSameOrigin` fail-open quando l'host non è risolvibile

- **File:** `src/lib/auth.ts:110` (`if (!host) return true`)
- La CSRF guard lascia passare le richieste con Origin se l'host pubblico non si risolve. Impatto basso (i browser inviano sempre `Host`), ma il fail-open è contro lo spirito della guardia. **Fix:** fallire (o rifiutare) quando l'host è irrisolvibile.

### 11. `RENDER_TIMEOUT_MS` può superare `maxDuration` (40s)

- **File:** `src/app/api/poster/[type]/[id]/route.ts:62` e `:70-74`
- Env fino a 120s consentito; su Vercel la funzione muore a 40s prima del watchdog. Il cleanup `INFLIGHT_TIMEOUT_MS` (60s, `poster-runtime-cache.ts:40`) copre comunque la map. **Fix:** clampare il limite superiore al `maxDuration` effettivo (40s).

### 12. `POSTERIUM_LOG_LEVEL` non validato → tutti i log soppressi

- **File:** `src/lib/logger.ts:12-14`
- `CURRENT_LEVEL = LOG_LEVELS[POSTERIUM_LOG_LEVEL]`. Un valore non valido (es. `verbose`) produce `undefined` → `shouldLog` valuta `LOG_LEVELS[level] >= undefined` → **sempre false** → **ogni log silenziato** (debug, info, warn, error), invisibile nei deploy.
- **Fix suggerito:** `const parsed = LOG_LEVELS[process.env.POSTERIUM_LOG_LEVEL as LogLevel]; const CURRENT_LEVEL: number = parsed ?? LOG_LEVELS.info`.

### 13. Token config legacy invalidati dall'evoluzione dello schema Zod

- **File:** `src/lib/config-token.ts:20-38` (schema) e `:127-128` (`safeParse` strict)
- `configTokenSchema` ha campi obbligatori (`globalBadges`, `rankingBadges`, `blurEnabled`, …). Un token firmato prima dell'aggiunta di un campo (es. `logoFitEnabled`) **fallisce `safeParse` → torna `null`** → il link condiviso smette di funzionare in silenzio. Minor: il client rigenera i token a ogni edit, ma le URL già condivise si rompono.
- **Fix suggerito:** campi nuovi come `optional()` con default, o un `preprocess` di migrazione per i token legacy.

### 17. `GET /api/mappings/{id}` non valida `type`/`tmdbId` (chiave arbitraria)

- **File:** `src/app/api/mappings/[id]/route.ts:15-17`
- `const [type, tmdbIdStr] = id.split(":")` senza validazione: `getById("garbage", Number("x"))`
  → chiave `"garbage:NaN"` → 404 innocuo (lo store ritorna `null`), ma è un comportamento
  disallineato rispetto a PUT/DELETE che validano (`route.ts:30-32`). Nessun crash.
- **Fix suggerito:** applicare la stessa guardia di PUT/DELETE (`type ∈ {movie,tv}` e
  `Number.isInteger(tmdbId) && tmdbId > 0`).

### 18. `/api/mappings/export` bulk-read disponibile su istanza pubblica

- **File:** `src/app/api/mappings/export/route.ts:10-11` (`checkAdminToken` fail-open)
- Su istanza pubblica senza `ADMIN_TOKEN`, chiunque scarica **tutte le mappings** (titoli,
  poster_path, customBadge, accentColor, …). Non contengono segreti (le apiKeys stanno nei profili,
  non nei mapping) e sono comunque visibili via editor/catalogo → severità bassa; ma è una lettura
  bulk amministrativa che su un'istanza condivisa meriterebbe `requireAdminToken` (come DELETE
  profile/wipe-all) o un flag di consenso esplicito.
- **Nota:** `GET /api/mappings` (lista) usa lo stesso fail-open — lì è necessario all'editor.

### 19. `scryptSync` sincrono nel POST /api/profile → blocco dell'event loop

- **File:** `src/lib/profile-store.ts:79` (`crypto.scryptSync`) e `:84` (`verifyPassword`)
- `scryptSync` è CPU-bound e sincrono (~tensina di ms con i default N=16384). Il bucket `profile`
  (20 burst, `rate-limit.ts:50`) e il body cap 100KB (`read-body.ts:11`) limitano il volume, ma un
  burst di 20 richieste consecutive congela l'event loop ~1s su istanza condivisa; password vicine
  al body cap (~100KB) rendono lo scrypt più costoso (pre-hash lineare sulla lunghezza).
- **Fix suggerito:** `crypto.scrypt` async (promisificato) e/o `.max(128)` (o simile) sulla
  lunghezza della password nello schema della route.

---

## Osservazioni (non-bug, da confermare come design)

- **Backdrop copre il poster** — `src/lib/poster-service.ts:150`: il backdrop (opaco, full-canvas) viene composto **sopra** il poster base, nascondendolo del tutto (i layer finali: blur → backdrop → vignette → logo → badge). Se l'intento è "backdrop mode" (il poster è sostituito dall'immagine di scena) è corretto; altrimenti è un bug visivo. Da validare con `EditView.tsx`/`render-params.md` (che non documenta il parametro).
- **Rank JustWatch sempre "IT"** — `route.ts:545`: `getJWRankings(..., "IT")` ignora `lang`; coerente con i cataloghi (anch'essi IT), ma da verificare per installazioni non italiane.
- **Bucket rate-limit condiviso senza `POSTERIUM_TRUST_PROXY`** — `rate-limit.ts:112`: un solo consumatore aggressivo può 429 l'intera istanza. Tradeoff documentato (fail-safe anti-spoof), non un bug.
- **304-branch chiama `completePosterRender(null)`** — `route.ts:348-352`: finestra teorica (microsecondi) in cui un waiter coalesced riceve 503; probabilità trascurabile.

---

## Verificati come NON-issue (inclusi falsi positivi del review esterno)

### Dal mio audit (verifica diretta)

- **Timing negative cache corretto** — `writePosterError` è sincrona subito dopo `completePosterRender(null)`; il waiter coalesced legge l'errore prima di rispondere 503 (nessuna race).
- **SSRF nel proxy solida** — DNS-pin `safeLookup` (solo IP pubblici), `resolveAndCheckBlocked` su ogni redirect manuale, allowlist `POSTERIUM_PROXY_ALLOW_DOMAINS`.
- **`imgSrc` blocca immagini esterne** non-TMDB (`poster-render-helpers.ts:44-53`).
- **Ordering cache-key rotation corretto** — `rotateKey` calcolata dopo la rotazione del poster (`route.ts:179`).
- **`getFullProfileData`/`getProfile` validano la regex UUID** nei load path (`profile-store.ts:327-339`).
- **Rate limiting fail-safe** — senza `POSTERIUM_TRUST_PROXY=1` gli IP header non sono fidati (niente bypass spoofando XFF).

### Falsi positivi del review esterno (verificati: non sono bug)

- **accent-color RGBA** — `findAccentColor`/`topEdgeAverage` leggono sempre buffer **RGBA**: server via `ensureAlpha()` (`poster-render-helpers.ts:107`), client via `getImageData().data` (`useRootColors.ts:64`). `decodePosterRaw()` (RGB) alimenta solo il fit-scoring, mai queste funzioni. Nessun disallineamento.
- **`bottomGradientSVG` stop non monotoni** — l'aritmetica è corretta (fade=80 → `svgFadeEnd=0`, `svgSolidPct=20`), ma la funzione è **codice morto**: nessun call site, e `render-params.md:74` la dichiara "parametri morti… non reintrodurli". Zero impatto runtime.
- **`cacheInvalidatePosterDataFor` inefficace** — i poster sono taggati `poster:${type}:${tmdbId}` (`route.ts:808` → `writeCachedPoster` usa `["poster", mappingTag]`), quindi la funzione **invalida correttamente** il poster del mapping. I badge sono taggati solo `["badge"]` ma la chiave include tutti gli input (`poster-service.ts:279-284`) → mai un badge stale servito (self-healing). Al massimo i PNG badge restano in memoria fino al TTL.
- **ratings.ts "doppio slash"** — `MDBLIST = "https://mdblist.com/api"` (senza slash finale); `${MDBLIST}/${qs}` produce `.../api/?apikey=...` con **un solo slash**, URL valida. L'esempio del report mostra proprio l'output corretto come bug.
- **config-token `timingSafeEqual` su base64url** — confrontare le stringhe codificate è altrettanto constant-time che confrontare i byte decodificati: base64url è iniettiva, la lunghezza codificata è fissa e `config-token.ts:105` ha il length guard. Decodificare prima è stile, non sicurezza.
- **badge-priority `if (params.animeRank)` falsy su 0** — `animeRank` è 1-based (`idx+1` in entrambe le route); 0 non è mai un rank valido, il check è innocuo.
- **cache.ts: entry singola > MAX_BYTES** — tecnicamente possibile ma praticamente irraggiungibile: nessuna entry si avvicina a 135MB (poster ~200KB, immagini capped 10MB, cache TMDB contiene JSON non buffer). Suggerimento di robustezza, non bug.

---

## Note per l'eventuale fix

- Dopo modifiche ai file di render: rigenerare `RENDER_VERSION` (`node scripts/write-render-version.mjs`).
- Prima di chiudere: `npm run verify` (tsc + eslint + vitest + next build).
- Dopo modifiche ai parametri di resa: visual suite (skill `poster-sync`/`poster-visual`).

---

## Stato dei fix (2026-08-14)

Fix applicati e verificati (typecheck + unit test: 577/577 passano; `RENDER_VERSION` rigenerata
→ `6632564526`, `rv` aggiornata in AGENTS.md):

| Finding | Severità | Stato |
|---|---|---|
| 1 | CRITICO | ✅ Fix — profilo legacy senza password: aggiornamento richiede admin token (`profile/route.ts`) |
| 2 | ALTO | ✅ Fix — `profileId` validato come UUID (400 in route + guardia nel store) |
| 3 | ALTO | ✅ Fix — proxy inoltra i query param originali (esclusi `target`/`url`/`u`/`user`) |
| 4 | MEDIO | ✅ Fix — 404 entra in negative cache; waiter coalesced riceve 404 (non 503) |
| 5 | MEDIO | ✅ Fix — preview coalesced con header `no-store` (`isPreview` passato) |
| 6 | MEDIO | ✅ Fix — regex `accentColor` allineata a `isValidHex` (#rgb/#rrggbb) |
| 7 | MEDIO | ✅ Fix — `/api/mdblist/anime` usa `fetchMDBList` + `getDetails` (mock E2E, cache, rate limit condivisi) |
| 8 | BASSO | ✅ Fix — `customBadge` max 40 (schema server + `maxLength` client) |
| 9 | BASSO | ✅ Fix — apiKeys non cifrate con prefisso `plain:` + `unwrapApiKey` |
| 10 | BASSO | ✅ Fix — `isSameOrigin` fail-closed quando l'host non è risolvibile |
| 11 | BASSO | ✅ Fix — `RENDER_TIMEOUT_MS` clampato a 40s (= `maxDuration`) |
| 12 | BASSO | ✅ Fix — `POSTERIUM_LOG_LEVEL` non valido ripiega su `info` |
| 13 | BASSO | ✅ Fix — `logoFitEnabled` opzionale nello schema token (migrazione legacy, default = server default al render) |
| 14 | MEDIO | ✅ Fix — `resolveImdbToTmdb` usa `TMDB_BASE_URL` condivisa |
| 15 | MEDIO | ✅ Fix — `POST /api/profile` valida la config con `configTokenSchema` |
| 16 | MEDIO | ✅ Fix — `POSTERIUM_WARMUP_TOKEN` opzionale (header `x-warmup-token` o admin); entrypoint + README aggiornati |
| 17 | BASSO | ✅ Fix — `GET /api/mappings/{id}` valida `type`/`tmdbId` |
| 19 | BASSO | ✅ Fix — `scrypt` async (event loop libero) + password max 128 |
| 18 | BASSO | ⏸️ Non applicato — l'editor usa `/api/mappings/export` (`useMappingsStore.ts:38`): passare a `requireAdminToken` romperebbe l'export su istanza pubblica. Tradeoff deliberato, documentato |

**Nota:** il fix 1 rende gli aggiornamenti dei profili legacy passwordless operazioni riservate
(richiedono admin token). Su istanze pubbliche senza admin token un profilo legacy non è più
aggiornabile via API — comportamento di sicurezza intenzionale (l'UUID è pubblico nelle URL poster).
