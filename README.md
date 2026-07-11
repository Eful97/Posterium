---
title: Posterium
emoji: 🖼️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 3000
pinned: false
---

<p align="center">
  <img src="public/posterium.svg" alt="Posterium" width="400" />
</p>

<p align="center"><strong>Genera poster personalizzati</strong> di film e serie TV — loghi, badge trend, rating, premi e classifiche, renderizzati dinamicamente via API.</p>

---

## ✨ Features

- 🔍 **Ricerca TMDB** — Cerca film e serie TV in italiano e inglese
- 🌐 **Internazionalizzazione** — 5 lingue (Italiano, English, Français, Deutsch, Español) per badge e UI completa
- 🎯 **Loghi** — Seleziona loghi ufficiali puliti, posizionali con drag & drop e slider Scala/X/Y, filtro per lingua (Tutti/Italiano/English/Senza lingua)
- 🔥 **Badge trend** — Classifica JustWatch, tendenze MDBList, badge semi-trasparenti adattivi con ombra proporzionale e text-shadow sincronizzato
- 🏷️ **Badge genere/rating** — Genere, •, ★ e voto medio, 4 stili (shadow/pill/bar/colored), con overflow protection, anno, accent color e text color adattivo
- 🏆 **Badge ranking/extra** — Classifica JustWatch, tendenze MDBList, badge personalizzati, 3 stili (default/bar/colored)
- ✏️ **Badge personalizzato** — Sostituisci il badge automatico con testo libero, per ogni titolo individualmente
- 🎨 **Blur fondo** — Intensità, fade, oscurità regolabili, sincronizzato client ↔ server (sostituisce il gradiente)
- 📊 **Rating** — Media da 9 fonti: IMDb, TMDb, Metacritic, Rotten Tomatoes (critica + pubblico), Letterboxd, Trakt, MyAnimeList, Kitsu via MDBList
- 📋 **I miei poster** — Filtri per tipo (Film/Serie TV/Anime), ordinamento, ricerca, layout responsive
- 🔔 **Aggiornamenti automatici** — Badge versione in alto a sinistra, notifica nuove release da GitHub
- 🔄 **Rotazione poster clean 24h** — Seleziona più poster puliti e ruotali automaticamente ogni 24 ore, con opzione globale nelle impostazioni predefinite
- 🧠 **Scoring automatico poster** — Algoritmo di fit scoring (pulizia, contrasto, dettaglio, badge) per selezionare il poster migliore, con ordinamento TMDB/Best fit
- 🚫 **Blacklist poster esclusi** — Escludi singoli poster dalla selezione/rotazione per ogni titolo, con salvataggio immediato
- ⚙️ **Impostazioni globali** — Salva stili badge, blur e rotazione come predefiniti applicati a tutti i nuovi salvataggi
- 🏆 **Badge premi** — Vincitore e Candidato Oscar, Cannes, Venezia, BAFTA, Golden Globe, Emmy, David da Wikidata
- 🎬 **Badge franchise** — Marvel Cinematic Universe, Harry Potter, James Bond e 52 saghe da Wikidata (tradotte in italiano)
- 🎥 **Badge regista** — Di Hitchcock, Di Nolan, Di Fellini e 71 registi IMDb Top 70 da Wikidata
- 📡 **Badge network** — Netflix, HBO, Disney+, Prime Video, Apple TV+, Rai, Mediaset e altri da TMDB
- 🎌 **Anime rank** — Top trending anime da MDBList *(richiede chiave MDBList)*
- 📐 **Server-side rendering** — Resvg (SVG → PNG) per badge, Sharp per poster/logo/backdrop
- 🚀 **Poster ottimizzati per Stremio** — Output JPEG 500×750, URL versionati, ETag e header CDN/stale-while-revalidate
- 🐳 **Docker** — Deployabile su HF Spaces, Vercel, server proprio
- ⚡ **Standalone output** — Next.js standalone per immagini Docker minime
- 💾 **Runtime cache poster** — Cache in memoria con stale refresh, coalescing dei render duplicati e warmup dei poster salvati
- 🗑️ **Svuota cache** — Pulsante nelle impostazioni per forzare la pulizia della cache in memoria
- 🧩 **UI condivisa** — Componenti riutilizzabili: BadgeStyleSelector, SecretInput, MenuItem, SectionCard (design system)
- ✅ **145 test** — Suite di test su URL builder, cache, badge priority, types, mappings, storage persistente, header CDN, versioning, compositing poster, parametri Stremio, scoring poster-fit

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
docker run -p 3000:3000 -e TMDB_API_KEY=la_tua_chiave posterium
```

### Hugging Face Spaces

Deploy Docker-only: su HF Spaces carichi solo **2 file** (`Dockerfile` + `README.md`), il codice viene clonato da GitHub durante la build.

#### Setup iniziale

1. Crea uno Space su [huggingface.co/new-space](https://huggingface.co/new-space) con SDK **Docker**
2. Carica solo questi 2 file:
    - `Dockerfile` — clona il repo da GitHub a un commit specifico (`POSTERIUM_COMMIT`), builda Next.js, deploya
    - `README.md` — frontmatter HF (`sdk: docker`, `app_port: 3000`)
 3. Nelle **Settings** dello Space → **Variables and secrets** → aggiungi `TMDB_API_KEY` come secret

#### Aggiornamenti

Per aggiornare lo Space HF:

1. Pusha le modifiche su GitHub
2. Modifica l'`ARG POSTERIUM_COMMIT` nel `Dockerfile` con l'ultimo commit hash (`git rev-parse HEAD`)
3. Pusha il `Dockerfile` aggiornato
4. Fai **Factory rebuild** nello Space HF

> **Nota:** il deploy è **deterministico** — builda sempre lo stesso commit. Per aggiornare, devi cambiare il pin del commit nel Dockerfile.

#### Persistenza poster

Il filesystem di HF Spaces è effimero — i poster salvati vengono persi ad ogni rebuild. Per la persistenza serve un **HF Storage Bucket**:

1. Vai su [huggingface.co/new-storage](https://huggingface.co/new-storage) e crea un bucket (gratuito, 10 GB)
2. Nelle **Settings** dello Space → **Storage** → collega il bucket appena creato
3. HF lo monterà automaticamente a `/data` — Posterium rileva il volume e lo usa come DATA_DIR

> **Nota:** senza bucket, i poster vengono persi ad ogni riavvio/rebuild dello Space.
>
> Puoi verificare lo stato dello storage via `GET /api/health` → campo `storage` (path, esistenza, scrivibilità, conteggio poster salvati).

---

## 🔑 Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|-----------|:----------:|-------------|
| `TMDB_API_KEY` | ✅ | Chiave API TMDB v3 |
| `MDBLIST_API_KEY` | ❌ | Rating aggregati da 9 fonti (IMDb, TMDb, Metacritic, Rotten Tomatoes, Letterboxd, Trakt, MyAnimeList, Kitsu) e classifiche anime. Priorità massima. |
| `OMDB_API_KEY` | ❌ | Rating IMDb — fallback quando MDBList non disponibile. Senza chiave, fallback su voto TMDB. |
| `KV_URL` | ❌ | Vercel KV per storage (altrimenti file JSON) |
| `ADMIN_TOKEN` | ❌ | Token per proteggere endpoint admin (cache clear). Se non impostato, aperto. |
| `WIKIDATA_TIMEOUT` | ❌ | Timeout query Wikidata in ms (default: 4000). Se i badge premi/franchise/regista non compaiono, aumenta a 6000. |
| `POSTERIUM_DATA_DIR` | ❌ | Directory dati (default: `./data`). Su HF Spaces con Storage Bucket è `/data`. |
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
| `bs` | Stile badge genere | `?bs=pill` (shadow/pill/bar/colored) |
| `rs` | Stile badge ranking | `?rs=default` (default/bar/colored) |
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

**Esempio:** `/api/poster/tv/260592?api_key=xxx&rank=4&genreName=Animazione&voteAverage=8.2`

### Altri endpoint

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/health` | Stato servizi |
| `GET /api/trending/rank` | Classifica JustWatch |
| `GET /api/awards/[type]/[id]` | Premi, nomination, franchise, studio (Wikidata P166, P1411, P179) |
| `GET /api/mdblist/anime` | Top anime MDBList |
| `POST /api/mappings` | Salva configurazione |
| `POST /api/poster-fit` | Scoring poster — analizza fino a 20 poster per titolo e restituisce score (pulizia, contrasto, dettaglio, badge, composito) |
| `POST /api/cache/clear` | Svuota la cache in memoria *(protetta da `ADMIN_TOKEN` se impostato)* |
| `POST /api/warmup` | Pre-genera poster salvati e URL Stremio per riempire runtime cache/CDN |

---

## 🎨 Badge System

### Priorità badge top

1. 🆕 **Nuovo film / Nuova serie** — <2 settimane
2. 🎌 **Anime rank** — MDBList top anime *(richiede `MDBLIST_API_KEY`)*
3. 🔥 **Trend rank** — JustWatch Italia
4. 🏆 **Vincitore** — Oscar, Cannes, Venezia, BAFTA, Golden Globe, Emmy, David (Wikidata P166)
5. 🎬 **Franchise** — MCU, Harry Potter, James Bond, Star Wars e 50+ saghe (Wikidata P179)
6. 🏅 **Candidato** — Stessi premi, nomination (Wikidata P1411)
7. 📡 **Network / Studio** — Netflix, HBO, Disney+, Warner Bros., Pixar, Studio Ghibli e altri (TMDB)
8. 🎥 **Di [Regista]** — 66 registi IMDb Top 70 (Wikidata P57)
9. 📺 **Miniserie / Ritorna**
10. ⭐ **Da divorare / Il più votato** — voto aggregato ≥ 8.5

### Badge genere/rating

Badge con genere, •, ★ e voto medio centrato in basso, con 4 stili:
- **Shadow** — testo con ombra pronunciata, nessuno sfondo
- **Pill** — pillola semi-trasparente con angoli arrotondati
- **Bar** — barra full-width in basso con sfondo scuro e bordo superiore
- **Colored** — pillola colorata con il colore dominante del poster/logo, testo bianco/nero adattivo

### Badge ranking/extra

Badge in alto centrato, 3 stili:
- **Default** — pillola semi-trasparente con ombra
- **Bar** — barra full-width in alto, più sottile
- **Colored** — pillola colorata con il colore dominante, testo adattivo

Il testo del badge ranking/extra si adatta automaticamente alla larghezza. Rendering SVG server-side con Resvg.

### Logo

Massimo 25% dell'altezza del poster, scala automatica al cambio logo. Trascinabile con il mouse (drag & drop). Slider Scala/X/Y per regolazioni fini, doppio click per reset. Filtro per lingua (Tutti/Italiano/English/Senza lingua) con chip interattivi.

---

## 📸 Screenshots

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto1.png" alt="Home" width="32%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto2.png" alt="Editor" width="32%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto3.png" alt="Badge shadow" width="32%" />
</div>
<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto4.png" alt="Badge pill" width="100%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto5.png" alt="Badge bar" width="100%" />
</div>
<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto6.png" alt="Posterium Home" width="32%" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto7.png" alt="Posterium Home" width="32%" />
</p>

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
| Storage | Vercel KV / JSON file |
| Test | Vitest (145 test) |
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
npm test              # Esegui tutti i test (145)
npx vitest run        # Stessa cosa
```

| File test | Test | Copertura |
|---|---|---|
| `poster-url.test.ts` | 33 | buildUrlPattern, buildPreviewUrl, CDN base URL, URL params, badge, logo, backdrop, topLight |
| `cache.test.ts` | 14 | cacheGet/Set, TTL expiry, cacheGetStale, cacheInvalidate, cacheClear |
| `poster-runtime-cache.test.ts` | 2 | Header CDN immutable e stale-while-revalidate |
| `app-version.test.ts` | 1 | Versione generata allineata a package.json |
| `data-dir.test.ts` | 1 | Directory dati configurabile per volume persistente |
| `store.test.ts` | 1 | Ricarica mapping da disco tra worker/server |
| `poster-render-helpers.test.ts` | 3 | Clipping layer, dimensioni finali 500×750 e luminanza top-edge |
| `stremio-poster-params.test.ts` | 2 | Parametri poster Stremio versionati e default globali |
| `types.test.ts` | 14 | toSearchResult (default values, null→undefined, media_type normalization) |
| `badge-validation.test.ts` | 18 | computeBadge priority chain, computeExtraFallback |
| `mapping-crud.test.ts` | 11 | CRUD mappings, validation schema |
| `svg-badge.test.ts` | 23 | Rendering badge SVG, overflow protection, stili e dimensioni |
| `http.test.ts` | 2 | Timeout/retry HTTP client |
| `logo-layout.test.ts` | 2 | Dimensioni e bounds logo |
| `poster-fit-score.test.ts` | 6 | Scoring poster-fit (pulizia, contrasto, dettaglio, badge, composito) |
| `poster-fit-api.test.ts` | 2 | Endpoint API poster-fit, timeout, max poster |

---

## 🙏 Credits

Ispirato da e basato su [erdb](https://github.com/realbestia1/erdb) di realbestia1, distribuito sotto licenza AGPL v3.
