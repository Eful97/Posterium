# Changelog

## [Unreleased]

### Changed
- **APP_VERSION automatica**: `scripts/write-app-version.mjs` torna a `1.0.<commit count>` (`git rev-list --count HEAD`), fallback a `package.json` quando git non disponibile — versione nuova ad ogni push senza bump manuale

### Removed
- **Ricerca Groq AI** (`src/lib/groq.ts`, `src/app/api/ai/search`, fallback `aiSearchFallback` in `catalog-handler.ts`, stati `isAiSearch`/`aiExplanation`/`aiModel`, UI `SearchBar`/`SearchView`): rimossa perché non affidabile — ricerca ora solo TMDB standard

## [1.0.10] - 2026-08-28

### Added
- Toast notification system with error/warning/success support
- Global ToastProvider in AppShell
- Service errors tracking (TMDB unavailable detection + banner)
- ARIA labels on EditorPanel, preview frame, poster tiles
- Keyboard navigation for tab panels (ArrowLeft/ArrowRight)
- Focus trap in mobile SettingsPanel
- Skip-to-main-content link in layout
- "Export as file" download button in settings
- Anime TMDB fallback when MDBList key is empty
- Light mode toggle in settings panel
- Context splitting: useBadgeContext, usePosterContext, useAppContext
- docs/BADGES.md documentation for badge extension
- **Config token per-link** (`?config=<token>`): configurazione completa del poster firmata HMAC-SHA256, condividibile cross-device
- **Classifiche FlixPatrol Top 10** con supporto multi-paese
- **Pagina `/status`** con stato TMDB, streaming (JustWatch/FlixPatrol) e storage
- **Hardening render pipeline**: slot limiter anti-OOM, deadline complessivo con watchdog, negative cache, TTL dinamico per poster non-mappati
- **RENDER_VERSION auto-generata**: invalidazione cache e URL Stremio automatiche al cambio dei file di rendering

### Changed
- **Ottimizzazione render non-mappato (P1)**: `getImages` ora parte in parallelo con `getDetails`/`getExternalIds`; `original_language` entra solo in un retry condizionato (titoli senza poster/logo nelle lingue base) invece che in ogni richiesta
- **Riuso del logo dal best-fit**: il logo scaricato durante il logo-fit non viene più re-fetchato nel Block A (fallback su cache hit / timeout del logo)
- **Cap worst-case ridotti**: auto-fit 2s→1.2s, Wikidata 4s→2.5s, attesa rating 2s→1.5s; `RATING_WAIT_MS` ora env-overridable (`POSTERIUM_RATING_WAIT_MS`, condiviso con la route tmdb-details)
- **Blur come overlay del composite finale**: eliminato il roundtrip PNG `blur → modulate` (1 decode + 1 encode totali invece di 2 roundtrip)
- **Warmup post-deploy automatico**: entrypoint lancia `/api/warmup` in background dopo il boot (poll su `/api/health`); disattivabile con `POSTERIUM_SELF_WARMUP=0`
- **`AbortSignal.any`** in `fetchImg`/MDBList: il timeout interno non è più bypassato quando arriva un signal esterno
- Improved tab chip contrast (zinc-400 → zinc-300)
- Badge cache key normalization (voteAverage rounded to 1 decimal)
- Tab chips use role="tablist" + aria-selected for accessibility
- useSearch shows toast on search failure
- Badge genere/rating componibile: componenti (genere/anno/voto) attivabili singolarmente, con persistenza dei default nelle Impostazioni
- Route admin: aperte in dev (`NODE_ENV=development`) senza token, fail-closed in produzione senza flag esplicito
- Warmup `/api/warmup`: fail-open solo su istanza pubblica esplicita, con rate limit e check CSRF
- Rate limit: tabella chiavi capped a 50k con eviction FIFO
- Rating IMDb: esclusivamente da MDBList (rimosso il fallback OMDb)
- Loghi network: aggiunti Sky/NOW, Mediaset Infinity, Tubi e Pluto TV
- Persistenza su Vercel: KV obbligatorio per i salvataggi (filesystem read-only)

### Removed
- Fallback OMDb per i rating
- **Chiavi API d'istanza** (sezione Impostazioni + fallback server in `getServerDefaults`): le chiavi TMDB/MDBList sono ora solo personali — dalla richiesta (`x-api-key`/`api_key`/`mdblist_key`) o dal fallback d'istanza opt-in (`POSTERIUM_TMDB_KEY`/`POSTERIUM_MDBLIST_KEY` per deploy single-user). Niente più chiave condivisa di default: senza chiave esplicita né fallback le chiamate falliscono. (Nota: il riferimento al "profilo (`?u=`)" della stesura originale era errato — `?u=` è solo identità/tracking, non fornisce chiavi; nessun profile store è mai esistito.)

### Fixed
- Orphan fetch MDBList dopo la race del rating: `AbortController` dedicato abortito subito dopo la race (prima un signal mai abortito lasciava il fetch in background)
- Image loading failures show toast notification
- TMDB fetch failures tracked in serviceErrors state
- Id metadati cataloghi risolvibili (`tt...`/`tmdb:`) nei Top 20 JustWatch
- Race mtime sui mapping scritti da un altro worker
- Slot wait default 15s — poster mancanti nelle griglie catalogo
- Snapshot `/status` riallineati dopo rimozione della sezione System
- Carousel demo: passata la chiave personale come `api_key` (fix poster 404 locali `TMDB API key is missing`)
- `PUT /api/defaults`: merge parziale invece di replace + scrittura attesa prima della 200 (salvare un campo non cancella più gli altri default)

## [0.15.2] - 2026-07-21

### Changed
- Redesign del nastro Netflix top rank
- Preview cache-busting
- Selectors delle global settings aggiornati

## [0.15.1] - 2026-07-21

### Added
- Algoritmo colore accent generativo + color picker nell'editor
- Esempi poster clean in home con parametro `logoFit`

### Changed
- Rating: media IMDb + TMDB via MDBList
- Health check migrato a `/api/health` (da `/api/live`)
- Header CORS su manifest e cataloghi

### Fixed
- Cache mismatch del badge ranking anime (cache key da proprietà TMDB)
- Selezione best-fit poster nella route Stremio senza mapping
- Auto-scroll del carousel dopo i click sulle frecce
- Warning ESLint e timeout auto-fit aumentato

## [0.15.0] - 2026-07-19

### Added
- **analyzeLumaWithGrid** — edge detection a stride 4px con griglia calore per penalizzare dettagli sotto il logo
- **Skin-tone detection** — cerca pixel pelle nel bottom 35% del poster, penalizza se il logo si sovrappone a volti/busti
- **Gradient smoothness** — confronta mean top/bottom half della safety area, penalizza gradienti brusci
- **Text penalty migliorato** — rilevamento crediti cinematografici con pattern alternante chiaro/scuro in computeTextPenalty
- **Offset Y variants** — valuta 3 posizioni verticali ([-20, 0, +20]), punteggio finale = 70% base + 30% worst-case
- **Candidati aumentati** — TMDB_CANDIDATE_COUNT da 8 a 12 per pool più ampio
- **Supporto "Prime Video"** in NETWORKS per matchare etichette Wikidata senza "Amazon"
- **Fallback studios da Wikidata** — awards API ora restituisce studios; se TMDB non ha networks, il client usa wikidata

### Changed
- computeTextPenalty ora usa weighting: density 0.25 + edge 0.25 + pattern 0.20 + textLineScore 0.30
- scorePosterLogoFit integra gradualmente tutte le nuove metriche nello score composito

### Fixed
- Duplicato "Ritorna" nel dropdown badge rimosso (params.extra era aggiunto due volte in getAllBadgeOptions)
- Badge studio mostrava "Ritorna" invece del network per titoli senza networks TMDB (fallback a wikidata)
- Offset Y variants threadato attraverso rankBestFitPosters, poster-auto-fit e API route
