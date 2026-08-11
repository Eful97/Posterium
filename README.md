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
  <strong>Generatore dinamico di poster personalizzati per Stremio & Media Center</strong><br />
  Loghi puliti, rating IMDb/TMDB, badge trend JustWatch, premi Oscar/Cannes, classifiche Netflix Top 10 e grafiche cinematografiche in tempo reale.
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPosterium"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
  <a href="#-deploy-termux-android-247"><img src="https://img.shields.io/badge/Deploy-Termux-171717?style=for-the-badge&logo=android&logoColor=green" alt="Termux Deploy" /></a>
  <a href="#-docker--locale"><img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
</p>

---

## 📸 Screenshots

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/home.png" alt="Posterium Home" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/editor.png" alt="Posterium Editor" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Screenshot%202026-08-05%20153901.png" alt="Posterium Home Screenshot" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/1405.jpg" alt="Poster Demo 1" width="32%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/66732.jpg" alt="Poster Demo 2" width="32%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/85552.jpg" alt="Poster Demo 4" width="32%" />
</div>

---

## ✨ Feature Principali

- 🖼️ **Selezione Poster Clean in 1-Click** — Scegli la tua locandina pulita (senza testo) preferita con un singolo click e fissala per sempre su Stremio. Supporta l'algoritmo *Best Fit* che rileva in automatico il poster perfetto per il logo.
- 🎨 **Personalizzazione Badge Completa** — 6 stili per badge genere/rating (*Shadow, Pill, Bar, Colored, Bordo, Vetro*) e 5 stili per badge trend (*Default, Bar, Colored, Pill, Nastro Netflix*). Ogni componente del badge genere/rating (genere, anno, voto) si attiva/disattiva in modo indipendente per la combinazione che preferisci. Colori accent adattivi al poster e testo libero personalizzato per singolo titolo. Nelle **Impostazioni** salvi i tuoi default (componenti genere/anno/voto, stili badge, blur, gradiente, posizione badge): si applicano automaticamente a ogni nuovo poster e alle richieste Stremio.
- 🏆 **Badge Automatici Intelligenti** — Classifiche JustWatch Italia, FlixPatrol Top 10, MDBList Trend, IMDb Top 250 (*Absolute Cinema*), premi Oscar/Cannes/BAFTA/Emmy (da Wikidata) e registi cult.
- 🍿 **Nastro Netflix Top 10** — Badge con l'iconico nastro rosso verticale allineato a sinistra e affiancamento automatico del logo della piattaforma. Variante dedicata per le classifiche anime (nastro esteso con etichetta *anime* sotto il numero).
- 🎭 **Loghi Network Automatici** — Logo ufficiale della piattaforma sovrapposto automaticamente al poster: Netflix, HBO Max, Disney+, Prime Video, Apple TV+, Paramount+, Rai, Crunchyroll, Sky/NOW, Mediaset Infinity, Tubi e Pluto TV.
- ⭐ **Rating Accurato** — Voto medio bilanciato ed imparziale IMDb + TMDB.
- 🌀 **Sfocatura Sfondo Nativa (Sharp C++)** — Effetto blur sul fondo ultra-rapido generato in soli ~10-20ms.
- 🔄 **Rotazione Poster 24h** — Cambia automaticamente locandina pulita ogni giorno tra i poster selezionati.
- 🔐 **Profilo Cloud (UUID + Password)** — Salva e carica la tua configurazione su server con password protetta. Il tuo UUID personale si collega automaticamente a Stremio per avere i poster personalizzati ovunque.
- ⚡ **Generatore Stremio Addon Proxy** — Incolla il link `manifest.json` di qualsiasi add-on Stremio (Cyberflix, Cinemeta, Streaming Catalogs, Torrentio, ecc.) per iniettare automaticamente i poster dinamici di Posterium nei cataloghi esterni! Supporta anche il parametro `?u=` per profili personalizzati.
- 📡 **Integrazione Stremio Istantanea** — Generazione dinamica tramite manifest Stremio con caching e warmup automatico.
- 🌍 **Multi-Lingua** — Interfaccia disponibile in 5 lingue: Italiano, English, Français, Deutsch, Español.

---

## 🎭 Loghi Network Supportati

Posterium riconosce automaticamente rete/produttore dal catalogo (TMDB, Wikidata, studio badge) e sovrappone il logo ufficiale della piattaforma accanto al badge di ranking (nastro Netflix, extra) quando il titolo appartiene alla rete.

Supportati: **Netflix**, **HBO Max**, **Disney+**, **Prime Video**, **Apple TV+**, **Paramount+**, **Rai**, **Crunchyroll**, **Sky** (include **NOW**, stesso servizio di streaming), **Mediaset Infinity**, **Tubi**, **Pluto TV**.

> I loghi provengono da [Wikimedia Commons](https://commons.wikimedia.org/) e sono serviti da `public/networks/`. Il matching è case-insensitive e specifico per evitare falsi positivi: *NOW* viene riconosciuto solo quando il nome inizia con *now* (es. *NOW*, *Now TV*), così da non confonderlo con parole come *Snowfall* o *Don't Look Now*; *Sky* copre anche *Sky Atlantic* e *Sky Italia* ma non *Skydance* o *Skywalker*.

---

## ⚡ Deploy Rapido

### 🤗 Deploy Hugging Face Spaces (Docker)

> ⚠️ **Nota sul piano free (luglio 2026)**: da luglio 2026 creare una Space *compute* (Gradio/Docker) richiede un **piano PRO** (~$9/mese). Le **Static Space** restano gratis ma non sono adatte a Posterium (è un server Next.js). Chi **ha già** una Space Docker creata prima di quella data continua a girarla gratis su **CPU Basic** (2 vCPU / 16GB, costo orario 0).

Il repo è già configurato per HF Spaces Docker: frontmatter `sdk: docker` + `app_port: 8080` nel README e `Dockerfile` pronto.

1. **Crea (o usa) una Space** su [huggingface.co/spaces](https://huggingface.co/spaces) con SDK **Docker**, collegandola al repo `Eful97/Posterium`.
2. **Env** (Space Settings → Variables):
   - `NODE_OPTIONS=--max-old-space-size=1024`: alza il cap memoria (il default Docker è 384MB; HF ha 16GB)
   - opzionale: `POSTERIUM_ADMIN_TOKEN`
   - ⚠️ **Le chiavi TMDB/MDBList non vanno nelle env**: ogni richiesta porta la propria chiave (header `x-api-key` / query `api_key`/`mdblist_key`) o quella del profilo utente (`?u=`). Le chiavi personali si impostano dalle **Impostazioni** del browser e si salvano col profilo.
3. **Persistenza**: collega uno Storage bucket HF a `/data` (Settings → Storage → Link bucket), altrimenti i dati non persistono tra i rebuild. L'app lo segnala nei log d'avvio.
4. **Sleep**: sul piano free la Space dorme dopo 48h di inattività e si riavvia automaticamente al primo visitatore.

📌 *URL Manifest Stremio*: `https://<tua-space>.hf.space/manifest.json`

---

### ▲ Deploy Vercel (Gratis, CDN rapido)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPosterium)

Gira bene sul runtime Node di Vercel (sharp/resvg inclusi). **La persistenza richiede uno store KV (Vercel/Upstash)**: il filesystem serverless è read-only, quindi senza KV i salvataggi dei mapping falliscono con `ENOENT`.

#### 1. Crea il progetto
- Clicca il pulsante **Deploy** qui sopra (oppure Vercel → Add New → Project → importa `Eful97/Posterium`).
- Framework **Next.js**, build default (`npm run build`), il pulsante precompila tutto.
- Vercel genera un dominio tipo `https://<progetto>.vercel.app`.

#### 2. Crea lo store KV (OBBLIGATORIO per salvare)
1. Vercel → progetto → **Storage** → **Create Database** → **KV** (Upstash).
2. Vercel aggiunge automaticamente `KV_REST_API_URL` e `KV_REST_API_TOKEN` alle env del progetto.
3. **Redeploy** (o attendi il prossimo auto-deploy) per applicarle.

*Alternativa manuale*: crea un database Redis su [upstash.com](https://upstash.com) → copia `KV_REST_API_URL` (es. `https://xxx.upstash.io`) e `KV_REST_API_TOKEN` → Vercel → Settings → Environment Variables → aggiungile → Redeploy.

#### 3. Imposta le altre variabili d'ambiente
| Variabile | Necessità |
|---|---|
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | 🔴 **Obbligatorie su Vercel** — senza, salvare mapping/profili = 500 (filesystem read-only) |
| `CONFIG_HMAC_SECRET` | 🟠 Consigliata — sblocca i config token (senza sono fail-closed) |
| `PROFILE_ENCRYPTION_KEY` | 🟠 Consigliata — cifra le apiKeys dei profili a riposo (genera con `openssl rand -hex 32`) |
| `POSTERIUM_ADMIN_TOKEN` | Opzionale — proteggi le route admin |
| `POSTERIUM_PUBLIC_INSTANCE` | Opzionale — `=1` abilita le route admin aperte senza token (istanza pubblica, es. HF Spaces) |

> 🔑 **Chiavi API TMDB/MDBList**: NON sono più variabili d'ambiente e non esiste più una chiave d'istanza condivisa. Le chiavi personali si impostano dal browser in **Impostazioni** e si salvano col profilo (config + apiKeys cifrate). Ogni richiesta porta la propria chiave (header `x-api-key` / query `api_key`/`mdblist_key`) o quella del profilo (`?u=`). Senza chiave esplicita: poster 404 e cataloghi vuoti.

#### 4. Dove vengono salvati i dati
| Dato | Dove |
|---|---|
| Profili (config, password, apiKeys) | **KV Upstash** (persistente, nel cloud del progetto) |
| Mapping poster | **KV Upstash** (persistente) |
| Cache poster in-memory | effimera per-istanza (ok, è una cache) |
| Cache flixpatrol | `/tmp` (effimero — fallback automatico su fs read-only) |

#### 5. Limiti da conoscere
- **Durata funzione**: Hobby **10s** (Pro 60s). I render poster (1–3.5s) e i cataloghi freddi (~10s) rientrano in genere; su Hobby un burst pesante può andare in timeout.
- Il **warmup** (`POST /api/warmup`) **non completa su Hobby** (supera i 10s). Non è critico: le griglie poster si riscaldano con i nuovi default di attesa slot.
- La cache poster in-memory si svuota al cold start (Vercel tiene le funzioni calde; il primo hit freddo fa il render pieno).

#### 6. Troubleshooting
- **Poster 404 con `TMDB API key is missing`** → la richiesta non porta una chiave TMDB: passa `?api_key=` (o header `x-api-key`), o usa un link col tuo profilo `?u=` che ha la chiave salvata.
- **Cataloghi vuoti (0 titoli) su Vercel** → il catalogo richiede una chiave TMDB nella richiesta. L'editor usa la chiave personale del browser (salvata col profilo); le richieste Stremio devono portare `api_key` o il profilo `?u=<uuid>`.
- **"Failed to create/update profile" / `ENOENT /var/task/data`** → manca lo store KV (punto 2).
- **"Storage not configured: set KV_REST_API_URL and KV_REST_API_TOKEN"** → stesso problema, messaggio esplicito.

📌 *URL Manifest Stremio*: `https://<tuo-app>.vercel.app/manifest.json` (o `/u/<uuid>/manifest.json` per il tuo profilo).

---

### 🦾 Deploy Oracle Cloud Always Free (Gratis, 24/7)

L'unica opzione gratuita con CPU sufficiente per i render poster di Posterium: **4 OCPU ARM (Ampere A1) + 24GB RAM**, gratis per sempre. I tier free di Render/Northflank (0.1–0.2 vCPU) sono troppo deboli.

1. **Crea account** su [Oracle Cloud](https://www.oracle.com/cloud/free/) (richiede carta per verifica, ma il tier Always Free non addebita).
2. **Crea un'istanza**: shape **VM.Standard.A1.Flex** (ARM), 4 OCPU / 24GB, Ubuntu.
3. **Apri la porta 8080**: in VCN → Security List aggiungi una regola ingress TCP 8080.
4. **Installa Docker e avvia**:
   ```bash
   ssh ubuntu@<IP-istanza>
   sudo apt update && sudo apt install -y docker.io
   git clone https://github.com/Eful97/Posterium && cd Posterium
   sudo docker compose up -d
   ```
5. **Punta la RAM**: aggiungi a `.env` `NODE_OPTIONS=--max-old-space-size=2048` (hai 24GB) e collega un volume per `/data`.
6. **Chiavi API**: solo chiavi personali, dal browser in **Impostazioni**, salvate col profilo (niente più sezione "Chiavi API istanza" né env var).

📌 *URL Manifest Stremio*: `http://<IP-istanza>:8080/manifest.json`

---

### 📱 Deploy Termux (Android 24/7)

Trasforma un vecchio telefono Android in un server Posterium sempre attivo!

> ⚠️ **Importante**: Installa Termux **da F-Droid** (la versione Play Store è obsoleta e non funziona).

1. **Installa le dipendenze**:
   ```bash
   pkg update && pkg upgrade -y
   pkg install nodejs git -y
   ```
2. **Clona ed installa Posterium**:
   ```bash
   git clone https://github.com/Eful97/Posterium
   cd Posterium
   npm install --ignore-scripts
   ```
3. **Build e Avvio**:
   ```bash
   npm run build
   npm start
   ```
4. **Configura le chiavi API**: apri `http://localhost:3000`, inseriscile nelle **Impostazioni** (barre TMDB + MDBList personali) e salvale col profilo. Non c'è più una sezione "Chiavi API istanza".
📌 *URL Manifest Stremio*: `http://<IP-del-telefono>:3000/manifest.json`

---

### 🐳 Docker / Locale

```bash
# Avvio in locale
git clone https://github.com/Eful97/Posterium && cd Posterium
npm install
npm run dev

# Avvio con Docker
docker build -t posterium .
docker run -p 8080:8080 -v posterium-data:/data posterium
```

> **Chiavi API**: si impostano dal browser nelle **Impostazioni** (solo chiavi personali TMDB + MDBList) e si salvano col profilo. Non servono env var e non esiste più una chiave d'istanza: ogni richiesta porta la propria chiave o quella del profilo.

> Il container gira come utente non-root (`nextjs`, uid 1000) e scrive i dati persistenti in `/data` (volume named `posterium-data`). Con Docker Compose il `docker-compose.yml` applica già l'hardening (`cap_drop: ALL`, `no-new-privileges`).

> **Cap memoria JS**: il default è `384MB` (tarato per piattaforme a bassa RAM). Se la piattaforma ha più RAM (es. HF Spaces 16GB), alzalo per non limitare i render burst:
> - **HF Spaces**: imposta nelle Space Settings la variabile `NODE_OPTIONS=--max-old-space-size=1024` (le env di piattaforma sovrascrivono l'`ENV` del Dockerfile).
> - **Build manuale**: `docker build --build-arg NODE_MAX_OLD_SPACE=1024 -t posterium .`

---

### 🖥️ Deploy VPS (Docker Compose, Multi-Utente)

Per chi vuole hostare Posterium su un **VPS** e condividerlo con famiglia/amici.

#### Prerequisiti

- VPS con Docker e `docker compose` (1 CPU, 512MB RAM minimo — 1GB consigliato)
- Un dominio (opzionale, ma consigliato per HTTPS)

#### Setup rapido

```bash
# 1. Clona
git clone https://github.com/Eful97/Posterium && cd Posterium

# 2. Crea .env (solo admin/token; le chiavi API si mettono dalle Impostazioni)
cat > .env << 'EOF'
POSTERIUM_ADMIN_TOKEN=un_token_segreto_casuale
EOF

# 3. Avvia
docker compose up -d
```

> Le chiavi TMDB/MDBList non si passano più nel `.env` e non c'è più una chiave
> d'istanza condivisa: si impostano dal browser nelle **Impostazioni** (solo chiavi
> personali) e si salvano col profilo. Ogni richiesta porta la propria chiave.

L'app è su `http://IP_VPS:8080`. Manifest Stremio: `http://IP_VPS:8080/manifest.json`.

#### Reverse proxy con Caddy (HTTPS automatico)

Crea `caddy/Caddyfile`:
```
tuodominio.com {
    reverse_proxy posterium:8080
}
```

Aggiorna `docker-compose.yml`, aggiungi sotto `services`:
```yaml
  caddy:
    image: caddy:2
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    depends_on:
      - posterium

volumes:
  caddy-data:
```

Riavvia: `docker compose up -d`.

#### Multi-Utente (Profili)

Chi condivide lo stesso server può creare un profilo personale via `POST /api/profile` (o dal pulsante **User** nella toolbar). Ogni profilo porta **config, chiavi API TMDB/MDBList proprie e mapping per-titolo**: le chiavi salvate nel profilo sono l'unica fonte per le richieste via profilo (`?u=`), e ogni utente usa la propria, così i rate limit personali non collidono. La password protegge il profilo; le apiKeys vengono cifrate a riposo con AES-256-GCM (`PROFILE_ENCRYPTION_KEY`).

```json
{
  "config": {
    "globalBadges": true,
    "rankingBadges": true,
    "badgeStyle": "colored",
    "rankingBadgeStyle": "netflix",
    "blurEnabled": true,
    "blurIntensity": 5,
    "blurFade": 60,
    "blurDarkness": 40,
    "gradientHeight": 30,
    "networkLogo": true,
    "autoRotateClean": true,
    "logoFitEnabled": false
  },
  "password": "scelta_dall_utente"
}
```

Risposta: `{ "profileId": "uuid-generato", "url": "..." }`.

Ogni utente usa il proprio `?u=uuid` nei link Stremio (manifest `/u/<uuid>/manifest.json`) per poster personalizzati, senza interferire con gli altri. Le chiavi API del profilo vincono su quelle della richiesta (`x-api-key`/`api_key`); senza chiave né profilo le chiamate TMDB/MDBList falliscono.

#### Config Token (personalizzazione per-link)

Per la **massima personalizzazione senza account**: personalizzi il poster nell'editor → premi **"Copia link config"** → ottieni un link tipo `https://host/api/poster/{type}/{imdb_id}?config=<token>`. Il token porta **tutta** la configurazione (stili badge, blur, gradienti, logo, badge custom) firmata HMAC-SHA256.

- **Dove usarlo**: come URL poster personalizzato in Stremio/AIOMetadata, o condiviso ad altri (vedono esattamente il tuo stile)
- **Cross-device**: la config è dentro il link, nessun salvataggio sul server
- **Addon-wide**: richiedi i cataloghi con `?config=<token>` e i poster includeranno il token
- **Requisito**: imposta `CONFIG_HMAC_SECRET` (o `ENCRYPTION_KEY_SECRET`) in produzione — senza, i token non vengono firmati/accettati (fail-closed) e il pulsante mostra l'errore

> I token coprono i **parametri di stile**. Le **immagini** (poster/logo/backdrop) e i loro transform restano legati al mapping salvato sul server.

> **Protezione admin**: imposta `POSTERIUM_ADMIN_TOKEN` in `.env` per proteggere le route di amministrazione (`/api/mappings`, `/api/cache/clear`, `/api/defaults`), che richiedono header `Authorization: Bearer <token>` o `x-admin-token: <token>`. **Senza token configurato le route restano aperte solo in modalità pubblica**: esplicita (`POSTERIUM_PUBLIC_INSTANCE=1`, istanza pubblica es. HF Spaces multi-utente) o dev locale (`NODE_ENV=development`, `next dev` — l'operatore è l'admin). In produzione senza flag restano chiuse (fail-closed) — un'istanza privata che dimentica il token non resta esposta. **Due operazioni fail-closed la richiedono SEMPRE**: `DELETE /api/mappings` (svuota tutti i mapping) e `DELETE /api/profile` (elimina un profilo). Tutte le mutazioni applicano anche un check CSRF: se la richiesta porta un header `Origin` (i browser lo inviano sempre cross-origin), questo deve combaciare con l'host del server, altrimenti risposta `403`.

#### Note produzione

- **Memoria**: Posterium usa ~200MB base + cache. Il `docker-compose.yml` limita a 512MB.
- **Persistenza**: I dati (mapping, profili, default) sono in un volume Docker `posterium-data`.
- **CDN**: Se hai una CDN (Cloudflare, Bunny), imposta `POSTER_CDN_URL` per generare URL poster col CDN. I poster **salvati** (mapping con versione) vengono serviti con header `immutable` (cache edge 1 anno); quelli composti al volo senza mapping (rank JustWatch, premi, IMDb Top 250) usano `stale-while-revalidate` per non congelare i badge dinamici alla CDN.
- **Rate limiting**: 120 req/min per IP su route generiche, 100/min su poster. Limiti in-memory — resistono a uso normale ma non a un attacco DDoS. Metti la CDN davanti per quello. Il rate limit è **per-IP solo dietro proxy fidato**: imposta `POSTERIUM_TRUST_PROXY=1` quando sei dietro Cloudflare/HF edge/Nginx (la chiave usa `cf-connecting-ip` → `x-real-ip` → ultimo hop `x-forwarded-for`, header che il proxy sovrascrive). Senza il flag gli header IP sono ignorati (spoofabili da un client) e tutte le richieste condividono un bucket aggregato — niente bypass, ma limite di istanza.
- **Warmup**: `/api/warmup` segue il token admin (`POSTERIUM_ADMIN_TOKEN`/`ADMIN_TOKEN`): **fail-open** solo su istanza pubblica esplicita (`POSTERIUM_PUBLIC_INSTANCE=1`) senza token (es. HF Spaces), **fail-closed** altrimenti. In più è rate-limited (bucket `warmup`) e protetto da CSRF (`isSameOrigin`), così chiunque non possa triggerare carico in loop. Il self-fetch dei poster usa un origin interno fisso (`127.0.0.1`), mai l'host derivato dagli header di richiesta (anti-SSRF).
- **Sicurezza**: Il proxy add-on (`/api/proxy`) mitiga l'SSRF (blocco IP privati/loopback, DNS pin e validazione dei redirect); opzionalmente puoi chiuderlo ai soli domini autorizzati con `POSTERIUM_PROXY_ALLOW_DOMAINS`. `/api/health` non espone il percorso assoluto dei dati su disco.
- **Cache**: I poster generati sono in memoria (max 2000 entry / 150MB). Un restart svuota la cache (i poster si rigenerano al prossimo accesso). La cache-key e le URL Stremio includono `RENDER_VERSION`, **generata automaticamente** (hash dei file di rendering via `scripts/write-render-version.mjs`): quando cambia il codice di resa (badge, blur, logo, font, route poster) i poster si invalidano da soli e le URL Stremio cambiano — nessun bump manuale.

---

## 🔑 Variabili d'Ambiente

| Variabile | Obbligatoria | Descrizione |
|---|:---:|---|
| `KV_REST_API_URL` | ❌ | URL Upstash Redis per persistenza cloud (alternativa a file JSON) |
| `KV_REST_API_TOKEN` | ❌ | Token Upstash Redis |
| `POSTERIUM_ADMIN_TOKEN` | ❌ | Protegge route admin (`/api/mappings`, `/api/cache/clear`, `/api/defaults`) |
| `ADMIN_TOKEN` | ❌ | Alias per POSTERIUM_ADMIN_TOKEN (legacy) |
| `POSTERIUM_PROXY_ALLOW_DOMAINS` | ❌ | Allowlist opzionale (virgole) dei domini ammessi dal proxy add-on `/api/proxy`. Non impostata → aperto (proxare addon arbitrari è la funzione del proxy) |
| `POSTERIUM_ALLOWED_HOSTS` | ❌ | Allowlist opzionale (virgole) di hostname pubblici per cui fidarsi di `X-Forwarded-Host` (reverse proxy dietro IP/URL non standard) |
| `POSTERIUM_TRUST_PROXY` | ❌ | `=1` abilita il rate limit per-IP fidandosi di `cf-connecting-ip`/`x-real-ip`/`x-forwarded-for`. Impostalo SOLO dietro un proxy/edge che sovrascrive questi header (Cloudflare, HF edge, Nginx). Senza il flag gli header IP sono ignorati (spoofabili) e si usa un bucket condiviso per tutta l'istanza (fail-safe) |
| `ENCRYPTION_KEY_SECRET` | ❌ | Chiave per firma HMAC-SHA256 dei token di configurazione (rende i token URL immutabili) |
| `CONFIG_HMAC_SECRET` | ❌ | Chiave alternativa per firma HMAC (fallback a ENCRYPTION_KEY_SECRET) |
| `PROFILE_ENCRYPTION_KEY` | ❌ | Chiave AES-256-GCM (hex, es. `openssl rand -hex 32`) per cifrare le apiKeys salvate nei profili cloud (`/api/profile`). Assente → avviso in produzione e chiavi in chiaro a riposo |
| `POSTERIUM_DATA_DIR` | ❌ | Percorso dati persistenti (default: `./data/`) |
| `POSTERIUM_CACHE_MAX` | ❌ | Max entry cache in-memory (default: 2000) |
| `POSTERIUM_CACHE_MAX_MB` | ❌ | Max MB cache in-memory (default: 150) |
| `POSTERIUM_CACHE_REFRESH_HOUR` | ❌ | Ora UTC refresh programmato poster/catalog (default: 3) |
| `POSTERIUM_LOG_LEVEL` | ❌ | Livello log: `debug`, `info`, `warn`, `error` (default: `info`) |
| `POSTERIUM_LOG_FORMAT` | ❌ | Formato log JSON se impostato a `json` |
| `POSTERIUM_DEBUG` | ❌ | Log di debug: `1` abilita info aggiuntive (es. path dati) |
| `SHARP_CONCURRENCY` | ❌ | Thread Sharp per resize immagini (default: 2) |
| `SHARP_CACHE_MEMORY_MB` | ❌ | Cache Sharp in MB (default: 64) |
| `SHARP_CACHE_ITEMS` | ❌ | Max elementi cache interna Sharp (default: auto) |
| `WARMUP_TOKEN` | ❌ | (Deprecato) Token per `/api/warmup` — ora usa il token admin (`POSTERIUM_ADMIN_TOKEN`/`ADMIN_TOKEN`); fail-open solo con `POSTERIUM_PUBLIC_INSTANCE=1` |
| `POSTERIUM_MAX_CONCURRENT_RENDERS` | ❌ | Render poster concorrenti (slot anti-OOM, default: 4) |
| `POSTERIUM_RENDER_SLOT_WAIT_MS` | ❌ | Attesa massima di un posto render prima del 503 (default: 15000; clamp 500–60000) |
| `POSTERIUM_RENDER_TIMEOUT_MS` | ❌ | Deadline complessivo del render poster: oltre, watchdog libera slot + inflight (default: 30000; clamp 1000–120000) |
| `POSTERIUM_RENDER_QUEUE` | ❌ | Coda bounded del limiter: con N>0 i waiter oltre N ricevono 503 immediato (default: 0 = accoda fino a RENDER_SLOT_WAIT_MS) |
| `POSTERIUM_NEGATIVE_CACHE_TTL_MS` | ❌ | TTL della negative cache errori 500/503 (default: 5000; clamp 1000–60000) |
| `POSTERIUM_RATELIMIT_POSTER_MAX` | ❌ | Token burst del bucket rate-limit poster (default: 200; clamp 10–10000) |
| `POSTER_CDN_URL` / `NEXT_PUBLIC_POSTER_CDN_URL` | ❌ | URL CDN per generare link poster col CDN |
| `NEXT_PUBLIC_TMDB_IMG_URL` | ❌ | Base URL immagini TMDB lato client (default: `https://image.tmdb.org/t/p`). Utile per proxy immagini o test e2e |
| `WIKIDATA_TIMEOUT` | ❌ | Timeout ms per fetch Wikidata badge premi (default: 4000) |

---
	
## 🧪 Test

Posterium usa [Vitest](https://vitest.dev/) per test unitari e [Playwright](https://playwright.dev/) per test E2E e visual regression.

### Test unitari (Vitest)

Quasi 500 test su store, API, componenti React, badge SVG, poster-fit e utilità.

```bash
# Esecuzione singola
npx vitest run

# Modalità watch (sviluppo)
npx vitest

# Con coverage
npx vitest run --coverage
```

### Test E2E (Playwright)

```bash
npx playwright install chromium

# Test visivi (screenshot — sempre attivi)
npx playwright test e2e/posterium-visual.spec.ts

# Smoke test (funzionali)
npx playwright test e2e/posterium-smoke.spec.ts

# Tutti i test
npx playwright test e2e/
```

I test non richiedono più `TMDB_API_KEY`: le API esterne (TMDB, JustWatch, Wikidata, IMDb) vengono simulate dal mock server locale `e2e/mock-server.mjs`, avviato automaticamente da `playwright.config.ts` con dati deterministici. I test girano anche con `npm run dev` attivo grazie a un `distDir` separato (`.next-e2e`).

Se vuoi aggiungere nuovi mock (per esempio una nuova API esterna), aggiungi un handler in `e2e/mock-server.mjs` e l'override env corrispondente in `playwright.config.ts`.

### Aggiornare gli snapshot

Se una modifica intenzionale altera l'aspetto dell'interfaccia o dei poster:

```bash
npx playwright test --update-snapshots
```

Poi committa i nuovi `.png` generati in `e2e/posterium-visual.spec.ts-snapshots/`.

---

## 🙏 Credits

Ispirato da [erdb](https://github.com/realbestia1/erdb) di realbestia1 (licenza AGPL v3).
