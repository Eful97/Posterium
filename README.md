---
title: Posterium
emoji: 🖼️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8080
pinned: false
---

<p align="center">
  <img src="public/posterium.svg" alt="Posterium" width="400" />
</p>

<p align="center"><strong>Genera poster personalizzati</strong> di film e serie TV — loghi, badge trend, rating, premi e classifiche, renderizzati dinamicamente via API.</p>

---

## 📸 Screenshots

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Screenshot%202026-07-20%20164532.png" alt="Posterium Home" width="100%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Screenshot%202026-07-20%20164555.png" alt="Posterium Editor" width="100%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Screenshot%202026-07-20%20164624.png" alt="Posterium Badge" width="100%" />
</div>

---

## ✨ Features

- 🔍 **Ricerca TMDB** — Cerca film e serie TV in italiano e inglese
- 🌐 **Internazionalizzazione** — 5 lingue (Italiano, English, Français, Deutsch, Español) per badge e UI completa
- 🎯 **Loghi** — Seleziona loghi ufficiali puliti, posizionali con drag & drop e slider Scala/X/Y, filtro per lingua (Tutti/Italiano/English/Senza lingua) e fallback automatico su lingua originale
- 🔥 **Badge trend** — Classifica JustWatch, tendenze MDBList, badge semi-trasparenti adattivi con ombra proporzionale e text-shadow sincronizzato
- 🏷️ **Badge genere/rating** — Genere, •, ★ e voto medio, 6 stili (shadow/pill/bar/colored/bordo/vetro), con overflow protection, anno, accent color e text color adattivo
- 🎬 **Resa poster cinematografica (AAA Polish)** — Gradiente cromatico adattivo al colore dominante del film, vignettatura cinematografica sferica, bilanciamento vividezza/contrasto OLED, icone dorate per le valutazioni e doppie ombre 3D con bordi lucidi di contorno
- 🏆 **Badge ranking/extra & Nastro Netflix** — Classifica JustWatch, tendenze MDBList, badge personalizzati, 5 stili (default/bar/colored/pill/netflix) con il nastro rosso allineato in alto a sinistra per Netflix Top 10 / Top 3 e affiancamento automatico del logo network
- ✏️ **Badge personalizzato** — Sostituisci il badge automatico con testo libero, per ogni titolo individualmente
- 🎨 **Blur fondo** — Intensità, fade, oscurità regolabili, sincronizzato client ↔ server (sostituisce il gradiente)
- 📊 **Rating** — Media tra IMDb (da MDBList o OMDb) e TMDb (da TMDB), per un voto bilanciato e accurato
- 📋 **I miei poster** — Filtri per tipo (Film/Serie TV/Anime), ordinamento, ricerca, layout responsive
- 🔔 **Aggiornamenti automatici** — Badge versione in alto a sinistra, notifica nuove release da GitHub
- 🔄 **Rotazione poster clean 24h** — Seleziona più poster puliti e ruotali automaticamente ogni 24 ore, con opzione globale nelle impostazioni predefinite
- 🧠 **Scoring automatico poster** — Algoritmo di fit scoring (pulizia, contrasto, dettaglio, badge, composito) con analisi edge a griglia stride-4, skin-tone detection, gradient smoothness, penalità crediti (righe alternante chiaro/scuro) e varianti offset Y per robustezza
- 🚫 **Blacklist poster esclusi** — Escludi singoli poster dalla selezione/rotazione per ogni titolo, con salvataggio immediato
- ⚙️ **Impostazioni globali** — Salva stili badge (tutti i 6 stili genere e 5 stili ranking incluso Netflix), blur e rotazione come predefiniti applicati a tutti i nuovi salvataggi
- 🏆 **Badge premi** — Vincitore e Candidato Oscar, Cannes, Venezia, BAFTA, Golden Globe, Emmy, David da Wikidata
- 🎬 **Badge franchise** — Marvel Cinematic Universe, Harry Potter, James Bond e 52 saghe da Wikidata (tradotte in italiano)
- 🎥 **Badge regista** — Di Hitchcock, Di Nolan, Di Fellini e 71 registi IMDb Top 70 da Wikidata
- 📡 **Badge network** — Netflix, HBO, Disney+, Prime Video, Rai, Mediaset e altri da TMDB
- 🎌 **Anime rank** — Top trending anime da MDBList *(richiede chiave MDBList)*
- 📐 **Server-side rendering** — Resvg (SVG → PNG) per badge, Sharp per poster/logo/backdrop
- 🚀 **Poster ottimizzati per Stremio** — Output JPEG 500×750, URL versionati con `rv`, ETag e header CDN/stale-while-revalidate
- 🐳 **Docker** — Deployabile su HF Spaces, Vercel, server proprio
- ⚡ **Standalone output** — Next.js standalone per immagini Docker minime
- 💾 **Runtime cache poster** — Cache in memoria con stale refresh, coalescing dei render duplicati e warmup dei poster salvati
- 🗑️ **Svuota cache** — Pulsante nelle impostazioni per forzare la pulizia della cache in memoria
- 🧩 **UI condivisa** — Componenti riutilizzabili: BadgeStyleSelector, SecretInput, MenuItem, SectionCard (design system)
- ✅ **253 test** — Suite di test su URL builder, cache, badge priority, types, mappings, storage persistente, header CDN, versioning, compositing poster, parametri Stremio, scoring poster-fit

---

## 🚀 Quick Start

```bash
git clone https://github.com/Eful97/Posterium
cd posterium
npm install
echo TMDB_API_KEY=la_tua_chiave > .env.local
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

### Docker

```bash
docker build -t posterium .
docker run -p 8080:8080 -e TMDB_API_KEY=la_tua_chiave posterium
```

### Koyeb (gratis, senza carta)

1. Crea un account su [koyeb.com](https://koyeb.com) — **nessuna carta di credito**.
2. Crea una **new App** → **GitHub** → seleziona `Eful97/Posterium`.
3. Builder: **Dockerfile**. Lascia tutto come default.
4. **Environment Variables** (obbligatorie):

   | Variabile | Valore |
   |---|---|
   | `TMDB_API_KEY` | `la_tua_chiave_tmdb` |
   | `MDBLIST_API_KEY` | `la_tua_chiave_mdblist` |
   | `OMDB_API_KEY` | `la_tua_chiave_omdb` |

5. **Deploy**. Dopo ~3 min l'app è su `https://posterium-{random}.koyeb.app`.

#### Verifica rapida

```bash
curl https://posterium-tuo-nome.koyeb.app/api/health
```

Risposta: `"status":"healthy"` = tutto funziona.

#### URL Stremio

```
https://posterium-tuo-nome.koyeb.app/manifest.json
```

#### Note

- **Storage effimero** — i mapping salvati si perdono a ogni redeploy. Per mantenerli, aggiungi Upstash Redis (gratis, 10 KB):
  ```
  KV_REST_API_URL=https://xxx.upstash.io
  KV_REST_API_TOKEN=AXxx...
  ```
- **Auto-deploy** — Koyeb rebuilda a ogni push su `master`. Le variabili d'ambiente restano impostate.

---

### 📱 Termux (telefono Android)

Trasforma un telefono vecchio in un server Posterium 24/7 — **zero canone mensile**.

#### Requisiti

- Android 8+ con **2+ GB RAM**
- **50+ GB batteria** o telefono sempre in carica
- Installare [Termux da F-Droid](https://f-droid.org/packages/com.termux/) **⚠️ NON dal Play Store** (versione obsoleta)

#### Setup rapido

Apri Termux e incolla:

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
git clone https://github.com/Eful97/Posterium
cd Posterium
npm install --ignore-scripts
```

Poi crea le API key:

```bash
cat > .env.local << EOF
TMDB_API_KEY=la_tua_chiave_tmdb
MDBLIST_API_KEY=la_tua_chiave_mdblist
OMDB_API_KEY=la_tua_chiave_omdb
EOF
```

Build e avvia:

```bash
npm run build
npm start
```

Ora Posterium è in rete locale: `http://{ip-del-telefono}:3000`

#### Esporre su internet (opzionale)

| Metodo | Comando | Limiti free |
|---|---|---|
| **Cloudflare Tunnel** | `pkg install cloudflared` → `cloudflared tunnel --url http://localhost:3000` | Illimitato |
| **Ngrok** | `pkg install ngrok` → `ngrok http 3000` | 40 req/min |
| **Tailscale** | `pkg install tailscale` → `tailscale up` | Rete VPN privata |

#### Tenerlo sempre acceso

```bash
# Evita sleep del telefono
pkg install termux-services
sv-enable node

# Avvio automatico all'accensione (root opzionale)
pkg install termux-boot
mkdir -p ~/.termux/boot
echo 'cd ~/Posterium && npm start' > ~/.termux/boot/start-posterium
chmod +x ~/.termux/boot/start-posterium
```

#### Limiti reali

| Cosa | Come gestirlo |
|---|---|
| 🔌 Batteria | Tieni il telefono sempre in carica |
| 🌙 Schermo | Lascialo spento — Termux gira in background |
| 🌐 IP dinamico | Usa **Cloudflare Tunnel** o **DDNS** (noip.com) |
| 📱 RAM 2GB | Sufficiente per uso personale |
| 💾 Storage | 16 GB bastano |

#### URL Stremio

Se usi Cloudflare Tunnel:
```
https://tuo-tunnel.cloudflare.com/manifest.json
```

---

## Debug e cache

Posterium espone alcuni endpoint utili per controllare lo stato dell'app in produzione.

### Health

```bash
curl https://TUO-DOMINIO/api/health
```

Mostra stato TMDB, JustWatch, FlixPatrol e storage (file o KV).

### Cache status

```bash
curl https://TUO-DOMINIO/api/cache/status
```

Risposta esempio:

```json
{
  "totalEntries": 12,
  "taggedEntries": [
    { "tag": "catalog", "count": 3 },
    { "tag": "poster", "count": 5 },
    { "tag": "stremio", "count": 3 },
    { "tag": "tmdb", "count": 4 }
  ],
  "untaggedEntries": 0
}
```

Se dopo un salvataggio vedi `catalog > 0`, il warmup sta funzionando.

### Svuotare cache

```bash
curl -X POST https://TUO-DOMINIO/api/cache/clear
```

### Con ADMIN_TOKEN

Se hai configurato `ADMIN_TOKEN`, usa uno di questi header:

```bash
curl -H "x-admin-token: TUO_TOKEN" https://TUO-DOMINIO/api/cache/status
curl -H "Authorization: Bearer TUO_TOKEN" https://TUO-DOMINIO/api/cache/status
curl -X POST -H "x-admin-token: TUO_TOKEN" https://TUO-DOMINIO/api/cache/clear
```

### Pagina status

Apri `https://TUO-DOMINIO/status` per vedere in un colpo d'occhio:

- servizi esterni (TMDB, JustWatch, FlixPatrol)
- storage attivo (file o KV)
- numero poster salvati
- stato cache (entry per tag)

> **Nota:** la cache è in memoria. Su ogni restart/redeploy parte vuota e si ripopola con le prime richieste o con il warmup dopo un salvataggio. Su Koyeb, anche se Upstash mantiene i mapping, la cache runtime torna vuota dopo restart.

---

## Troubleshooting Stremio

### Stremio mostra ancora il poster vecchio

Controlla in ordine:

1. Salva di nuovo il poster da Posterium.
2. Controlla lo status cache:
   ```bash
   curl https://TUO-DOMINIO/api/cache/status
   ```
3. Se hai dubbi, svuota la cache runtime:
   ```bash
   curl -X POST https://TUO-DOMINIO/api/cache/clear
   ```
   Con ADMIN_TOKEN:
   ```bash
   curl -X POST -H "x-admin-token: TUO_TOKEN" https://TUO-DOMINIO/api/cache/clear
   ```
4. Apri direttamente l'URL poster generato da Posterium nel browser per verificare il rendering.
5. Se usi un CDN davanti a Posterium, svuota anche la cache del CDN.
6. In Stremio, forza refresh del catalogo o reinstalla il catalogo se hai cambiato dominio.

### Dopo un redeploy i poster salvati spariscono

Se succede, i mapping non stanno usando storage persistente. Su Koyeb consigliato:

```
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=AXxx...
```

Poi verifica:
```bash
curl https://TUO-DOMINIO/api/health
```

Nel campo `storage` dovresti vedere `mode: "kv"`.

### /status mostra cache vuota

È normale dopo restart/redeploy. La cache è in memoria e si ripopola quando:

- apri cataloghi Stremio
- generi poster
- salvi un poster (avvia warmup in background)

### /api/cache/status ritorna Unauthorized

Hai configurato `ADMIN_TOKEN`. Usa:

```bash
curl -H "x-admin-token: TUO_TOKEN" https://TUO-DOMINIO/api/cache/status
```

oppure:

```bash
curl -H "Authorization: Bearer TUO_TOKEN" https://TUO-DOMINIO/api/cache/status
```

### Stremio non usa i poster best fit

Il best fit automatico funziona anche senza salvataggio, ma salvare il poster rende il risultato stabile e persistente. Controlla:

1. In impostazioni globali, abilita compatibilità logo automatica.
2. Apri un titolo non salvato e verifica che il best fit venga selezionato.
3. Salva il poster se vuoi fissare quel setup.
4. Controlla che il catalogo Stremio punti al dominio Posterium giusto.
5. Se vedi ancora il primo poster TMDB, svuota cache runtime e CDN.

---

## 🔑 Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|-----------|:----------:|-------------|
| `TMDB_API_KEY` | ✅ | Chiave API TMDB v3 |
| `MDBLIST_API_KEY` | ❌ | Rating IMDb da MDBList (mediato con TMDB) e classifiche anime. Priorità massima. |
| `OMDB_API_KEY` | ❌ | Rating IMDb — fallback quando MDBList non disponibile (mediato con TMDB). Senza chiave, usa solo voto TMDB. |
| `KV_REST_API_URL` | ❌ | URL REST API Upstash Redis (da dashboard Upstash). Attiva storage KV per mappings/cache. |
| `KV_REST_API_TOKEN` | ❌ | Token Upstash Redis (da dashboard Upstash). Serve insieme a `KV_REST_API_URL`. |
| `ADMIN_TOKEN` | ❌ | Token per proteggere endpoint admin (cache clear). Se non impostato, aperto. |
| `WIKIDATA_TIMEOUT` | ❌ | Timeout query Wikidata in ms (default: 4000). Se i badge premi/franchise/regista non compaiono, aumenta a 6000. |
| `POSTERIUM_DATA_DIR` | ❌ | Directory dati (default: `./data`). Su Koyeb il filesystem e' effimero — usa storage esterno (R2/Supabase). |
| `NEXT_PUBLIC_POSTER_CDN_URL` | ❌ | Dominio CDN pubblico da usare negli URL poster installati su Stremio, es. `https://poster-cdn.example.com`. |
| `POSTER_CDN_URL` | ❌ | Variante server-side del dominio CDN, usata dal warmup se non vuoi esporla nel bundle client. |

---

## ⚡ Performance Stremio

Per massimizzare la velocità di caricamento dei poster su Stremio:

1. Imposta `NEXT_PUBLIC_POSTER_CDN_URL` con un dominio pubblico stabile davanti all'app (Cloudflare, reverse proxy o CDN equivalente).
2. Reinstalla il catalogo Stremio dopo ogni cambio dominio/CDN, così gli URL poster puntano al nuovo host.
3. Dopo deploy o import massivo, lancia `POST /api/warmup` con `Authorization: Bearer <ADMIN_TOKEN>` se il token è configurato.
4. Mantieni gli URL versionati generati dall'app: il parametro `rv` permette cache immutable e refresh pulito quando cambia il render.
5. Lascia l'output poster a 500×750: riduce peso e tempo di trasferimento senza perdere resa utile in Stremio.

Esempio warmup:

```bash
curl -X POST "https://tuo-dominio/api/warmup?limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 📡 API

### `GET /api/poster/[type]/[id]`

Genera un poster personalizzato via URL.

| Parametro | Descrizione | Esempio |
|-----------|-------------|--------|
| `api_key` | Chiave TMDB | `?api_key=xxx` |
| `poster` | Percorso poster | `?poster=/abc123.jpg` |
| `logo` | Percorso logo | `?logo=/logo123.png` |
| `scale` | Scala logo (10–100) | `?scale=75` |
| `ox` / `oy` | Offset logo | `?ox=10&oy=-5` |
| `backdrop` | Percorso backdrop | `?backdrop=/bg.jpg` |
| `bscale` | Scala backdrop (10–200) | `?bscale=100` |
| `box` / `boy` | Offset backdrop | `?box=0&boy=0` |
| `genreName` | Nome genere | `?genreName=Thriller` |
| `voteAverage` | Voto medio | `?voteAverage=7.5` |
| `rank` | Posizione classifica | `?rank=4` |
| `label` | Etichetta classifica | `?label=Today` |
| `extra` | Badge speciale | `?extra=New+series` |
| `bs` | Stile badge genere | `?bs=pill` (shadow/pill/bar/colored/bordo/vetro) |
| `rs` | Stile badge ranking | `?rs=netflix` (default/bar/colored/pill/netflix) |
| `badges` | Mostra badge genere | `?badges=1` |
| `ranking` | Mostra badge trend | `?ranking=1` |
| `lang` | Lingua (it/en/fr/de/es) | `?lang=it` |
| `gradHeight` | Altezza blur (5–100%) | `?gradHeight=30` |
| `blur` | Intensità blur (1–50px) | `?blur=5` |
| `bf` | Fade blur (0–100%) | `?bf=60` |
| `bd` | Oscurità blur (0–100%) | `?bd=40` |
| `be` | Abilita blur (0/1) | `?be=0` |
| `tl` | Forza tema chiaro (1/0) | `?tl=1` |
| `ac` | Accent color override | `?ac=%23ff6430` |

**Esempio:** `/api/poster/tv/260592?api_key=xxx&rank=4&genreName=Animazione&voteAverage=8.2&rs=netflix`

### Altri endpoint

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/health` | Stato servizi |
| `GET /api/trending/rank` | Classifica JustWatch |
| `GET /api/awards/[type]/[id]` | Premi, nomination, franchise, studio (Wikidata P166, P1411, P179) |
| `GET /api/mdblist/anime` | Top anime MDBList |
| `POST /api/mappings` | Salva configurazione |
| `POST /api/poster-fit` | Scoring poster — analisi avanzata con edge grid stride-4, skin-tone detection, gradient smoothness, penalità crediti e offset Y variants; fino a 12 candidati |
| `POST /api/cache/clear` | Svuota la cache in memoria *(protetta da `ADMIN_TOKEN` se impostato)* |
| `POST /api/warmup` | Pre-genera poster salvati e URL Stremio per riempire runtime cache/CDN |

---

## 🎨 Badge System

### Priorità badge top

1. 📅 **In Arrivo / Prossima Uscita** — Uscita programmata
2. 🎌 **Anime rank** — MDBList top anime *(richiede `MDBLIST_API_KEY`)*
3. 🔥 **Trend rank** — JustWatch Italia
4. 🆕 **Nuovo film / Nuova serie** — <2 settimane dalla release
5. 🏆 **Vincitore** — Oscar, Cannes, Venezia, BAFTA, Golden Globe, Emmy, David (Wikidata P166)
6. 🏅 **Candidato** — Nomination premi (Wikidata P1411)
7. 📡 **Studio** — A24, Studio Ghibli, Columbia Pictures e altri (TMDB)
8. 🎥 **Di [Regista]** — 66 registi IMDb Top 70 (Wikidata P57)
9. 🏷️ **Sottogenere** — Viaggi nel Tempo, Cyberpunk, Giallo col Delitto, Horror Slasher, Film di Rapina, Paranormale, Post-Apocalittico, Supereroi e altri
10. 📺 **Fallback Extra** — Miniserie, In corso, Il più votato (voto aggregato ≥ 8.5)

### Badge genere/rating

Badge con genere, •, ★ e voto medio centrato in basso, con 6 stili:
- **Shadow** — testo con ombra pronunciata, nessuno sfondo
- **Pill** — pillola semi-trasparente con angoli arrotondati
- **Bar** — barra full-width in basso con sfondo scuro e bordo superiore
- **Colored** — pillola colorata con il colore dominante del poster/logo, testo bianco/nero adattivo
- **Bordo** — testo pulito con bordo di contorno sottile
- **Vetro** — effetto glassmorphism satinato trasparente

### Badge ranking/extra

Badge in alto, 5 stili:
- **Default** — pillola semi-trasparente con ombra centrata in alto
- **Bar** — barra full-width in alto, più sottile
- **Colored** — pillola colorata con il colore dominante, testo adattivo
- **Pill** — pillola moderna arrotondata
- **Netflix** — nastro verticale rosso allineato in alto a sinistra (TOP 10 / TOP 3), con affiancamento automatico del logo network ed elisione dei badge testuali duplicati, con fallback allo stile default se non in classifica

Il testo del badge ranking/extra si adatta automaticamente alla larghezza. Rendering SVG server-side con Resvg.

### Logo

Massimo 25% dell'altezza del poster, scala automatica al cambio logo. Trascinabile con il mouse (drag & drop). Slider Scala/X/Y per regolazioni fini, doppio click per reset. Filtro per lingua (Tutti/Italiano/English/Senza lingua) con chip interattivi.

---

---

## 🏗️ Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 16 |
| UI | React 19 + Tailwind CSS 4 |
| Rendering | Resvg (SVG badge) + Sharp (poster/logo/backdrop) |
| Immagini | Sharp |
| Font | Inter + Noto Sans Symbols 2 |
| Dati | TMDB API + Wikidata SPARQL |
| Storage | Upstash Redis (KV) / Cloudflare R2 (poster) / JSON file |
| Test | Vitest (244 test) + Playwright E2E |
| UI Library | Componenti condivisi (BadgeStyleSelector, SecretInput, MenuItem, SectionCard) |

### Architettura

- **Hook modulari** — `useNavigation`, `useTrending`, `useSearch`, `useMappingsStore`, `useDefaults`, `usePosterSave`, `usePosterFit`, `useOutsideDismiss`
- **API client centralizzato** — `http.ts` con timeout, retry, error handling
- **URL builder puro** — `poster-url.ts` (buildPreviewUrl, buildUrlPattern)
- **Badge priority** — `badge-priority.ts` (computeBadge, computeExtraFallback)
- **Poster runtime cache** — `poster-runtime-cache.ts` con ETag, header CDN, stale refresh e coalescing in-flight
- **Poster render helpers** — `poster-render-helpers.ts` centralizza fetch immagini, clipping layer, compositing, luminanza e colore accent
- **URL Stremio versionati** — `stremio-poster-params.ts` aggiunge `rv` stabile per cache immutable/CDN
- **Cache generica** — In-memory con TTL, stale reads e tag-based invalidation

---

## 🧪 Testing

```bash
# Test unitari (244 test)
node .\node_modules\vitest\vitest.mjs run

# E2E smoke (Playwright, Chromium)
node .\node_modules\@playwright\test\cli.js test e2e/posterium-smoke.spec.ts
```

> **Nota Windows:** evitare `npm test` / `npx` se il wrapper globale e' rotto — usare i comandi diretti come sopra.

| File test | Test | Copertura |
|---|---|---|
| `poster-url.test.ts` | 33 | buildUrlPattern, buildPreviewUrl, CDN base URL, URL params, badge, logo, backdrop, topLight |
| `catalog-definitions.test.ts` | 2 | Single source for catalog IDs, manifest sync |
| `warmup-catalog.test.ts` | 5 | Warmup logic on save/import |
| `cache-status-api.test.ts` | 4 | Cache debug endpoints auth and data |
| `catalog-route.test.ts` | 3 | Stremio catalog generation and poster URLs |
| `cache.test.ts` | 14 | cacheGet/Set, TTL expiry, cacheGetStale, cacheInvalidate, cacheClear |
| `poster-runtime-cache.test.ts` | 2 | Header CDN immutable e stale-while-revalidate |
| `app-version.test.ts` | 1 | Versione generata allineata a package.json |
| `data-dir.test.ts` | 1 | Directory dati configurabile per volume persistente |
| `store.test.ts` | 2 | Ricarica mapping da disco tra worker/server, concurrent upsert |
| `poster-render-helpers.test.ts` | 3 | Clipping layer, dimensioni finali 500x750 e luminanza top-edge |
| `stremio-poster-params.test.ts` | 2 | Parametri poster Stremio versionati e default globali |
| `types.test.ts` | 14 | toSearchResult (default values, null->undefined, media_type normalization) |
| `badge-validation.test.ts` | 18 | computeBadge priority chain, computeExtraFallback |
| `mapping-crud.test.ts` | 11 | CRUD mappings, validation schema |
| `mapping-null-put.test.ts` | 2 | PUT null fields (logoPath, backdropPath, customBadge, badgeExtra) |
| `svg-badge.test.ts` | 23 | Rendering badge SVG, overflow protection, stili e dimensioni |
| `http.test.ts` | 2 | Timeout/retry HTTP client |
| `logo-layout.test.ts` | 2 | Dimensioni e bounds logo |
| `poster-fit-score.test.ts` | 10 | Scoring poster-fit base (pulizia, contrasto, dettaglio, badge) |
| `poster-fit-api.test.ts` | 9 | Endpoint API poster-fit, candidate pool (12 max), timeout, skip failed |
| `poster-auto-fit.test.ts` | 16 | Auto-fit server-side, candidate selection, ranking, caching, offset Y variants |
| `health.test.ts` | 3 | Health endpoint, storage diagnostics |
| `defaults-api.test.ts` | 4 | Defaults endpoint auth, validation |
| `EditView.test.tsx` | 8 | Hero section, studio badge, badge selector, internazionalizzazione |

---

## 🙏 Credits

Ispirato da e basato su [erdb](https://github.com/realbestia1/erdb) di realbestia1, distribuito sotto licenza AGPL v3.
