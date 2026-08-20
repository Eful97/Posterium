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

> 💡 **Non vuoi installare nulla?** Prova Posterium subito con il deploy gratuito su [▲ Vercel](#vercel): un click, nessun server da gestire.

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
| [▲ Vercel](#vercel) | Gratis (Hobby) | **Prova subito**: deploy in 1 click, zero server, CDN rapido |
| [🤗 Hugging Face Spaces](#hf-spaces) | Gratis se già Docker, altrimenti PRO | 16GB RAM, avvio in 2 minuti |
| [🦾 Oracle Cloud A1](#oracle) | Gratis 24/7 | Sempre acceso e potente (4 OCPU / 24GB) |
| [📱 Termux (Android)](#termux) | Gratis | Server da un vecchio telefono |
| [🐳 Docker / Locale](#docker) | Gratis | Sviluppo e test |
| [🖥️ VPS + Caddy](#vps) | ~5€/mese | Multi-utente (famiglia/amici) |

> 💡 **Vuoi provare Posterium senza installare nulla?** Usa il deploy **▲ Vercel**: gratis, un click e in un paio di minuti hai la tua istanza online. L'**Opzione A** (sotto) basta per provare tutto — editor, anteprima e link condivisibili — senza configurare storage.

> ⚠️ **Per tutte le piattaforme**: le chiavi TMDB/MDBList **non** si configurano via env — si inseriscono dal browser nelle **Impostazioni** e si salvano nel profilo. Senza chiave esplicita i poster rispondono 404 e i cataloghi sono vuoti.

<details id="hf-spaces">
<summary><strong>🤗 Hugging Face Spaces (Docker)</strong></summary>

> ⚠️ **Piano free (luglio 2026)**: creare una Space *compute* (Gradio/Docker) richiede un **piano PRO** (~$9/mese). Chi ha già una Space Docker creata prima di quella data continua a girarla gratis su **CPU Basic** (2 vCPU / 16GB).

Il repo è già configurato per HF Spaces Docker (`sdk: docker` + `app_port: 8080` + `Dockerfile`).

1. Crea (o usa) una Space con SDK **Docker**, collegandola al repo `Eful97/Posterium`.
2. **Env** (Space Settings → Variables): `NODE_OPTIONS=--max-old-space-size=1024`, **`POSTERIUM_PUBLIC_INSTANCE=1`** (necessaria in produzione: apre le route admin dell'editor — salvataggio poster e best-fit — senza token; senza, in produzione restano chiuse e il best-fit non esce) e opzionalmente `POSTERIUM_ADMIN_TOKEN`.
3. **Persistenza**: collega uno Storage bucket HF a `/data` (Settings → Storage → Link bucket), altrimenti i dati non persistono tra i rebuild.
4. **Sleep**: sul piano free la Space dorme dopo 48h di inattività e si riavvia al primo visitatore.

📌 Manifest Stremio: `https://<tua-space>.hf.space/manifest.json`
</details>

<details id="vercel">
<summary><strong>▲ Vercel — Gratis e velocissimo (consigliato se inizi ora)</strong></summary>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPosterium)

> **Cos'è Vercel?** È un servizio gratuito che mette online Posterium in 2 minuti, senza server da gestire. Clicchi un bottone e ottieni il **tuo Posterium personale** con un link tipo `https://posterium-xxx.vercel.app` — pronto da usare su Stremio. Ogni persona crea la **propria** istanza con le **proprie** chiavi.

---

### 🧰 Prima di iniziare — cosa ti serve

| Cosa | Dove si prende | A cosa serve |
|---|---|---|
| **Account Vercel** (gratis) | [vercel.com/signup](https://vercel.com/signup) — login con GitHub | Per mettere online la tua copia di Posterium |
| **Chiave TMDB** (gratis) | [themoviedb.org → Settings → API](https://www.themoviedb.org/settings/api) → "Request an API Key" (Developer) | Senza questa, Stremio non trova film/serie e i poster danno errore 404 |
| **Chiave MDBList** (opzionale) | [mdblist.com/preferences](https://mdblist.com/preferences/) | Solo per le classifiche anime / Netflix Top 10 |

> 💡 Le chiavi sono **personali** — non le condividi con nessuno. Ognuno usa le sue sulla propria istanza.

---

### 👣 Guida passo-passo — Posterium online in 3 minuti

#### Passo 1 — Crea la tua copia su Vercel

1. Clicca il bottone **Deploy with Vercel** qui sopra.
2. Se richiesto, fai login con GitHub e clicca **Create / Deploy**.
3. Lascia tutto di default (Framework: **Next.js**) e attendi ~1-2 minuti che finisca il primo deploy. Vedrai ✅ **Ready**.

> Hai già un account Vercel? In alternativa: Vercel Dashboard → **Add New… → Project** → Importa `Eful97/Posterium` → **Deploy**.

#### Passo 2 — Aggiungi le 3 impostazioni fondamentali

Su Vercel queste si chiamano **Environment Variables** (variabili d'ambiente) — sono semplicemente **impostazioni segrete** del tuo server, come una password. Si impostano una volta sola.

Vai su: **Vercel Dashboard → il tuo progetto Posterium → Settings → Environment Variables**

Aggiungi queste 3 (clicca **Add**, incolla il valore, lascia **All Environments** selezionato):

| # | Nome da incollare | Cosa incollare | Perché serve |
|---|---|---|---|
| **1** | `CONFIG_HMAC_SECRET` | Una stringa casuale lunga — generale così: apri un terminale e lancia `openssl rand -hex 32` e incolla il risultato. Su Windows senza openssl puoi usare un generatore online di stringhe esadecimali (64 caratteri). | È la **firma segreta** dei tuoi link: senza, il salvataggio del profilo fallisce con *“no HMAC secret”*. |
| **2** | `POSTERIUM_PUBLIC_INSTANCE` | `1` | È l'**interruttore che sblocca l'editor**: senza questo, i pulsanti **Salva poster** e **Best-fit 1-click** non funzionano in produzione (in locale funzionano sempre). |
| **3** | `POSTERIUM_TMDB_KEY` | La **tua** chiave TMDB (quella del passo prima) | Così i **cataloghi su Stremio si popolano da soli**, senza dover aggiungere `?api_key=` a mano. Puoi aggiungere anche `POSTERIUM_MDBLIST_KEY` con la tua chiave MDBList. |

> ⚠️ Queste 3 chiavi sono **solo tue**, sulla **tua** istanza. Non metterle su un'istanza pubblica condivisa con estranei.
>
> 🎨 **Vuoi personalizzare i badge dei CATALOGHI?** I poster nei cataloghi Stremio non usano la tua configurazione salvata, ma le impostazioni dell'istanza. Per disattivare qualcosa anche lì, aggiungi qui una riga per ogni preferenza, es: `POSTERIUM_RANKING_BADGES=0` (niente badge Top 10), `POSTERIUM_BADGE_YEAR=0` (niente anno), `POSTERIUM_NETWORK_LOGO=0` (niente logo Netflix ecc.). Lista completa nella tabella **"Default di stile d'istanza"** nella sezione [Variabili d'Ambiente](#-variabili-dambiente). Le impostazioni salvate dall'editor hanno sempre la precedenza.

#### Passo 3 — Rendi effettive le impostazioni (Redeploy)

Le impostazioni nuove vengono lette **solo al deploy successivo** — quindi devi rilanciare il deploy:

**Deployments** (in alto) → trova l'ultimo deploy → clicca i **tre puntini ⋯** → **Redeploy** → conferma **Redeploy**.

Attendi ~1 minuto. Fatto! 🎉

#### Passo 4 — Prova che tutto funziona

1. Apri `https://<tuo-app>.vercel.app` — dovresti vedere Posterium.
2. Vai in **Impostazioni** nell'app e, se non hai messo le chiavi nelle env, incollale lì e premi **Salva Profilo**.
3. Su Stremio incolla il tuo manifest: `https://<tuo-app>.vercel.app/manifest.json`

**Non funziona qualcosa?** Leggi prima i 3 casi qui sotto — risolvono il 90% dei problemi:

| Vedi questo | Significa | Cosa fare |
|---|---|---|
| Catalogo vuoto su Stremio | Manca la chiave TMDB | Aggiungi `POSTERIUM_TMDB_KEY` nelle Environment Variables (Passo 2) **e fai Redeploy** |
| Errore *“no HMAC secret to sign a stateless profile”* | Manca la firma segreta | Aggiungi `CONFIG_HMAC_SECRET` (Passo 2, riga 1) **e fai Redeploy** |
| Salvataggio o best-fit non vanno (ma in locale sì) | Manca l'interruttore editor | Aggiungi `POSTERIUM_PUBLIC_INSTANCE=1` (Passo 2, riga 2) **e fai Redeploy** |

---

### 🔀 Due strade — scegli quella che fa per te

Dopo il Passo 3 hai già Posterium online. Ora scegli quanto vuoi che **ricordi**:

#### 🟢 Strada Semplice — *“Voglio solo provare”* (consigliata per iniziare)

**Non devi fare altro.** Con le 3 impostazioni del Passo 2 hai già tutto per provare editor, anteprima WYSIWYG e condividere poster.

Come funziona: quando premi **Salva Profilo**, il server crea un **link speciale** con tutta la tua configurazione dentro (es. `?config=eyJ...`). Il tuo browser lo ricorda da solo e puoi condividerlo tra dispositivi — **niente database da configurare**.

| ✅ Cosa funziona | ⚠️ Limiti |
|---|---|
| Poster generati e condivisibili | Niente sezione **"I miei poster"** salvata sul server |
| Anteprima editor identica a Stremio | Niente mapping per-titolo salvati tra deploy |
| Link `?config=` condivisibile | Le chiavi TMDB/MDBList viaggiano nel link (`?api_key=`) |
| Rientro automatico nello stesso browser | Niente manifest personale `/u/<uuid>/manifest.json` |

> Quando vuoi passare alla Strada Completa, ti basta aggiungere il database (qui sotto) — **non devi rifare il deploy da zero**.

#### 🔵 Strada Completa — *“Lo uso tutti i giorni / su più dispositivi”* (con salvataggio vero)

Aggiungi un **piccolo database** (si chiama **Vercel KV / Global Config / Upstash**) dove Posterium salva per davvero profili, mapping e chiavi cifrate. È gratis entro limiti generosi.

> 📌 **Nota sui nomi**: Vercel ha rinominato **KV → "Global Config"**. Nello **Storage** che vedi oggi trovi sia **Global Config** (il rebrand di Vercel KV, la scelta più semplice) sia **Upstash** (il provider Redis da cui nasce). Entrambi forniscono le `KV_REST_API_URL`/`KV_REST_API_TOKEN` che Posterium legge. Se scegli Upstash dal Marketplace, verifica poi che le env aggiunte al progetto si chiamino **esattamente** `KV_REST_API_URL` e `KV_REST_API_TOKEN` (a volte le mette come `UPSTASH_REDIS_REST_URL`/`..._TOKEN` — in quel caso rinominale).

**Come attivarlo (2 minuti):**

1. Vercel Dashboard → in alto clicca **Storage** → **Create Database** → scegli **Global Config** (consigliato) oppure **Upstash** dal Marketplace.
2. Clicca **Create** e collega (**Connect**) il database al tuo progetto Posterium quando te lo chiede.
3. Vercel aggiunge da solo due impostazioni: `KV_REST_API_URL` e `KV_REST_API_TOKEN` — non devi toccarle (verifica i nomi, vedi nota sopra).
4. Torna su **Deployments → ⋯ → Redeploy** (come al Passo 3).
5. Verifica: apri `https://<tuo-app>.vercel.app/api/status` — nella sezione **storage** dovresti leggere `kv` (se leggi `memory` o `none`, il database non è collegato — ripeti dal punto 2).

**Impostazioni consigliate in questa modalità** (sempre in Settings → Environment Variables):

| Variabile | Quando serve |
|---|---|
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | 🔴 Create da Vercel al punto 3 — non toccarle |
| `POSTERIUM_PUBLIC_INSTANCE=1` | 🔴 Già messa al Passo 2 — lasciala |
| `CONFIG_HMAC_SECRET` | 🟠 Consigliata — sblocca anche i link `?config=` di backup |
| `PROFILE_ENCRYPTION_KEY` | 🟠 Consigliata — cifra le chiavi salvate (`openssl rand -hex 32`) |

Dove finiscono i dati: profili/mapping/chiavi su **KV Upstash** · cache poster in memoria (si azzera ad ogni cold start, è normale) · cache classifiche su `/tmp`.

---

### ℹ️ Cose utili da sapere

**Piano Hobby (gratis) — limiti:** le funzioni Vercel durano max **10 secondi** (a pagamento 60s). Se una griglia di poster è molto grande può andare in timeout al primo caricamento — ricarica la pagina. La cache si svuota quando l'app va in "cold start" (normale su Hobby). Il **warmup** automatico non completa su Hobby — non è un problema.

**Altri errori comuni:**

| Messaggio | Soluzione |
|---|---|
| `TMDB API key is missing` (poster 404) | La richiesta non ha una chiave: o usi un link `?u=<uuid>` con profilo salvato, o aggiungi `?api_key=TUA_CHIAVE` al link, o imposta `POSTERIUM_TMDB_KEY` e fai Redeploy |
| `ENOENT` / `Storage not configured` | Normale se sei in **Strada Semplice**: i profili restano nel link `?config=`. Se vuoi il salvataggio vero, segui la **Strada Completa** qui sopra |
| Cataloghi vuoti | Come sopra: serve una chiave TMDB nella richiesta |

📌 **I tuoi manifest Stremio:**
- Standard: `https://<tuo-app>.vercel.app/manifest.json`
- Con profilo salvato (solo Strada Completa): `https://<tuo-app>.vercel.app/u/<uuid>/manifest.json`
- Stateless (Strada Semplice): usa il manifest standard + link con `?config=`

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
| `POSTERIUM_PUBLIC_INSTANCE` | 🟠 Su Vercel/HF | `=1` apre le route admin senza token (editor completo: salvataggio poster, best-fit 1-click). In produzione senza questo flag né `POSTERIUM_ADMIN_TOKEN` le route admin restano chiuse (fail-closed) → l'editor non salva e il best-fit non esce. Sempre attiva in dev. |
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
| `POSTERIUM_AUTO_FIT_TIMEOUT_MS` | ❌ | Tetto dello **scoring** best-fit logo (default: 1200; clamp 300–10000) |
| `POSTERIUM_AUTO_FIT_FETCH_TIMEOUT_MS` | ❌ | Tetto dei **fetch** best-fit (logo + candidati da TMDB, default: 5000; clamp 1000–15000) |
| `POSTERIUM_BEST_FIT_ENABLED` | ❌ | Interruttore globale del best-fit: `0`/`false` lo disabilita sempre (vince su config/query/defaults), `1`/`true` lo forza sempre, non impostato = automatico. Utile su Vercel/HF dove il toggle client o i defaults non sempre arrivano al server. |
| `POSTERIUM_TMDB_KEY` | ❌ | Chiave TMDB **d'istanza (fallback, opt-in)**: usata solo quando la richiesta (header/query) e il profilo non portano una chiave. Per istanze **personali** (es. Vercel con un solo utente) dove i cataloghi devono funzionare senza passare `api_key`. ⚠️ Non impostarla su istanze pubbliche multi-utente (quota condivisa). |
| `POSTERIUM_MDBLIST_KEY` | ❌ | Chiave MDBList **d'istanza (fallback, opt-in)**: stessa logica di `POSTERIUM_TMDB_KEY`, per i rank anime. |
| `POSTERIUM_RATING_WAIT_MS` | ❌ | Attesa max upgrade voto TMDB+IMDb (default: 1500; clamp 300–10000) |

**Default di stile d'istanza** (`POSTERIUM_*`): definiscono la resa di base dei poster anche quando `defaults.json` è vuoto o non persiste (es. Vercel senza KV) — e sono **l'unico modo per far rispettare le preferenze ai poster dei CATALOGHI** (il catalogo usa `getServerDefaults()`, non il config utente). Il file/KV salvato dall'editor vince sempre su queste env. Insieme alla chiave d'istanza, sono pensate per istanze personali.

| Variabile | Valori | Default di stile che imposta |
|---|---|---|
| `POSTERIUM_GLOBAL_BADGES` | `1`/`0` | badge genere/rating globali |
| `POSTERIUM_RANKING_BADGES` | `1`/`0` | badge trend/ranking |
| `POSTERIUM_BADGE_GENRE` / `_YEAR` / `_RATING` | `1`/`0` | singoli componenti del badge |
| `POSTERIUM_NETWORK_LOGO` | `1`/`0` | logo network |
| `POSTERIUM_BADGE_STYLE` | `shadow/pill/bar/colored/bordo/vetro` | stile badge genere |
| `POSTERIUM_RANKING_BADGE_STYLE` | `default/bar/colored/pill/netflix` | stile badge trend |
| `POSTERIUM_RIBBON_SIDE` | `left/right` | lato nastro Netflix |
| `POSTERIUM_BLUR_ENABLED` / `_INTENSITY` / `_FADE` / `_DARKNESS` | `1/0`, numeri | sfocatura |
| `POSTERIUM_GRADIENT_HEIGHT` | numero 5–100 | altezza gradiente |
| `POSTERIUM_AUTO_ROTATE_CLEAN` / `_LOGO_FIT_ENABLED` | `1`/`0` | rotazione/auto-fit |
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
