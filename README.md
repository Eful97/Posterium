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
- 🎯 **Loghi** — Seleziona loghi ufficiali puliti e posizionali sul poster
- 🔥 **Badge trend** — Classifica JustWatch, tendenze MDBList, badge adattivi (scuri su poster chiari, chiari su scuri)
- 🏷️ **Badge genere/rating** — Genere, stella ★ e voto in sovrimpressione
- 🏆 **Badge premi** — Oscar, Cannes, Venezia, BAFTA, Emmy da Wikidata
- 🎌 **Anime rank** — Top trending anime da MDBList *(richiede chiave MDBList)*
- 📐 **Server-side rendering** — Satori + Resvg (JSX → SVG → PNG)
- 🐳 **Docker** — Deployabile su HF Spaces, Vercel, server proprio
- ⚡ **Standalone output** — Next.js standalone per immagini Docker minime

---

## 🚀 Quick Start

```bash
git clone https://github.com/anomalyco/posterium
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

---

## 🔑 Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|-----------|:----------:|-------------|
| `TMDB_API_KEY` | ✅ | Chiave API TMDB v3 |
| `MDBLIST_API_KEY` | ❌ | Chiave API MDBList — attiva rating aggregati (IMDb + Metacritic + RT + Letterboxd + Trakt...) e classifiche anime. Senza chiave, fallback su voto TMDB. |
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

**Esempio:** `/api/poster/tv/260592?api_key=xxx&rank=4&genreName=Animazione&voteAverage=8.2`

### Altri endpoint

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/health` | Stato servizi |
| `GET /api/trending/rank` | Classifica JustWatch |
| `GET /api/awards/[type]/[id]` | Premi Wikidata |
| `GET /api/mdblist/anime` | Top anime MDBList |
| `POST /api/mappings` | Salva configurazione |

---

## 🎨 Badge System

### Priorità badge top

1. 🆕 **Nuovo film / Nuova serie** — <2 settimane
2. 🏆 **Award** — Oscar, Cannes, Venezia, BAFTA, Emmy, David
3. 🎌 **Anime rank** — MDBList top anime *(richiede `MDBLIST_API_KEY`)*
4. 🔥 **Trend rank** — JustWatch Italia
5. 📺 **Miniserie / Ritorna / Da divorare** — «Da divorare» con voto aggregato ≥ 8.5

### Badge genere/rating

Sfumatura nera 90% → trasparente con genere, •, ★ e voto aggregato (media MDBList di IMDb, Metacritic, Rotten Tomatoes, Letterboxd, Trakt... o fallback TMDB) centrato in basso.

---

## 📸 Screenshots

<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto1.png" alt="Posterium Home" width="70%" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto2.png" alt="Posterium Editor" width="70%" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Foto3.png" alt="Posterium Badge" width="70%" />
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
| Storage | Vercel KV / JSON file |
