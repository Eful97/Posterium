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
- 🎯 **Loghi** — Seleziona loghi ufficiali puliti, posizionali con drag & drop e slider Scala/X/Y
- 🔥 **Badge trend** — Classifica JustWatch, tendenze MDBList, badge semi-trasparenti adattivi con ombra proporzionale e text-shadow sincronizzato
- 🏷️ **Badge genere/rating** — Genere, •, ★ e voto medio, con overflow protection e sfumatura personalizzabile
- 🎨 **Gradiente fondo** — Colore, opacità, altezza e sfumatura regolabili, sincronizzato client ↔ server
- 📊 **Rating** — Media da 9 fonti: IMDb, TMDb, Metacritic, Rotten Tomatoes (critica + pubblico), Letterboxd, Trakt, MyAnimeList, Kitsu via MDBList
- 📋 **I miei poster** — Filtri per tipo (Film/Serie TV/Anime), ordinamento, ricerca, layout responsive
- 🔔 **Aggiornamenti automatici** — Badge versione in alto a sinistra, notifica nuove release da GitHub
- 🏆 **Badge premi** — Vincitore e Candidato Oscar, Cannes, Venezia, BAFTA, Golden Globe, Emmy, David da Wikidata
- 🎬 **Badge franchise** — Marvel Cinematic Universe, Harry Potter, James Bond e 50+ franchige da Wikidata
- 🎥 **Badge regista** — Di Hitchcock, Di Nolan, Di Fellini e 66 registi IMDb Top 70 da Wikidata
- 📡 **Badge network** — Netflix, HBO, Disney+, Prime Video, Apple TV+, Rai, Mediaset e altri da TMDB
- 🎌 **Anime rank** — Top trending anime da MDBList *(richiede chiave MDBList)*
- 📐 **Server-side rendering** — Satori + Resvg (JSX → SVG → PNG)
- 🐳 **Docker** — Deployabile su HF Spaces, Vercel, server proprio
- ⚡ **Standalone output** — Next.js standalone per immagini Docker minime

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

---

## 🔑 Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|-----------|:----------:|-------------|
| `TMDB_API_KEY` | ✅ | Chiave API TMDB v3 |
| `MDBLIST_API_KEY` | ❌ | Rating aggregati da 9 fonti (IMDb, TMDb, Metacritic, Rotten Tomatoes, Letterboxd, Trakt, MyAnimeList, Kitsu) e classifiche anime. Priorità massima. |
| `OMDB_API_KEY` | ❌ | Rating IMDb — fallback quando MDBList non disponibile. Senza chiave, fallback su voto TMDB. |
| `KV_URL` | ❌ | Vercel KV per storage (altrimenti file JSON) |

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
| `genreName` | Nome genere | `?genreName=Thriller` |
| `voteAverage` | Voto medio | `?voteAverage=7.5` |
| `rank` | Posizione classifica | `?rank=4` |
| `label` | Etichetta classifica | `?label=Anime` |
| `extra` | Badge speciale | `?extra=Nuova+serie` |
| `badges` | Mostra badge genere | `?badges=1` |
| `ranking` | Mostra badge trend | `?ranking=1` |
| `lang` | Lingua | `?lang=it` |
| `gradColor` | Colore gradiente (hex) | `?gradColor=%23000000` |
| `gradOpacity` | Opacità gradiente (0–1) | `?gradOpacity=0.9` |
| `gradHeight` | Altezza gradiente (5–100%) | `?gradHeight=85` |
| `gradFade` | Sfumatura gradiente (0–100%) | `?gradFade=10` |
| `tl` | Forza tema chiaro (1/0) | `?tl=1` |

**Esempio:** `/api/poster/tv/260592?api_key=xxx&rank=4&genreName=Animazione&voteAverage=8.2`

### Altri endpoint

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/health` | Stato servizi |
| `GET /api/trending/rank` | Classifica JustWatch |
| `GET /api/awards/[type]/[id]` | Premi, nomination, franchise, studio (Wikidata P166, P1411, P179) |
| `GET /api/mdblist/anime` | Top anime MDBList |
| `POST /api/mappings` | Salva configurazione |

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

Badge con genere, •, ★ e voto aggregato centrato in basso, con sfumatura fondo personalizzabile (colore, opacità, altezza, fade) sincronizzata client ↔ server.

### Logo

Massimo 25% dell'altezza del poster, scala automatica al cambio logo. Trascinabile con il mouse (drag & drop). Slider Scala/X/Y per regolazioni fini, doppio click per reset.

---

## 📸 Screenshots

<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto1.png" alt="Posterium Home" width="100%" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto2.png" alt="Posterium Editor" width="100%" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto3.png" alt="Posterium Badge" width="100%" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto4.png" alt="Posterium Badge" width="100%" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto5.png" alt="Posterium Badge" width="100%" />
</p>

---

## 🏗️ Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 16 |
| UI | React 19 + Tailwind CSS 4 |
| Rendering | Satori + Resvg (JSX → SVG → PNG) |
| Immagini | Sharp |
| Font | Inter + Noto Sans Symbols 2 |
| Dati | TMDB API + Wikidata SPARQL |
| Storage | Vercel KV / JSON file |

---

## 🙏 Credits

Ispirato da e basato su [erdb](https://github.com/realbestia1/erdb) di realbestia1, distribuito sotto licenza AGPL v3.
