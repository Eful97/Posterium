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

## 🚀 Quick Start in Locale

> 💡 **Vuoi provarlo subito senza installare nulla?** Fai il deploy gratuito su [▲ Vercel](#vercel) in un click.

```bash
# 1. Clona il repository ed entra nella cartella
git clone https://github.com/Eful97/Posterium && cd Posterium

# 2. Installa le dipendenze
npm install

# 3. Avvia il server di sviluppo
npm run dev
```

1. Apri `http://localhost:3000` nel browser.
2. Inserisci le tue **chiavi API personali** (TMDB e opzionalmente MDBList) nella schermata **Impostazioni**.
3. Installa l'addon su Stremio incollando il link del manifest: `http://localhost:3000/manifest.json`.

---

## 🧠 Come Funziona l'Architettura

* **Un solo endpoint di rendering (`/api/poster/{type}/{id}`)**: Lo stesso identico motore grafico SVG/Sharp serve sia l'anteprima interattiva nell'editor (WYSIWYG) sia il poster finale visualizzato su Stremio. Ciò che vedi nell'editor è al pixel identico al risultato su schermo.
* **Sicurezza & Privacy First**: Nessuna chiave API viene salvata in chiaro sul server o condivisa tra gli utenti. Le chiavi viaggiano con la richiesta oppure risiedono cifrate con AES-256-GCM nel profilo personale dell'utente.
* **Profili Cloud & Modalità Stateless**: I poster personalizzati e le impostazioni si sincronizzano tramite profili cloud protetti da password (`/u/<uuid>/manifest.json`) oppure viaggiano compressi e firmati digitalmente in un token URL stateless (`?config=eyJ...`).
* **Cache Intelligente & Invalidation Versioning**: Ogni render incorpora una `RENDER_VERSION` deterministica (hash dei file di rendering). Quando il codice grafico o i layout vengono aggiornati, le cache di Stremio e del browser si invalidano automaticamente.

---

## ✨ Funzionalità Principali

### 🖼️ Grafica & Locandine
* **Selezione Poster Clean in 1-Click**: Scegli la locandina senza testo preferita tra i candidati ufficiali TMDB.
* **Algoritmo Best-Fit Intelligente**: Analizza automaticamente la luminosità e lo spazio vuoto della locandina per posizionare e scalare il logo nel punto perfetto senza coprire i volti dei protagonisti.
* **Sfocatura Sfondo Nativa (Sharp C++)**: Generazione di sfondi con effetto blur ultra-rapido (10–20ms) a bassissimo consumo di memoria.
* **Rotazione Automatica 24h**: Possibilità di selezionare più poster per lo stesso titolo e vederli alternare automaticamente ogni giorno.
* **Galleria "I Miei Poster" ad Alte Prestazioni**: Visualizzazione istantanea a latenza zero con compositing client-side (clean poster + logo overlay) e Quick-View Lightbox con zoom fluido.

### 🏷️ Badge, Rating & Premi Cinematografici
* **6 Stili Badge Genere/Voto**: *Shadow, Pill, Bar, Colored, Bordo, Vetro* con colori accent adattivi calcolati in base alla palette cromatica del poster.
* **5 Stili Badge Trend/Classifiche**: *Default, Bar, Colored, Pill, Nastro Netflix*.
* **16 Fonti di Valutazione con Icone Vettoriali Lucide**: Supporto completo per IMDb, TMDB, Rotten Tomatoes (Critics & Audience), Metacritic, Letterboxd, MyAnimeList, AniList, FilmAffinity, Trakt e provider streaming.
* **Nastro Verticale Netflix Top 10**: Il caratteristico nastro rosso laterale con posizione in classifica e logo della piattaforma (con supporto dedicato alle classifiche Anime).
* **Fonti Metadati Dinamiche**:
  * **Classifiche in tempo reale**: Integrazione JustWatch (GraphQL), FlixPatrol Top 10 e liste MDBList.
  * **Premi & Registi Cult**: Riconoscimento automatico premi Oscar, Cannes, BAFTA, Emmy e festival internazionali tramite Wikidata.
  * **Badge "Absolute Cinema"**: Applicato automaticamente ai capolavori presenti nella IMDb Top 250.
  * **Rating Ponderato**: Calcolo del voto medio bilanciato combinando IMDb e TMDB.

### 🔍 Ricerca & Interfaccia Utente
* **Ricerca Cinematografica con Depth Sheen**: Schede titoli immersive con riflessi glass, indicatori tipologia media (*Film* / *Serie TV*), voto medio e badge per titoli già personalizzati.
* **Cronologia Ricerche Rapida**: Salvataggio automatico delle ricerche recenti con pulsante di pulizia immediata in 1-click.
* **Installazione & Condivisione Manifest Istantanea**: Copia rapida dell'URL del manifest per Stremio con feedback visivo contestuale.

### 📺 Cataloghi & Ricerca Globale Stremio Integrata
* **Cataloghi Piattaforme & Trend in Tempo Reale**: Top 20 Italia (JustWatch GraphQL), Netflix, Prime Video, Disney+, Sky/NOW, Apple TV+, HBO Max, Paramount+, Top 20 Anime (MDBList) e liste MDBList personalizzate.
* **Ricerca Globale Diretta in Stremio (Stile AIOMetadata)**: Cerca qualsiasi film o serie TV direttamente dalla barra di ricerca di Stremio (Smart TV, PC, smartphone); Posterium interroga TMDB e genera al volo i poster personalizzati per ogni risultato con i tuoi loghi, badge di rating, gradienti e stili di profilo.
* **Compatibilità Universale Metadati**: Risoluzione automatica degli ID IMDb (`tt...`) e TMDB per integrarsi perfettamente con tutti gli addon di streaming (Torrentio, Cinemeta, ecc.).
* **Ordinamento e Rinomina Cataloghi**: Personalizza l'ordine di visualizzazione, attiva o disattiva singoli cataloghi e rinominali a piacere direttamente dall'interfaccia web.

### 🎭 Loghi Ufficiali Network & Piattaforme
Riconoscimento automatico della rete di produzione o distribuzione con sovrapposizione del logo vettoriale in alta definizione:
* **Piattaforme supportate**: Netflix, Prime Video, Disney+, HBO Max, Apple TV+, Paramount+, Sky (incluso NOW), Rai, Mediaset Infinity, Crunchyroll, Pluto TV, Tubi.

### ⚡ Addon Proxy Stremio
Incolla il link `manifest.json` di qualsiasi altro addon Stremio (Cyberflix, Torrentio, Streaming Catalogs, ecc.) nell'apposita sezione: Posterium farà da proxy arricchendo istantaneamente tutti i poster dei suoi cataloghi con il tuo stile personalizzato!

---

## ⚡ Deploy Rapido

Scegli la modalità di hosting più adatta alle tue esigenze:

| Piattaforma | Costo | Tipologia | Persistenza | Ideale per |
|---|---|---|---|---|
| [▲ Vercel](#vercel) | **Gratis** (Hobby) | Serverless | Upstash Redis (KV) o Stateless | **Iniziare subito**: 1 click, zero manutenzione, CDN globale |
| [🤗 Hugging Face Spaces](#hf-spaces) | **Gratis** (Base) / PRO | Docker (16GB RAM) | Storage Bucket (`/data`) | Ottime prestazioni con 16GB di RAM |
| [🦾 Oracle Cloud A1](#oracle) | **Gratis 24/7** | VPS ARM (4 OCPU / 24GB) | Disco Locale (`/data`) | Massima potenza e sempre online a costo zero |
| [🐳 Docker / Docker Compose](#docker) | **Gratis** | Container | Volume (`posterium-data`) | Self-hosting su proprio server/NAS |
| [📱 Termux (Android)](#termux) | **Gratis** | Node.js nativo | Memoria dispositivo | Riciclare un vecchio smartphone Android |
| [🖥️ VPS + Caddy](#vps) | ~3-5€ / mese | Docker + Reverse Proxy | Disco Locale (`/data`) | Istanze condivise con amici/famiglia con HTTPS |

---

<details id="vercel" open>
<summary><strong>▲ Vercel — Guida Passo-Passo (Consigliato per iniziare)</strong></summary>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPosterium)

Vercel permette di mettere online Posterium in 2 minuti senza configurare alcun server. Ciascun utente crea la **propria istanza personale** con le **proprie chiavi API**.

### 🧰 Cosa ti serve prima di iniziare
1. **Account Vercel gratuito**: [vercel.com/signup](https://vercel.com/signup) (accedi con GitHub).
2. **Chiave API TMDB gratuita**: [themoviedb.org → Settings → API](https://www.themoviedb.org/settings/api) (richiedi una chiave *Developer*).
3. **Chiave API MDBList opzionale**: [mdblist.com/preferences](https://mdblist.com/preferences/) (per Top 10 anime/Netflix).

---

### 👣 Installazione in 4 Passaggi

#### 1. Crea il progetto su Vercel
* Clicca il pulsante **Deploy with Vercel** qui sopra (oppure da Vercel Dashboard vai su **Add New… → Project** e importa `Eful97/Posterium`).
* Lascia tutte le impostazioni predefinite (Framework: **Next.js**) e clicca **Deploy**.
* Attendi ~1-2 minuti fino alla conferma ✅ **Ready**.

#### 2. Configura le Variabili d'Ambiente Fondamentali
Vai su **Vercel Dashboard → il tuo progetto Posterium → Settings → Environment Variables** e aggiungi queste 3 variabili:

| Nome Variabile | Valore da inserire | A cosa serve |
|---|---|---|
| `CONFIG_HMAC_SECRET` | Stringa casuale lunga (es. generata da terminale con `openssl rand -hex 32` o 64 caratteri hex) | **Firma digitale dei link**: indispensabile per firmare i profili e i parametri URL. |
| `POSTERIUM_PUBLIC_INSTANCE` | `1` | **Sblocca l'editor**: permette di salvare i poster e usare il *Best-fit 1-click* in produzione senza token admin. |
| `POSTERIUM_TMDB_KEY` | La tua chiave API TMDB personale | **Cataloghi Stremio automatici**: popola i cataloghi sulla tua istanza personale senza dover inserire `?api_key=` a mano. *(Opzionale: puoi aggiungere anche `POSTERIUM_MDBLIST_KEY`)*. |

#### 3. Rendi effettive le modifiche (Redeploy)
Su Vercel le variabili d'ambiente sono lette durante la build:
* Vai nella scheda **Deployments** in alto.
* Trova l'ultimo deploy, clicca sui **tre puntini ⋯** → seleziona **Redeploy** e conferma.

#### 4. Collega Posterium a Stremio
* Apri il tuo sito: `https://<tuo-progetto>.vercel.app`.
* Copia il link del manifest e incollalo nella barra di ricerca di Stremio:
  * Manifest Standard: `https://<tuo-progetto>.vercel.app/manifest.json`

---

### 🔀 Gestione della Persistenza: Scegli la tua modalità

#### 🟢 Modalità Stateless ("Strada Semplice" — Zero Database)
Con i 4 passi appena completati hai già tutto funzionante. Quando salvi una configurazione dall'interfaccia, le impostazioni vengono firmate digitalmente direttamente nell'URL (`?config=eyJ...`) e memorizzate nel browser.
* ✅ Nessun database da configurare.
* ✅ Condivisione facile dei link tra i tuoi dispositivi.
* ⚠️ Non memorizza i mapping specifici per singolo film/serie tra diversi browser.

#### 🔵 Modalità Upstash Redis ("Strada Completa" — Con Database Cloud Gratuito)
Per salvare profili protetti da password (`/u/<uuid>/manifest.json`) e mapping per-titolo persistenti nel cloud:
1. Nella Dashboard di Vercel, clicca sulla scheda **Storage** → **Create Database** → seleziona **Upstash** (Redis).
2. Collega il database al tuo progetto Posterium.
3. Verifica che le variabili create nel progetto siano nominate esattamente `KV_REST_API_URL` e `KV_REST_API_TOKEN` (se hanno prefisso `UPSTASH_`, aggiungi un alias con `KV_REST_API_*`).
4. Effettua un **Redeploy** (Deployments → ⋯ → Redeploy).
5. Verifica aprendo `https://<tuo-progetto>.vercel.app/api/status`: nella sezione **storage** leggerai `kv`.

---

### ℹ️ Note importanti su Vercel Hobby
* **Timeout funzioni (10–15s)**: Il piano gratuito di Vercel applica un timeout di 10–15 secondi per singola richiesta. Se apri per la prima volta un catalogo molto esteso a freddo, un poster potrebbe andare in timeout temporaneo: è sufficiente ricaricare la schermata.
* **Cold Starts**: Se l'istanza rimane inattiva, la funzione serverless si spegne. Il primo caricamento successivo richiederà ~1-2 secondi in più per risvegliarsi, poi la CDN di Vercel manterrà i poster in cache per 24 ore.
</details>

---

<details id="hf-spaces">
<summary><strong>🤗 Hugging Face Spaces (Docker)</strong></summary>

Il repository include già la configurazione per HF Spaces Docker (`sdk: docker`, `app_port: 8080`, `Dockerfile`).

1. Crea una nuova Space su Hugging Face con SDK **Docker** collegata al repository `Eful97/Posterium`.
2. In **Space Settings → Variables and secrets**, imposta:
   * `NODE_OPTIONS` = `--max-old-space-size=1024`
   * `POSTERIUM_PUBLIC_INSTANCE` = `1`
3. **Persistenza**: In **Settings → Storage**, collega uno Storage Bucket montato su `/data` per conservare le impostazioni e i poster salvati tra i riavvii.
4. Manifest Stremio: `https://<tua-space>.hf.space/manifest.json`.
</details>

---

<details id="oracle">
<summary><strong>🦾 Oracle Cloud Always Free (4 OCPU / 24GB RAM — 24/7)</strong></summary>

La soluzione gratuita ideale per avere un'istanza sempre accesa, potente e senza limiti serverless:

1. Registrati su [Oracle Cloud](https://www.oracle.com/cloud/free/) e crea un'istanza con shape **VM.Standard.A1.Flex** (ARM Ampere: 4 OCPU, 24 GB RAM, Ubuntu).
2. Nella console Oracle, apri la porta TCP **8080** nella Security List della VCN.
3. Connettiti via SSH e avvia Posterium con Docker:
   ```bash
   ssh ubuntu@<IP-ISTANZA>
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   git clone https://github.com/Eful97/Posterium && cd Posterium
   sudo docker compose up -d
   ```
4. Manifest Stremio: `http://<IP-ISTANZA>:8080/manifest.json`.
</details>

---

<details id="docker">
<summary><strong>🐳 Docker & Docker Compose (Self-Hosting)</strong></summary>

Posterium è pronto per essere eseguito in container con hardening di sicurezza preconfigurato (utente non-root `nextjs` uid 1000, `cap_drop: ALL`, `no-new-privileges` e memoria limitata).

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
</details>

---

<details id="vps">
<summary><strong>🖥️ VPS con Reverse Proxy Caddy (HTTPS Automatico)</strong></summary>

Ideale per condividere un'istanza sicura in HTTPS con amici e familiari:

1. Clona il repository e crea il file `.env`:
   ```bash
   git clone https://github.com/Eful97/Posterium && cd Posterium
   echo "POSTERIUM_ADMIN_TOKEN=$(openssl rand -hex 24)" > .env
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
</details>

---

<details id="termux">
<summary><strong>📱 Termux (Server su Smartphone Android)</strong></summary>

Trasforma un vecchio telefono Android in un server domestico sempre attivo:

> ⚠️ Installa Termux esclusivamente da **F-Droid** (la versione del Google Play Store è deprecata).

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
git clone https://github.com/Eful97/Posterium && cd Posterium
npm install --ignore-scripts
npm run build
npm start
```

Apri `http://localhost:3000` nel browser dello smartphone e inserisci le tue chiavi API nelle Impostazioni.  
Manifest Stremio: `http://<IP-DELLO-SMARTPHONE>:3000/manifest.json`.
</details>

---

## 🔑 Variabili d'Ambiente

Tutte le variabili sono opzionali con fallback sicuri integrati.

### 🛡️ Sicurezza, Accesso & Autenticazione
| Variabile | Descrizione |
|---|---|
| `POSTERIUM_PUBLIC_INSTANCE` | Imposta a `1` su istanze pubbliche (Vercel/HF) per sbloccare l'editor (salvataggio poster e Best-fit) senza richiedere token admin. |
| `POSTERIUM_ADMIN_TOKEN` | Token segreto per proteggere le route amministrative (`/api/mappings`, `/api/cache/clear`, `/api/defaults`). |
| `CONFIG_HMAC_SECRET` | Chiave segreta per la firma crittografica dei profili stateless e dei token di configurazione URL. |
| `PROFILE_ENCRYPTION_KEY` | Chiave esadecimale a 256-bit per cifrare le chiavi API dei profili a riposo (AES-256-GCM). |
| `POSTERIUM_TRUST_PROXY` | Imposta a `1` se l'istanza è posizionata dietro un reverse proxy fidato (Cloudflare, Caddy, Nginx) per il rate-limiting per-IP. |
| `POSTERIUM_PROXY_ALLOW_DOMAINS` | Allowlist di domini separati da virgola per il proxy addon (`/api/proxy`). |

### 💾 Storage & Persistenza
| Variabile | Descrizione |
|---|---|
| `POSTERIUM_DATA_DIR` | Percorso della cartella per i dati persistenti locali (default: `./data/` o `/data`). |
| `KV_REST_API_URL` | URL REST del database Redis Upstash / Vercel KV per la persistenza su cloud serverless. |
| `KV_REST_API_TOKEN` | Token di autenticazione per il database Redis Upstash / Vercel KV. |

### ⚙️ Pipeline di Rendering & Concorrenza
| Variabile | Default | Descrizione |
|---|:---:|---|
| `POSTERIUM_MAX_CONCURRENT_RENDERS` | `4` | Numero massimo di render grafici eseguiti in parallelo (protezione anti-OOM). |
| `POSTERIUM_RENDER_TIMEOUT_MS` | `30000` | Timeout massimo per il completamento di un render (clamp 1000–40000 ms). |
| `POSTERIUM_RENDER_SLOT_WAIT_MS` | `15000` | Tempo massimo di attesa in coda per uno slot di render libero prima di restituire 503. |
| `POSTERIUM_CACHE_MAX_MB` | `150` | Memoria RAM massima allocata per la cache dei poster in memoria (MB). |
| `POSTERIUM_CACHE_MAX` | `2000` | Numero massimo di elementi conservati nella cache poster in-memory. |
| `POSTERIUM_SELF_WARMUP` | `1` | Esegue il preriscaldamento automatico dei cataloghi in background all'avvio del container (`0` per disattivare). |
| `POSTERIUM_BEST_FIT_ENABLED` | *Auto* | Forza l'attivazione (`1`) o la disattivazione (`0`) globale dell'algoritmo Best-Fit. |
| `POSTERIUM_TMDB_KEY` | *Nessuno* | Chiave TMDB d'istanza (fallback per istanze personali a singolo utente). |
| `POSTERIUM_MDBLIST_KEY` | *Nessuno* | Chiave MDBList d'istanza (fallback per classifiche anime). |

### 🎨 Personalizzazione Default per i Cataloghi Stremio
I poster visualizzati all'interno dei cataloghi Stremio utilizzano i valori di default dell'istanza (`getServerDefaults()`). Su un'istanza personale puoi personalizzarli tramite queste variabili d'ambiente:

| Variabile | Valori ammessi | Effetto sui poster dei cataloghi |
|---|---|---|
| `POSTERIUM_GLOBAL_BADGES` | `1` / `0` | Attiva o disattiva globalmente i badge di genere e voto. |
| `POSTERIUM_RANKING_BADGES` | `1` / `0` | Attiva o disattiva i badge delle classifiche e Top 10. |
| `POSTERIUM_BADGE_GENRE` | `1` / `0` | Mostra o nasconde l'etichetta del genere. |
| `POSTERIUM_BADGE_YEAR` | `1` / `0` | Mostra o nasconde l'anno di uscita. |
| `POSTERIUM_BADGE_RATING` | `1` / `0` | Mostra o nasconde la stella con il voto. |
| `POSTERIUM_NETWORK_LOGO` | `1` / `0` | Mostra o nasconde il logo della piattaforma streaming. |
| `POSTERIUM_BADGE_STYLE` | `shadow`, `pill`, `bar`, `colored`, `bordo`, `vetro` | Stile grafico dei badge genere/rating. |
| `POSTERIUM_RANKING_BADGE_STYLE` | `default`, `bar`, `colored`, `pill`, `netflix` | Stile grafico dei badge di classifica. |
| `POSTERIUM_RIBBON_SIDE` | `left` / `right` | Lato di posizionamento del nastro verticale Netflix. |
| `POSTERIUM_BLUR_ENABLED` | `1` / `0` | Abilita o disabilita lo sfondo con effetto sfocato. |
| `POSTERIUM_GRADIENT_HEIGHT` | `5` – `100` | Altezza percentuale del gradiente nero inferiore. |

---

## 🚀 Tuning Prestazioni & Dimensionamento RAM

La pipeline grafica di Posterium è estremamente efficiente. Su server con abbondante RAM disponibile (es. VPS o Oracle Cloud), puoi aumentare la concorrenza per servire griglie di poster istantaneamente:

| Piattaforma & RAM | Heap Node (`NODE_OPTIONS`) | Render Concorrenti (`POSTERIUM_MAX_CONCURRENT_RENDERS`) | Cache RAM (`POSTERIUM_CACHE_MAX_MB`) |
|---|:---:|:---:|:---:|
| **Docker Compose Base (512 MB)** | `384 MB` | `4` | `150 MB` |
| **VPS Medio (1–2 GB)** | `768 MB` | `6` | `200 MB` |
| **Hugging Face Spaces (16 GB)** | `1024 MB` | `8 – 12` | `300 MB` |
| **Oracle Cloud A1 (24 GB)** | `2048 MB` | `12 – 16` | `400 MB` |

> 💡 **Regola d'oro**: Assegna circa 4 slot di render per ogni 384 MB di Heap Node. Se noti errori 503 durante caricamenti simultanei massivi, incrementa anche `POSTERIUM_RENDER_SLOT_WAIT_MS`.

---

## 🧪 Test & Sviluppo

Il progetto include una suite completa di test automatizzati (unitari, funzionali e di regressione visiva):

```bash
# Esegue tutti i test unitari (Vitest)
npm test

# Esegue la suite completa di verifica (TypeScript + ESLint + Vitest + Next Build)
npm run verify

# Test E2E e regressione visiva (Playwright con mock-server locale deterministico)
npx playwright test e2e/posterium-visual.spec.ts

# Benchmark e test di carico della pipeline di rendering
node scripts/load-smoke.mjs
node scripts/bench-image-cache.mjs
```

> **Snapshot Visivi**: I test visuali verificano che i poster renderizzati corrispondano al pixel ai riferimenti attesi senza richiedere chiavi API esterne (utilizzando `e2e/mock-server.mjs`). Se una modifica grafica è intenzionale, aggiorna gli snapshot con:
> ```bash
> npx playwright test --update-snapshots
> ```

---

## 📄 Licenza & Ringraziamenti

* Rilasciato sotto licenza **GNU Affero General Public License v3.0 (AGPL-3.0)**.
* Ispirato al progetto [erdb](https://github.com/realbestia1/erdb) di realbestia1.
* Loghi delle piattaforme streaming per gentile concessione di [Wikimedia Commons](https://commons.wikimedia.org/).
