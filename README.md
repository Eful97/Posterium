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
- 🏆 **Badge Automatici Intelligenti** — Classifiche JustWatch Italia, MDBList Trend, IMDb Top 250 (*Absolute Cinema*), premi Oscar/Cannes/BAFTA/Emmy (da Wikidata), saghe/franchise e registi cult.
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
   - `TMDB_API_KEY`: chiave API TMDB
   - `NODE_OPTIONS=--max-old-space-size=1024`: alza il cap memoria (il default Docker è 384MB; HF ha 16GB)
   - opzionali: `MDBLIST_API_KEY`, `OMDB_API_KEY`, `POSTERIUM_ADMIN_TOKEN`
3. **Persistenza**: collega uno Storage bucket HF a `/data` (Settings → Storage → Link bucket), altrimenti i dati non persistono tra i rebuild. L'app lo segnala nei log d'avvio.
4. **Sleep**: sul piano free la Space dorme dopo 48h di inattività e si riavvia automaticamente al primo visitatore.

📌 *URL Manifest Stremio*: `https://<tua-space>.hf.space/manifest.json`

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
   echo TMDB_API_KEY=la_tua_chiave > .env
   sudo docker compose up -d
   ```
5. **Punta la RAM**: aggiungi a `.env` `NODE_OPTIONS=--max-old-space-size=2048` (hai 24GB) e collega un volume per `/data`.

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
3. **Configura le chiavi API**:
   ```bash
   echo "TMDB_API_KEY=la_tua_chiave_tmdb" > .env.local
   ```
4. **Build e Avvio**:
   ```bash
   npm run build
   npm start
   ```
📌 *URL Manifest Stremio*: `http://<IP-del-telefono>:3000/manifest.json`

---

### 🐳 Docker / Locale

```bash
# Avvio in locale
git clone https://github.com/Eful97/Posterium && cd Posterium
npm install
echo TMDB_API_KEY=la_tua_chiave_tmdb > .env.local
npm run dev

# Avvio con Docker
docker build -t posterium .
docker run -p 8080:8080 -v posterium-data:/data -e TMDB_API_KEY=la_tua_chiave_tmdb posterium
```

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
- `TMDB_API_KEY` (obbligatoria)

#### Setup rapido

```bash
# 1. Clona
git clone https://github.com/Eful97/Posterium && cd Posterium

# 2. Crea .env
cat > .env << 'EOF'
TMDB_API_KEY=la_tua_chiave
POSTERIUM_ADMIN_TOKEN=un_token_segreto_casuale
EOF

# 3. Avvia
docker compose up -d
```

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

Chi condivide lo stesso server può creare un profilo personale via `POST /api/profile`:

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

Ogni utente usa il proprio `?u=uuid` nei link Stremio per poster personalizzati, senza interferire con gli altri.

> **Protezione admin**: imposta `POSTERIUM_ADMIN_TOKEN` in `.env` per proteggere le route di amministrazione (`/api/mappings`, `/api/cache/clear`, `/api/defaults`), che richiedono header `Authorization: Bearer <token>` o `x-admin-token: <token>`. Senza token configurato le route restano aperte (istanza pubblica, es. HF Spaces), **tranne due operazioni fail-closed che lo richiedono SEMPRE**: `DELETE /api/mappings` (svuota tutti i mapping) e `DELETE /api/profile`. Tutte le mutazioni applicano anche un check CSRF: se la richiesta porta un header `Origin` (i browser lo inviano sempre cross-origin), questo deve combaciare con l'host del server, altrimenti risposta `403`.

#### Note produzione

- **Memoria**: Posterium usa ~200MB base + cache. Il `docker-compose.yml` limita a 512MB.
- **Persistenza**: I dati (mapping, profili, default) sono in un volume Docker `posterium-data`.
- **CDN**: Se hai una CDN (Cloudflare, Bunny), imposta `POSTER_CDN_URL` per generare URL poster col CDN. I poster **salvati** (mapping con versione) vengono serviti con header `immutable` (cache edge 1 anno); quelli composti al volo senza mapping (rank JustWatch, premi, IMDb Top 250) usano `stale-while-revalidate` per non congelare i badge dinamici alla CDN.
- **Rate limiting**: 120 req/min per IP su route generiche, 100/min su poster. Limiti in-memory — resistono a uso normale ma non a un attacco DDoS. Metti la CDN davanti per quello. La chiave usa `cf-connecting-ip` → `x-real-ip` → ultimo hop `x-forwarded-for` (header impostati/sovrascritti dai proxy fidati).
- **Warmup**: `/api/warmup` è **fail-closed in produzione** — senza `WARMUP_TOKEN` (o `POSTERIUM_ADMIN_TOKEN`) risponde `401`. Configura il token se usi una cron di warmup automatico.
- **Sicurezza**: Il proxy add-on (`/api/proxy`) mitiga l'SSRF (blocco IP privati/loopback, DNS pin e validazione dei redirect); opzionalmente puoi chiuderlo ai soli domini autorizzati con `POSTERIUM_PROXY_ALLOW_DOMAINS`. `/api/health` non espone il percorso assoluto dei dati su disco.
- **Cache**: I poster generati sono in memoria (max 2000 entry / 150MB). Un restart svuota la cache (i poster si rigenerano al prossimo accesso). La cache-key e le URL Stremio includono `RENDER_VERSION`, **generata automaticamente** (hash dei file di rendering via `scripts/write-render-version.mjs`): quando cambia il codice di resa (badge, blur, logo, font, route poster) i poster si invalidano da soli e le URL Stremio cambiano — nessun bump manuale.

---

## 🔑 Variabili d'Ambiente

| Variabile | Obbligatoria | Descrizione |
|---|:---:|---|
| `TMDB_API_KEY` | ✅ | Chiave API TMDB (v3) |
| `MDBLIST_API_KEY` | ❌ | Per classifiche anime e voto IMDb aggregato |
| `OMDB_API_KEY` | ❌ | Fallback per voto IMDb quando MDBList non è fornito |
| `KV_REST_API_URL` | ❌ | URL Upstash Redis per persistenza cloud (alternativa a file JSON) |
| `KV_REST_API_TOKEN` | ❌ | Token Upstash Redis |
| `POSTERIUM_ADMIN_TOKEN` | ❌ | Protegge route admin (`/api/mappings`, `/api/cache/clear`, `/api/defaults`) |
| `ADMIN_TOKEN` | ❌ | Alias per POSTERIUM_ADMIN_TOKEN (legacy) |
| `POSTERIUM_PROXY_ALLOW_DOMAINS` | ❌ | Allowlist opzionale (virgole) dei domini ammessi dal proxy add-on `/api/proxy`. Non impostata → aperto (proxare addon arbitrari è la funzione del proxy) |
| `POSTERIUM_ALLOWED_HOSTS` | ❌ | Allowlist opzionale (virgole) di hostname pubblici per cui fidarsi di `X-Forwarded-Host` (reverse proxy dietro IP/URL non standard) |
| `ENCRYPTION_KEY_SECRET` | ❌ | Chiave per firma HMAC-SHA256 dei token di configurazione profilo (rende i token URL immutabili) |
| `CONFIG_HMAC_SECRET` | ❌ | Chiave alternativa per firma HMAC (fallback a ENCRYPTION_KEY_SECRET) |
| `PROFILE_ENCRYPTION_KEY` | ❌ | Chiave AES-256-GCM per cifrare le API key salvate nei profili cloud (`/api/profile`) |
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
| `WARMUP_TOKEN` | ❌ | Token per endpoint `/api/warmup` (fallback a POSTERIUM_ADMIN_TOKEN) |
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

Quasi 500 test su store, API, componenti React, badge SVG, poster-fit, profili e utilità.

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
