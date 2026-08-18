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
  <a href="#-deploy-rapido"><img src="https://img.shields.io/badge/Deploy-Termux-171717?style=for-the-badge&logo=android&logoColor=green" alt="Termux Deploy" /></a>
  <a href="#-deploy-rapido"><img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
</p>

---

## 📸 Screenshots

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/home.png" alt="Posterium Home" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/editor.png" alt="Posterium Editor" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/myposters.png" alt="Posterium My Posters" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/1405.jpg" alt="Poster Demo — Rapacità" width="32%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/79696.jpg" alt="Poster Demo — Manifest" width="32%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/97546.jpg" alt="Poster Demo — Ted Lasso" width="32%" />
</div>

---

## 🚀 Quick Start

```bash
git clone https://github.com/Eful97/Posterium && cd Posterium
npm install
npm run dev
```

1. Apri `http://localhost:3000`
2. Inserisci le tue **chiavi TMDB e MDBList** nelle **Impostazioni** (sono personali: ogni richiesta porta la propria chiave o quella del tuo profilo)
3. Installa l'addon su Stremio con il manifest: `http://localhost:3000/manifest.json`

---

## 🧠 Come funziona

- **Un solo endpoint** (`/api/poster/{type}/{id}`) genera sia l'anteprima nell'editor (WYSIWYG) sia il poster finale Stremio: quello che vedi è esattamente quello che ottieni.
- **Personalizzi una volta, vale ovunque**: i tuoi poster si salvano nel profilo cloud (UUID + password) e seguono i link `?u=<uuid>` su qualsiasi dispositivo.
- **Niente chiavi sul server**: le chiavi API sono per-utente (browser o profilo), mai variabili d'ambiente d'istanza.

---

## ✨ Feature Principali

- 🖼️ **Selezione Poster Clean in 1-Click** — locandina pulita preferita con un click, con algoritmo *Best Fit* che trova il poster perfetto per il logo.
- 🎨 **Personalizzazione Badge Completa** — 6 stili badge genere/rating (*Shadow, Pill, Bar, Colored, Bordo, Vetro*) e 5 stili trend (*Default, Bar, Colored, Pill, Nastro Netflix*); componenti genere/anno/voto indipendenti, colori accent adattivi al poster, testo libero per titolo e **default salvabili** nelle Impostazioni.
- 🏆 **Badge Automatici Intelligenti** — JustWatch Italia, FlixPatrol Top 10, MDBList, IMDb Top 250 (*Absolute Cinema*), premi Oscar/Cannes/BAFTA/Emmy (Wikidata), registi cult.
- 🍿 **Nastro Netflix Top 10** — nastro rosso verticale con logo piattaforma affiancato; variante dedicata alle classifiche anime.
- 🎭 **Loghi Network Automatici** — Netflix, HBO Max, Disney+, Prime Video, Apple TV+, Paramount+, Rai, Crunchyroll, Sky/NOW, Mediaset Infinity, Tubi, Pluto TV.
- ⭐ **Rating Accurato** — voto medio bilanciato IMDb + TMDB.
- 🌀 **Sfocatura Sfondo Nativa (Sharp C++)** — blur ultra-rapido in ~10-20ms.
- 🔄 **Rotazione Poster 24h** — locandina diversa ogni giorno tra quelle selezionate.
- 🔐 **Profilo Cloud (UUID + Password)** — configurazione salvata e sincronizzata ovunque.
- ⚡ **Stremio Addon Proxy** — incolla il `manifest.json` di qualsiasi addon (Cyberflix, Torrentio, Streaming Catalogs…) e i tuoi poster compaiono nei suoi cataloghi.
- 🌍 **Multi-Lingua** — Italiano, English, Français, Deutsch, Español.

---

## 🎭 Loghi Network Supportati

Posterium riconosce rete/produttore (TMDB, Wikidata, studio badge) e sovrappone il logo ufficiale della piattaforma accanto al badge di ranking.

Supportati: **Netflix, HBO Max, Disney+, Prime Video, Apple TV+, Paramount+, Rai, Crunchyroll, Sky** (include NOW), **Mediaset Infinity, Tubi, Pluto TV**.

> I loghi vengono da [Wikimedia Commons](https://commons.wikimedia.org/) (`public/networks/`). Matching case-insensitive e specifico per evitare falsi positivi (*NOW* solo se il nome inizia con *now*; *Sky* copre *Sky Atlantic*/*Sky Italia* ma non *Skydance*/*Skywalker*).

---

## ⚡ Deploy Rapido

| Piattaforma | Costo | Ideale per |
|---|---|---|
| [🤗 Hugging Face Spaces](#hf-spaces) | Gratis se già Docker, altrimenti PRO | 16GB RAM, avvio in 2 minuti |
| [▲ Vercel](#vercel) | Gratis (Hobby) | CDN rapido, zero server da gestire |
| [🦾 Oracle Cloud A1](#oracle) | Gratis 24/7 | Sempre acceso e potente (4 OCPU / 24GB) |
| [📱 Termux (Android)](#termux) | Gratis | Server da un vecchio telefono |
| [🐳 Docker / Locale](#docker) | Gratis | Sviluppo e test |
| [🖥️ VPS + Caddy](#vps) | ~5€/mese | Multi-utente (famiglia/amici) |

> ⚠️ **Per tutte le piattaforme**: le chiavi TMDB/MDBList **non** si configurano via env — si inseriscono dal browser nelle **Impostazioni** e si salvano nel profilo. Senza chiave esplicita i poster rispondono 404 e i cataloghi sono vuoti.

<details id="hf-spaces">
<summary><strong>🤗 Hugging Face Spaces (Docker)</strong></summary>

> ⚠️ **Piano free (luglio 2026)**: creare una Space *compute* (Gradio/Docker) richiede un **piano PRO** (~$9/mese). Chi ha già una Space Docker creata prima di quella data continua a girarla gratis su **CPU Basic** (2 vCPU / 16GB).

Il repo è già configurato per HF Spaces Docker (`sdk: docker` + `app_port: 8080` + `Dockerfile`).

1. Crea (o usa) una Space con SDK **Docker**, collegandola al repo `Eful97/Posterium`.
2. **Env** (Space Settings → Variables): `NODE_OPTIONS=--max-old-space-size=1024` e opzionalmente `POSTERIUM_ADMIN_TOKEN`.
3. **Persistenza**: collega uno Storage bucket HF a `/data` (Settings → Storage → Link bucket), altrimenti i dati non persistono tra i rebuild.
4. **Sleep**: sul piano free la Space dorme dopo 48h di inattività e si riavvia al primo visitatore.

📌 Manifest Stremio: `https://<tua-space>.hf.space/manifest.json`
</details>

<details id="vercel">
<summary><strong>▲ Vercel (Gratis, CDN rapido)</strong></summary>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPosterium)

Su Vercel il filesystem è **read-only e non persistente**: i poster vengono sempre generati e serviti correttamente, ma il salvataggio di mapping e profili richiede uno store esterno (Vercel KV). Scegli la modalità che preferisci:

---

**Opzione A — Senza persistenza (solo rendering)**

Funziona subito, senza configurazione aggiuntiva. I poster vengono generati e serviti normalmente, ma **non puoi salvare** mapping personalizzati né profili cloud: ogni tentativo di salvataggio restituisce errore 500 (`Storage not configured`).

1. Clicca **Deploy** (o Vercel → Add New → Project → importa `Eful97/Posterium`). Framework Next.js, build default.
2. Fine. L'app è online e genera poster; usa i **config token** (`?config=<token>`, vedi sotto) per personalizzare i poster senza salvare nulla sul server.

> ⚠️ Senza KV: niente profili cloud, niente "I miei poster", niente salvataggio mapping. Se ti serve solo generare poster al volo con parametri nell'URL, questa opzione basta.

---

**Opzione B — Con persistenza (salvataggio mapping e profili)**

Aggiunge uno store **Vercel KV (Upstash)** dove vengono salvati mapping, profili e apiKeys cifrate.

1. Clicca **Deploy** (o Vercel → Add New → Project → importa `Eful97/Posterium`). Framework Next.js, build default.
2. **Crea lo store KV**: nella dashboard Vercel vai su **Storage → Create Database → KV** (Upstash). Collega il database al progetto appena creato.
3. Vercel aggiunge automaticamente le env `KV_REST_API_URL` e `KV_REST_API_TOKEN` al progetto.
4. **Redeploy**: vai su Deployments → ultimo deploy → ⋯ → **Redeploy** (le env nuove vengono lette solo al build/deploy successivo).
5. (Consigliato) Imposta le env aggiuntive:
   | Variabile | Necessità |
   |---|---|
   | `KV_REST_API_URL` + `KV_REST_API_TOKEN` | 🔴 Obbligatorie (senza: salvare = 500) |
   | `CONFIG_HMAC_SECRET` | 🟠 Consigliata — sblocca i config token |
   | `PROFILE_ENCRYPTION_KEY` | 🟠 Consigliata — cifra le apiKeys dei profili (`openssl rand -hex 32`) |
   | `POSTERIUM_ADMIN_TOKEN` | Opzionale — proteggi le route admin |
6. Verifica: apri `https://<tuo-app>.vercel.app/api/status` → la sezione **storage** deve mostrare `kv`.

**Dove vengono salvati i dati**: profili, mapping e apiKeys su **KV Upstash**; cache poster in-memory (effimera); cache flixpatrol su `/tmp` (fallback automatico).

---

**Limiti Hobby da conoscere**: durata funzione **10s** (Pro 60s); il warmup non completa su Hobby (non critico); la cache in-memory si svuota al cold start.

**Troubleshooting**:
- Poster 404 con `TMDB API key is missing` → manca la chiave nella richiesta: passa `?api_key=` / header `x-api-key`, o usa un link `?u=<uuid>` col profilo.
- Cataloghi vuoti → il catalogo richiede una chiave TMDB nella richiesta.
- `ENOENT` / "Storage not configured" → manca lo store KV: segui l'Opzione B dal punto 2.

📌 Manifest Stremio: `https://<tuo-app>.vercel.app/manifest.json` (o `/u/<uuid>/manifest.json` col profilo).
</details>

<details id="oracle">
<summary><strong>🦾 Oracle Cloud Always Free (Gratis, 24/7)</strong></summary>

L'unica opzione gratuita con CPU sufficiente per i render: **4 OCPU ARM (Ampere A1) + 24GB RAM**. I tier free di Render/Northflank (0.1–0.2 vCPU) sono troppo deboli.

1. Crea account su [Oracle Cloud](https://www.oracle.com/cloud/free/) (carta solo per verifica, il tier Always Free non addebita).
2. Crea un'istanza: shape **VM.Standard.A1.Flex** (ARM), 4 OCPU / 24GB, Ubuntu.
3. Apri la porta 8080 in VCN → Security List (regola ingress TCP 8080).
4. Installa Docker e avvia:
   ```bash
   ssh ubuntu@<IP-istanza>
   sudo apt update && sudo apt install -y docker.io
   git clone https://github.com/Eful97/Posterium && cd Posterium
   sudo docker compose up -d
   ```
5. Punta la RAM: `.env` con `NODE_OPTIONS=--max-old-space-size=2048` e un volume per `/data`.

📌 Manifest Stremio: `http://<IP-istanza>:8080/manifest.json`
</details>

<details id="termux">
<summary><strong>📱 Termux (Android 24/7)</strong></summary>

Trasforma un vecchio telefono Android in un server Posterium sempre attivo.

> ⚠️ Installa Termux **da F-Droid** (la versione Play Store è obsoleta).

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
git clone https://github.com/Eful97/Posterium && cd Posterium
npm install --ignore-scripts
npm run build
npm start
```

Poi apri `http://localhost:3000` e inserisci le chiavi API nelle **Impostazioni**.

📌 Manifest Stremio: `http://<IP-del-telefono>:3000/manifest.json`
</details>

<details id="docker">
<summary><strong>🐳 Docker / Locale</strong></summary>

```bash
# Locale (sviluppo)
git clone https://github.com/Eful97/Posterium && cd Posterium
npm install
npm run dev

# Docker
docker build -t posterium .
docker run -p 8080:8080 -v posterium-data:/data posterium
```

- Il container gira come utente **non-root** (`nextjs`, uid 1000) e scrive in `/data`; `docker-compose.yml` applica già l'hardening (`cap_drop: ALL`, `no-new-privileges`, limite 512MB).
- **Cap memoria JS**: default 384MB (tarato per RAM bassa). Su piattaforme con più RAM alza il cap: `docker build --build-arg NODE_MAX_OLD_SPACE=1024 -t posterium .` (o env di piattaforma, es. HF Spaces).

📌 Manifest Stremio: `http://localhost:8080/manifest.json`
</details>

<details id="vps">
<summary><strong>🖥️ VPS + Caddy (Multi-Utente)</strong></summary>

Per hostare Posterium su un VPS e condividerlo con famiglia/amici.

**Setup rapido** (prerequisiti: Docker + `docker compose`, 1 CPU / 512MB minimo, 1GB consigliato):

```bash
git clone https://github.com/Eful97/Posterium && cd Posterium
cat > .env << 'EOF'
POSTERIUM_ADMIN_TOKEN=un_token_segreto_casuale
EOF
docker compose up -d
```

L'app è su `http://IP_VPS:8080`. Per HTTPS automatico aggiungi **Caddy** al `docker-compose.yml`:

```yaml
  caddy:
    image: caddy:2
    container_name: caddy
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    depends_on: [posterium]
volumes:
  caddy-data:
```

con `caddy/Caddyfile`:
```
tuodominio.com {
    reverse_proxy posterium:8080
}
```

**Multi-utente (Profili)**: ogni utente crea il proprio profilo (pulsante **User** in toolbar) con config, chiavi API proprie e mapping per-titolo. Il suo UUID (`?u=<uuid>`) nei link Stremio mostra i suoi poster senza interferire con gli altri; le chiavi del profilo vincono su quelle della richiesta. Le apiKeys sono cifrate a riposo (AES-256-GCM, `PROFILE_ENCRYPTION_KEY`).

**Config Token (personalizzazione per-link)**: nell'editor premi **"Copia link config"** e ottieni un link tipo `/api/poster/{type}/{imdb_id}?config=<token>` con **tutta** la configurazione firmata HMAC-SHA256 — condivisibile cross-device senza salvare nulla sul server. Richiede `CONFIG_HMAC_SECRET` in produzione (senza: fail-closed). I token coprono i parametri di stile; le immagini restano legate al mapping salvato.
</details>

<details>
<summary><strong>🛡️ Note produzione</strong></summary>

- **Memoria**: ~200MB base + cache; `docker-compose.yml` limita a 512MB.
- **Persistenza**: mapping, profili e default su volume Docker `/data` (o KV su Vercel).
- **CDN**: con una CDN (Cloudflare, Bunny) imposta `POSTER_CDN_URL`. Poster salvati → header `immutable` (cache edge 1 anno); poster composti al volo (rank, premi, Top 250) → `stale-while-revalidate` per non congelare i badge dinamici.
- **Rate limiting**: 120 req/min per IP su route generiche, 100/min sui poster (in-memory). Per-IP **solo** dietro proxy fidato: `POSTERIUM_TRUST_PROXY=1` (Cloudflare/HF edge/Nginx). Senza flag: bucket aggregato per istanza (fail-safe anti-spoof).
- **Warmup**: `/api/warmup` è protetto (admin token o `POSTERIUM_WARMUP_TOKEN` dedicato, rate-limited, CSRF-checked). L'entrypoint Docker/HF lancia il **self-warmup** automatico dopo il boot (`POSTERIUM_SELF_WARMUP=0` per disattivarlo).
- **Sicurezza**: il proxy addon mitiga l'SSRF (blocco IP privati, DNS pin, validazione redirect); chiudibile ai soli domini autorizzati con `POSTERIUM_PROXY_ALLOW_DOMAINS`. Route admin (`/api/mappings`, `/api/cache/clear`, `/api/defaults`) protette da `POSTERIUM_ADMIN_TOKEN`; in produzione senza token restano **chiuse** (fail-closed) tranne su istanza pubblica esplicita (`POSTERIUM_PUBLIC_INSTANCE=1`). `DELETE /api/mappings` e `DELETE /api/profile` richiedono **sempre** il token.
- **Cache**: poster in memoria (max 2000 entry / 150MB). Le URL includono `RENDER_VERSION`, **generata automaticamente** (hash dei file di rendering): quando cambia il codice di resa, cache e URL Stremio si invalidano da sole — nessun bump manuale.

</details>

---

## 🔑 Variabili d'Ambiente

| Variabile | Obbligatoria | Descrizione |
|---|:---:|---|
| `KV_REST_API_URL` | ❌ | URL Upstash Redis per persistenza cloud (alternativa a file JSON) |
| `KV_REST_API_TOKEN` | ❌ | Token Upstash Redis |
| `POSTERIUM_ADMIN_TOKEN` | ❌ | Protegge le route admin (`/api/mappings`, `/api/cache/clear`, `/api/defaults`) |
| `ADMIN_TOKEN` | ❌ | Alias per POSTERIUM_ADMIN_TOKEN (legacy) |
| `POSTERIUM_WARMUP_TOKEN` | ❌ | Token dedicato per `/api/warmup` (header `x-warmup-token`) |
| `POSTERIUM_PROXY_ALLOW_DOMAINS` | ❌ | Allowlist (virgole) dei domini ammessi dal proxy addon `/api/proxy` |
| `POSTERIUM_ALLOWED_HOSTS` | ❌ | Allowlist di hostname pubblici per cui fidarsi di `X-Forwarded-Host` |
| `POSTERIUM_TRUST_PROXY` | ❌ | `=1` abilita il rate limit per-IP dietro proxy fidato (Cloudflare/HF/Nginx) |
| `ENCRYPTION_KEY_SECRET` | ❌ | Chiave firma HMAC-SHA256 dei config token |
| `CONFIG_HMAC_SECRET` | ❌ | Chiave alternativa per la firma HMAC (fallback a ENCRYPTION_KEY_SECRET) |
| `PROFILE_ENCRYPTION_KEY` | ❌ | Chiave AES-256-GCM (hex) per cifrare le apiKeys dei profili a riposo |
| `POSTERIUM_DATA_DIR` | ❌ | Percorso dati persistenti (default: `./data/`) |
| `POSTERIUM_SELF_WARMUP` | ❌ | `=0` disabilita il self-warmup post-deploy (default: attivo) |
| `POSTERIUM_CACHE_MAX` | ❌ | Max entry cache in-memory (default: 2000) |
| `POSTERIUM_CACHE_MAX_MB` | ❌ | Max MB cache in-memory (default: 150) |
| `POSTERIUM_CACHE_REFRESH_HOUR` | ❌ | Ora UTC refresh programmato poster/catalog (default: 3) |
| `POSTERIUM_LOG_LEVEL` | ❌ | Livello log: `debug`, `info`, `warn`, `error` (default: `info`) |
| `POSTERIUM_LOG_FORMAT` | ❌ | Log in formato JSON se impostato a `json` |
| `POSTERIUM_DEBUG` | ❌ | `1` abilita log di debug aggiuntivi |
| `SHARP_CONCURRENCY` | ❌ | Thread Sharp per resize immagini |
| `SHARP_CACHE_MEMORY_MB` | ❌ | Cache Sharp in MB |
| `SHARP_CACHE_ITEMS` | ❌ | Max elementi cache interna Sharp |
| `POSTERIUM_MAX_CONCURRENT_RENDERS` | ❌ | Render poster concorrenti (slot anti-OOM, default: 4) |
| `POSTERIUM_RENDER_SLOT_WAIT_MS` | ❌ | Attesa massima di un posto render prima del 503 (default: 15000; clamp 500–60000) |
| `POSTERIUM_RENDER_TIMEOUT_MS` | ❌ | Deadline complessivo del render (default: 30000; clamp 1000–40000) |
| `POSTERIUM_RENDER_QUEUE` | ❌ | Coda bounded del limiter (default: 0 = accoda fino a SLOT_WAIT) |
| `POSTERIUM_AUTO_FIT_TIMEOUT_MS` | ❌ | Tetto del best-fit logo (default: 1200; clamp 300–10000) |
| `POSTERIUM_RATING_WAIT_MS` | ❌ | Attesa max upgrade voto TMDB+IMDb (default: 1500; clamp 300–10000) |
| `POSTERIUM_NEGATIVE_CACHE_TTL_MS` | ❌ | TTL negative cache errori 500/503 (default: 5000; clamp 1000–60000) |
| `POSTERIUM_RATELIMIT_POSTER_MAX` | ❌ | Token burst rate-limit poster (default: 200; clamp 10–10000) |
| `POSTER_CDN_URL` / `NEXT_PUBLIC_POSTER_CDN_URL` | ❌ | URL CDN per i link poster |
| `NEXT_PUBLIC_TMDB_IMG_URL` | ❌ | Base URL immagini TMDB lato client (default: `https://image.tmdb.org/t/p`) |
| `WIKIDATA_TIMEOUT` | ❌ | Timeout fetch Wikidata badge premi (default: 2500) |

> Le variabili si leggono a module level: un cambio richiede **restart**, non hot reload.

---

### 🚀 Tuning performance (istanze con RAM alta)

I default del render pipeline (**4 slot concorrenti**, cache 150MB) sono tarati per istanze a bassa RAM (Docker: heap 384MB). Su macchine con più memoria il collo di bottiglia dei render freddi sono gli **slot di concorrenza**, non la CPU.

| Piattaforma (RAM) | `POSTERIUM_MAX_CONCURRENT_RENDERS` | `POSTERIUM_CACHE_MAX_MB` | `NODE_OPTIONS` |
|---|---|---|---|
| Docker compose (512MB) — default | 4 | 150 | (default 384MB) |
| VPS 1–2GB | 6 | 200 | `--max-old-space-size=768` |
| HF Spaces (16GB) | 8–12 | 300 | `--max-old-space-size=1024` |
| Oracle Cloud A1 (24GB) | 12–16 | 400 | `--max-old-space-size=2048` |

> ⚠️ **Regola empirica**: ~4 slot per ogni 384MB di heap — oltre si rischia OOM invece di velocità. Se le griglie ricevono molti 503, alza anche `POSTERIUM_RENDER_SLOT_WAIT_MS`.

---

## 🧪 Test

[Vitest](https://vitest.dev/) per i test unitari (oltre 580), [Playwright](https://playwright.dev/) per E2E e visual regression. Le API esterne (TMDB, JustWatch, Wikidata, IMDb) sono simulate dal mock server locale `e2e/mock-server.mjs` — **nessuna chiave API necessaria**.

```bash
# Unit test
npx vitest run

# E2E — visuali (screenshot) e funzionali
npx playwright test e2e/posterium-visual.spec.ts
npx playwright test e2e/posterium-smoke.spec.ts
npx playwright test e2e/            # tutti

# Pipeline di rendering: load test e benchmark cache
node scripts/load-smoke.mjs
node scripts/bench-image-cache.mjs
```

**Snapshot**: se una modifica intenzionale altera l'aspetto di UI o poster: `npx playwright test --update-snapshots`, poi committa i `.png` in `e2e/posterium-visual.spec.ts-snapshots/`.

---

## 🙏 Credits

Ispirato da [erdb](https://github.com/realbestia1/erdb) di realbestia1 (licenza AGPL v3).
