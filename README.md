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
  <img src="public/posterium.png" alt="Posterium" width="360" />
</p>

<p align="center">
  <strong>Generatore dinamico di poster cinematografici per Stremio & Media Center</strong><br />
  Locandine pulite, loghi vettoriali, rating IMDb/TMDB, badge trend JustWatch/FlixPatrol, premi Oscar/Cannes, classifiche Netflix Top 10 e grafiche cinematografiche composte in tempo reale.
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPosterium"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
  <a href="#-deploy-rapido"><img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
  <a href="#-deploy-rapido"><img src="https://img.shields.io/badge/Deploy-Termux-171717?style=for-the-badge&logo=android&logoColor=green" alt="Termux Deploy" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge" alt="License AGPLv3" />
</p>

---

## 📸 Anteprima & Screenshots

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/home.png" alt="Posterium Home" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/editor.png" alt="Posterium Editor" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/myposters.png" alt="Posterium My Posters" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/1405.jpg" alt="Poster Demo — Rapacità" width="32%" style="border-radius: 6px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/79696.jpg" alt="Poster Demo — Manifest" width="32%" style="border-radius: 6px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/97546.jpg" alt="Poster Demo — Ted Lasso" width="32%" style="border-radius: 6px;" />
</div>

---

## 🧠 Perché Posterium?

* 🎯 **Motore di Rendering Unificato (WYSIWYG)**: Un unico endpoint grafico (`/api/poster/{type}/{id}`) basato su Sharp C++ ed SVG serve sia l'anteprima web in tempo reale sia le locandine consegnate a Stremio.
* 📦 **Fornitore Metadati & Addon 100% Autonomo (`meta` + `catalog` + `poster`)**: Non richiede addon terzi o configurazioni complesse. Fornisce direttamente a Stremio schede dettagliate, trame in italiano, loghi trasparenti, sfondi 4K, trailer YouTube e **tutte le stagioni ed episodi con thumbnail e titoli italiani**.
* ⚡ **Compatibilità Streaming Universale**: Genera identificatori standard (`tt...` e `tt...:S:E`) perfettamente compatibili con Torrentio, Debrid e qualsiasi lettore Stremio/Nuvio.
* 🔄 **Cache Intelligente & Versioning Deterministico**: Ogni render incorpora una `RENDER_VERSION` calcolata automaticamente dal codice grafico: modifiche agli stili aggiornano istantaneamente le immagini su Stremio senza conflitti di cache.

---

## ✨ Funzionalità

### 🖼️ Locandine, Loghi & Grafica
* **Selezione Poster Clean**: Scegli in un click la locandina senza testo preferita tra i candidati ufficiali TMDB.
* **Algoritmo Best-Fit Intelligente**: Analizza automaticamente la luminosità e gli spazi vuoti del poster per posizionare e scalare il logo evitando di coprire i volti dei protagonisti.
* **Sfocatura Sfondo Nativa (Sharp C++)**: Generazione di sfondi con effetto blur ultra-rapido (10–20ms) a bassissimo consumo di memoria.
* **Rotazione Automatica 24h**: Seleziona più poster per lo stesso titolo e falli alternare automaticamente ogni giorno.
* **Loghi Network Ufficiali**: Riconoscimento automatico e sovrapposizione loghi per Netflix, Prime Video, Disney+, Apple TV+, HBO Max, Paramount+, Sky/NOW, Crunchyroll, Rai, Mediaset Infinity, ecc.

### 🏷️ Badge, Rating & Classifiche
* **6 Stili Badge Genere/Voto**: *Shadow, Pill, Bar, Colored, Bordo, Vetro* con colori accent adattivi calcolati in base alla palette del poster.
* **5 Stili Badge Trend/Classifiche**: *Default, Bar, Colored, Pill, Nastro Netflix*.
* **16 Fonti di Valutazione**: Supporto completo per IMDb, TMDB, Rotten Tomatoes (Critics & Audience), Metacritic, Letterboxd, MyAnimeList, AniList, FilmAffinity, Trakt e provider streaming.
* **Nastro Verticale Netflix Top 10**: Il caratteristico nastro rosso laterale con posizione in classifica e logo della piattaforma (con supporto dedicato anche per gli Anime).
* **Premi Cinematografici & Cult**: Riconoscimento automatico Oscar, Cannes, BAFTA, Emmy e badge *"Absolute Cinema"* per i titoli della IMDb Top 250.

### 🔍 Ricerca Tradizionale & ✨ Ricerca AI Groq
* **Ricerca Semantica & Linguaggio Naturale (Groq AI)**: Trova film e serie TV descrivendo trame, ambientazioni, stili, epoche o similitudini (es. *"film sci-fi con buchi neri"*, *"thriller psicologici tipo Mindhunter"*). Groq interpreta la query con `groq/compound` (fallback `groq/compound-mini`) e Posterium arricchisce i risultati con poster ufficiali TMDB.
* **Cronologia Ricerche & Suggerimenti Rapidi**: Salvataggio automatico delle ricerche recenti e pill di suggerimento per ispirare nuove scoperte cinematografiche.

### 📺 Cataloghi Stremio, Posterium Hub & Gestione Avanzata
* **📱 Posterium Hub All-in-One**: Un unico punto di installazione per Stremio con supporto QR Code per Smart TV, link diretto e **selettore a 3 modalità** (*Tutto: Cataloghi + Ricerca*, *Solo Cataloghi*, *Solo Ricerca*).
* **🌐 Import Universale Cataloghi Personalizzati (fino a 500 titoli)**:
  * **Letterboxd**: Liste pubbliche e watchlist utenti (es. saghe MCU, cinefili, filmografia registi) con estrazione automatica header e mapping completo ID.
  * **Trakt**: Liste pubbliche, watchlist e collezioni utente.
  * **TMDb Collezioni & Saghe**: Importa intere saghe (es. *The Avengers Collection*, *Star Wars Saga*) o liste tematiche direttamente da TMDb.
  * **TheTVDB & IMDb**: Liste tematiche e classifiche personalizzate.
  * **MDBList**: Liste dinamiche, filtri per voto e popolarità.
  * *Funzionalità avanzate*: Riconoscimento automatico nome lista, suddivisione automatica Film/Serie TV (*modalità Misto*) e paginazione continua `skip` su Stremio.
* **Cataloghi Piattaforme & Trend in Tempo Reale (JustWatch GraphQL)**: Classifiche ufficiali e sempre aggiornate per Top 20 Italia, Netflix, Prime Video, Disney+, Sky/NOW, Apple TV+, HBO Max, Paramount+, con deduplicazione automatica e zero doppioni.
* **Top 20 Film & Serie Anime (MDBList)**: Classifiche dedicate all'animazione giapponese (`posterium-anime-movies` e `posterium-anime`) disponibili nativamente sia con chiave personale MDBList che senza chiave (fallback JSON pubblico).
* **Compatibilità Totale Manifest & AIOMetadata**: Supporto speculare ad AIOMetadata con tutti i prefissi ID (`tmdb:`, `tt`, `kitsu:`, `tvdb:`, `mal:`, `anilist:`, `anidb:`) e tipologie (`movie`, `series`, `anime`, `anime.movie`, `anime.series`, `collection`).
* **Gestione Priorità, Nomi & Visibilità**:
  * 🔀 **Ordinamento & Drag & Drop**: Cambia l'ordine dei cataloghi per decidere quali mostrare prima su Stremio.
  * ✏️ **Rinomina**: Assegna nomi personalizzati ed emoji a qualsiasi catalogo.
  * 🔌 **Attivazione/Disattivazione**: Disabilita i cataloghi che non utilizzi.
  * 🏠 **Selettore Visibilità Home vs Esplora**: Scegli se visualizzare un catalogo nella **Home/Bacheca** di Stremio o mantenerlo accessibile solo nella scheda **Esplora**.
* **Episodi TMDB o TheTVDB (TVDB)**: Scegli la fonte preferita per immagini e descrizioni degli episodi con traduzioni italiane e fallback automatico.
* **Ricerca Globale Stremio**: Cerca qualsiasi titolo direttamente dalla barra di ricerca di Stremio su Smart TV, PC e smartphone: Posterium genererà al volo i poster personalizzati per ogni risultato.
* **Addon Proxy Stremio**: Incolla il link `manifest.json` di qualsiasi altro addon Stremio per arricchire istantaneamente tutti i suoi poster con il tuo stile grafico.

---

## ⚡ Deploy Rapido

Scegli la modalità di hosting più comoda per le tue esigenze:

| Piattaforma | Costo | Tipologia | Persistenza | Ideale per |
|---|---|---|---|---|
| [▲ Vercel](#-vercel-consigliato) | **Gratis** (Hobby) | Serverless | Upstash Redis (KV) | **Iniziare subito**: 1 click, zero manutenzione, CDN globale |
| [🤗 Hugging Face Spaces](#-hugging-face-spaces) | **Gratis** / PRO | Docker (16GB RAM) | Storage Bucket (`/data`) | Ottime prestazioni con 16GB di RAM |
| [🦾 Oracle Cloud A1](#-oracle-cloud-always-free) | **Gratis 24/7** | VPS ARM (4 OCPU / 24GB) | Disco Locale (`/data`) | Massima potenza sempre online a costo zero |
| [🐳 Docker / Compose](#-docker--docker-compose) | **Gratis** | Container | Volume (`posterium-data`) | Self-hosting su proprio server/NAS |
| [📱 Termux (Android)](#-termux-android) | **Gratis** | Node.js nativo | Memoria dispositivo | Riciclare un vecchio smartphone Android |
| [🖥️ VPS + Caddy](#-vps--caddy-reverse-proxy) | ~3-5€ / mese | Docker + Proxy | Disco Locale (`/data`) | Istanze condivise con certificato SSL automatico |

---

### ▲ Vercel (Consigliato)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPosterium)

Vercel permette di avviare Posterium in 2 minuti senza configurare server, con persistenza cloud gratuita per salvare poster e cataloghi.

#### 1. Crea il progetto su Vercel
* Clicca sul pulsante **Deploy with Vercel** qui sopra.
* Lascia tutte le opzioni predefinite e clicca **Deploy** (attendi ~1 minuto fino a ✅ **Ready**).

#### 2. Collega lo Storage Cloud Gratuito (Upstash KV)
1. Nella Dashboard del tuo progetto su Vercel, clicca sul tab **Storage** in alto.
2. Clicca **Create Database** → seleziona **Upstash** (Redis) → clicca **Continue** e collegalo al tuo progetto.
3. Vercel configurerà automaticamente le variabili `KV_REST_API_URL` e `KV_REST_API_TOKEN`.

#### 3. Imposta le Variabili d'Ambiente
Vai in **Settings → Environment Variables** e inserisci:

| Nome Variabile | Valore | Scopo |
|---|---|---|
| `POSTERIUM_PUBLIC_INSTANCE` | `1` | **Sblocca l'editor**: permette di salvare i poster e modificare i cataloghi. |
| `POSTERIUM_TMDB_KEY` | *La tua chiave TMDB* | **Cataloghi & Locandine**: popola e renderizza automaticamente i poster su Stremio ([ottieni chiave gratuita](https://www.themoviedb.org/settings/api)). |
| `POSTERIUM_MDBLIST_KEY` | *(Opzionale)* | **Liste MDBList**: per importare e visualizzare liste personalizzate e anime ([ottieni chiave](https://mdblist.com/preferences/)). |
| `POSTERIUM_TVDB_API_KEY` | *(Opzionale)* | **Episodi TVDB**: per descrizioni e thumbnail degli episodi da TheTVDB ([ottieni chiave](https://thetvdb.com/dashboard/account/apikeys)). |

#### 4. Applica le modifiche & Installa su Stremio
1. Vai nella scheda **Deployments** → clicca sui **tre puntini ⋯** accanto all'ultimo deploy → seleziona **Redeploy**.
2. Apri `https://<tuo-progetto>.vercel.app` e clicca **Installa su Stremio** (oppure incolla `https://<tuo-progetto>.vercel.app/manifest.json` in Stremio).

> 💡 **Verifica Storage**: Aprendo `https://<tuo-progetto>.vercel.app/api/status` vedrai `storage: "kv"` a conferma che la persistenza è attiva.

---

### 🤗 Hugging Face Spaces

Il repository include già la configurazione per HF Spaces Docker (`sdk: docker`, `app_port: 8080`, `Dockerfile`).

1. Crea una nuova Space su Hugging Face con SDK **Docker** collegata al repository `Eful97/Posterium`.
2. In **Space Settings → Variables and secrets**, imposta:
   * `NODE_OPTIONS` = `--max-old-space-size=1024`
   * `POSTERIUM_PUBLIC_INSTANCE` = `1`
   * `POSTERIUM_TMDB_KEY` = *La tua chiave TMDB*
3. **Persistenza**: In **Settings → Storage**, collega uno Storage Bucket montato su `/data`.
4. Manifest Stremio: `https://<tua-space>.hf.space/manifest.json`.

---

### 🦾 Oracle Cloud Always Free

Per avere un'istanza sempre accesa, potente e senza limiti serverless:

1. Registrati su [Oracle Cloud](https://www.oracle.com/cloud/free/) e crea un'istanza **VM.Standard.A1.Flex** (ARM Ampere: 4 OCPU, 24 GB RAM, Ubuntu).
2. Nella console Oracle, apri la porta TCP **8080** nella Security List della VCN.
3. Connettiti via SSH e avvia Posterium:
   ```bash
   ssh ubuntu@<IP-ISTANZA>
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   git clone https://github.com/Eful97/Posterium && cd Posterium
   sudo docker compose up -d
   ```
4. Manifest Stremio: `http://<IP-ISTANZA>:8080/manifest.json`.

---

### 🐳 Docker & Docker Compose

#### Con Docker Compose (Consigliato)
```bash
git clone https://github.com/Eful97/Posterium && cd Posterium
docker compose up -d
```

#### Esecuzione Manuale
```bash
docker build -t posterium .
docker run -d \
  -p 8080:8080 \
  -v posterium-data:/data \
  --name posterium \
  posterium
```

Manifest Stremio: `http://localhost:8080/manifest.json`.

---

### 🖥️ VPS + Caddy (Reverse Proxy HTTPS)

Ideale per condividere un'istanza sicura in HTTPS con amici e familiari:

1. Clona il repository e genera il file `.env`:
   ```bash
   git clone https://github.com/Eful97/Posterium && cd Posterium
   echo "POSTERIUM_PUBLIC_INSTANCE=1" > .env
   echo "POSTERIUM_TMDB_KEY=la_tua_chiave_tmdb" >> .env
   ```
2. Aggiungi il blocco Caddy al `docker-compose.yml`:
   ```yaml
     caddy:
       image: caddy:2
       restart: unless-stopped
       ports: ["80:80", "443:443"]
       volumes:
         - ./caddy/Caddyfile:/etc/caddy/Caddyfile
         - caddy-data:/data
       depends_on: [posterium]
   volumes:
     caddy-data:
   ```
3. Crea `caddy/Caddyfile`:
   ```caddyfile
   tuodominio.com {
       reverse_proxy posterium:8080
   }
   ```
4. Avvia con `docker compose up -d`. Caddy otterrà automaticamente un certificato SSL gratuito da Let's Encrypt!

---

### 📱 Termux (Android)

Trasforma un vecchio telefono Android in un server domestico:

> ⚠️ Installa Termux da **F-Droid** (la versione Play Store è deprecata).

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
git clone https://github.com/Eful97/Posterium && cd Posterium
npm install --ignore-scripts
npm run build
npm start
```

Manifest Stremio: `http://<IP-DELLO-SMARTPHONE>:3000/manifest.json`.

---

## 🔑 Variabili d'Ambiente

### 🛡️ Accesso & API Keys
| Variabile | Descrizione |
|---|---|
| `POSTERIUM_PUBLIC_INSTANCE` | Imposta a `1` per sbloccare l'editor su istanze pubbliche (Vercel/HF) senza richiedere token admin. |
| `POSTERIUM_TMDB_KEY` | Chiave TMDB d'istanza per generare le locandine e popolare i cataloghi. |
| `POSTERIUM_GROQ_KEY` | Chiave [Groq Cloud](https://groq.com/) per la **Ricerca AI Semantica**. |
| `POSTERIUM_GROQ_MODEL` | Modello Groq per la ricerca AI (default `openai/gpt-oss-20b`). Sovrascrivi per puntare a un modello della tua chiave. |
| `POSTERIUM_GROQ_FALLBACK_MODEL` | Modello di fallback se il primario fallisce (default `groq/compound`). |
| `POSTERIUM_MDBLIST_KEY` | Chiave MDBList per classifiche anime e liste personalizzate. |
| `POSTERIUM_TVDB_API_KEY` | Chiave TheTVDB per thumbnail e trame degli episodi. |
| `POSTERIUM_ADMIN_TOKEN` | Token segreto per proteggere le route amministrative private. |
| `CONFIG_HMAC_SECRET` | Chiave segreta per la firma crittografica dei profili stateless. |

### 💾 Storage & Persistenza
| Variabile | Descrizione |
|---|---|
| `POSTERIUM_DATA_DIR` | Percorso della cartella per i dati persistenti locali (default: `./data/` o `/data`). |
| `KV_REST_API_URL` | URL REST del database Redis Upstash / Vercel KV per serverless. |
| `KV_REST_API_TOKEN` | Token di autenticazione per database Redis Upstash / Vercel KV. |

### ⚙️ Pipeline di Rendering & Concorrenza
| Variabile | Default | Descrizione |
|---|:---:|---|
| `POSTERIUM_MAX_CONCURRENT_RENDERS` | `4` | Numero massimo di render eseguiti in parallelo (protezione memoria). |
| `POSTERIUM_RENDER_TIMEOUT_MS` | `30000` | Timeout massimo per il completamento di un render (ms). |
| `POSTERIUM_RENDER_SLOT_WAIT_MS` | `15000` | Tempo massimo di attesa in coda per uno slot di render libero. |
| `POSTERIUM_CACHE_MAX_MB` | `150` | Memoria RAM massima per la cache dei poster in memoria (MB). |
| `POSTERIUM_SELF_WARMUP` | `1` | Preriscaldamento automatico dei cataloghi all'avvio (`0` per disattivare). |
| `POSTERIUM_BEST_FIT_ENABLED` | *Auto* | Forza attivazione (`1`) o disattivazione (`0`) globale di Best-Fit. |

### 🎨 Stili Predefiniti per i Cataloghi
I poster dei cataloghi Stremio utilizzano i valori di default dell'istanza. Su istanze personali puoi configurarli anche via env:

| Variabile | Valori ammessi | Effetto sui poster dei cataloghi |
|---|---|---|
| `POSTERIUM_GLOBAL_BADGES` | `1` / `0` | Mostra/nasconde globalmente i badge genere e voto. |
| `POSTERIUM_RANKING_BADGES` | `1` / `0` | Mostra/nasconde i badge delle classifiche. |
| `POSTERIUM_BADGE_GENRE` | `1` / `0` | Mostra/nasconde l'etichetta del genere. |
| `POSTERIUM_BADGE_YEAR` | `1` / `0` | Mostra/nasconde l'anno di uscita. |
| `POSTERIUM_BADGE_RATING` | `1` / `0` | Mostra/nasconde la stella con il voto. |
| `POSTERIUM_NETWORK_LOGO` | `1` / `0` | Mostra/nasconde il logo della piattaforma streaming. |
| `POSTERIUM_BADGE_STYLE` | `shadow`, `pill`, `bar`, `colored`, `bordo`, `vetro` | Stile grafico dei badge genere/rating. |
| `POSTERIUM_RANKING_BADGE_STYLE` | `default`, `bar`, `colored`, `pill`, `netflix` | Stile grafico dei badge di classifica. |
| `POSTERIUM_RIBBON_SIDE` | `left` / `right` | Lato del nastro verticale Netflix Top 10. |
| `POSTERIUM_BLUR_ENABLED` | `1` / `0` | Abilita/disabilita lo sfondo sfocato. |
| `POSTERIUM_GRADIENT_HEIGHT` | `5` – `100` | Altezza percentuale del gradiente nero inferiore. |

---

## 🧪 Sviluppo in Locale & Test

```bash
# 1. Clona il repository
git clone https://github.com/Eful97/Posterium && cd Posterium

# 2. Installa le dipendenze
npm install

# 3. Avvia in sviluppo
npm run dev

# 4. Esegui i test unitari
npm test

# 5. Suite completa di verifica (TypeScript + ESLint + Vitest + Next Build)
npm run verify
```

---

## 📄 Licenza & Ringraziamenti

* Rilasciato sotto licenza **GNU Affero General Public License v3.0 (AGPL-3.0)**.
* Ispirato al progetto [erdb](https://github.com/realbestia1/erdb) di realbestia1.
* Loghi delle piattaforme streaming per gentile concessione di [Wikimedia Commons](https://commons.wikimedia.org/).

