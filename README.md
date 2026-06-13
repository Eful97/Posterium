---
title: Posterium
emoji: 🖼️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 3000
pinned: false
---

# Posterium 🎬

<table align="center"><tr><td>

**Genera poster personalizzati** di film e serie TV con loghi, badge trend, rating e classifiche — tutto renderizzato dinamicamente via API.

</td></tr></table>

---

## ✨ Features

- 🔍 **Ricerca TMDB** — Cerca film e serie TV in italiano e inglese
- 🎯 **Loghi** — Seleziona loghi ufficiali puliti e posizionali sul poster
- 🔥 **Badge trend** — Classifica JustWatch, tendenze MDBList, e badge adattivi (scuri su poster chiari, chiari su scuri)
- 🏷️ **Badge genere/rating** — Genere, stella ★ e voto renderizzati in sovrimpressione
- 🏆 **Badge premi** — Oscar, Cannes, Venezia, BAFTA, Emmy e altri da Wikidata
- 🎌 **Anime rank** — Top trending anime da MDBList
- 📐 **Server-side rendering** — Poster generati con Satori + Resvg via API
- 🐳 **Docker** — Deployabile ovunque (Hugging Face Spaces, Vercel, server proprio)
- ⚡ **Standalone output** — Next.js in standalone mode per immagini Docker minime

---

## 🚀 Quick Start

### Locale

```bash
# Clona
git clone https://github.com/anomalyco/posterium
cd posterium

# Installa
npm install

# Crea .env.local
echo TMDB_API_KEY=la_tua_chiave > .env.local

# Avvia
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

### Docker

```bash
docker build -t posterium .
docker run -p 3000:3000 -e TMDB_API_KEY=la_tua_chiave posterium
```

---

## 🔑 Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|-----------|:----------:|-------------|
| `TMDB_API_KEY` | ✅ | Chiave API TMDB v3 |
| `KV_URL` | ❌ | URL Vercel KV per storage (altrimenti file JSON) |
| `KV_REST_API_URL` | ❌ | Vercel KV REST URL |
| `KV_REST_API_TOKEN` | ❌ | Vercel KV REST token |

---

## 📡 API

### `GET /api/poster/[type]/[id]`

Genera un poster personalizzato.

**Parametri query:**

| Parametro | Descrizione | Esempio |
|-----------|-------------|--------|
| `api_key` | Chiave TMDB | `?api_key=xxx` |
| `poster` | Percorso poster | `?poster=/abc123.jpg` |
| `logo` | Percorso logo | `?logo=/logo123.png` |
| `scale` | Scala logo (10-100) | `?scale=75` |
| `ox` / `oy` | Offset logo X/Y | `?ox=10&oy=-5` |
| `genreName` | Nome genere | `?genreName=Thriller` |
| `voteAverage` | Voto medio | `?voteAverage=7.5` |
| `rank` | Posizione classifica | `?rank=4` |
| `label` | Etichetta classifica | `?label=Anime` |
| `extra` | Badge speciale | `?extra=Nuova+serie` |
| `badges` | Mostra badge genere | `?badges=1` |
| `ranking` | Mostra badge trend | `?ranking=1` |
| `lang` | Lingua | `?lang=it` |

**Esempio:** `/api/poster/tv/260592?api_key=xxx&rank=4&genreName=Animazione&voteAverage=8.2`

### Altri endpoint

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/health` | Stato servizi (TMDB, cache, storage) |
| `GET /api/trending/rank` | Classifica JustWatch |
| `GET /api/awards/[type]/[id]` | Premi da Wikidata |
| `GET /api/mdblist/anime` | Top anime MDBList |
| `POST /api/mappings` | Salva configurazione poster |

---

## 🏗️ Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 16 |
| UI | React 19 + Tailwind CSS 4 |
| Rendering server | Satori + Resvg (JSX → SVG → PNG) |
| Immagini | Sharp |
| Font | Inter + Noto Sans Symbols 2 |
| Storage | Vercel KV / file JSON |

---

## 🎨 Badge System

Tutti i badge sono sincronizzati client↔server usando parametri condivisi.

### Priorità badge top

1. 🆕 **Nuovo film / Nuova serie** — uscito da meno di 2 settimane
2. 🏆 **Award** — Vincitore Oscar, Cannes, Venezia, BAFTA, Emmy, David
3. 🎌 **Anime rank** — Posizione nella top anime MDBList
4. 🔥 **Trend rank** — Classifica JustWatch Italia
5. 📺 **Miniserie / Ritorna / Da divorare** — basato su tipo/status TV e voto

### Badge genere/rating

Sfumatura nera al 90% con genere, pallino •, stella ★ e voto — centrati in basso.

---

## 📁 Struttura

```
src/
├── app/api/          # API routes (poster, mappings, awards, mdblist, health)
├── components/       # Componenti React (EditView, PreviewBadges, SearchBar...)
└── lib/              # Logica condivisa (badges, satori-badge, context, store, cache...)
```
