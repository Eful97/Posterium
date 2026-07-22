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
  <a href="#-deploy-koyeb-gratis-247"><img src="https://img.shields.io/badge/Deploy-Koyeb-000000?style=for-the-badge&logo=koyeb&logoColor=white" alt="Koyeb Deploy" /></a>
  <a href="#-deploy-termux-android-247"><img src="https://img.shields.io/badge/Deploy-Termux-171717?style=for-the-badge&logo=android&logoColor=green" alt="Termux Deploy" /></a>
  <a href="#-docker--locale"><img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
</p>

---

## 📸 Screenshots

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Screenshot%202026-07-22%20121411.png" alt="Posterium Home" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Screenshot%202026-07-22%20121434.png" alt="Posterium Editor" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/Screenshot%202026-07-22%20121455.png" alt="Posterium Badge" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/1405.jpg" alt="Poster Demo 1" width="32%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/66732.jpg" alt="Poster Demo 2" width="32%" />
  <img src="https://raw.githubusercontent.com/Eful97/Posterium/master/public/Screen/76479.jpg" alt="Poster Demo 3" width="32%" />
</div>

---

## ✨ Feature Principali

- 🖼️ **Selezione Poster Clean in 1-Click** — Scegli la tua locandina pulita (senza testo) preferita con un singolo click e fissala per sempre su Stremio. Supporta l'algoritmo *Best Fit* che rileva in automatico il poster perfetto per il logo.
- 🎨 **Personalizzazione Badge Completa** — 6 stili per badge genere/rating (*Shadow, Pill, Bar, Colored, Bordo, Vetro*) e 5 stili per badge trend (*Default, Bar, Colored, Pill, Nastro Netflix*). Colori accent adattivi al poster e testo libero personalizzato per singolo titolo.
- 🏆 **Badge Automatici Intelligenti** — Classifiche JustWatch Italia, MDBList Trend, IMDb Top 250 (*Absolute Cinema*), premi Oscar/Cannes/BAFTA/Emmy (da Wikidata), saghe/franchise e registi cult.
- 🍿 **Nastro Netflix Top 10** — Badge con l'iconico nastro rosso verticale allineato a sinistra e affiancamento automatico del logo della piattaforma.
- ⭐ **Rating Accurato** — Voto medio bilanciato ed imparziale IMDb + TMDB.
- 🌀 **Sfocatura Sfondo Nativa (Sharp C++)** — Effetto blur sul fondo ultra-rapido generato in soli ~10-20ms.
- 🔄 **Rotazione Poster 24h** — Cambia automaticamente locandina pulita ogni giorno tra i poster selezionati.
- ⚡ **Generatore Stremio Addon Proxy** — Incolla il link `manifest.json` di qualsiasi add-on Stremio (Cyberflix, Cinemeta, Streaming Catalogs, Torrentio, ecc.) per iniettare automaticamente i poster dinamici di Posterium nei cataloghi esterni!
- 📡 **Integrazione Stremio Istantanea** — Generazione dinamica tramite manifest Stremio con caching e warmup automatico.

---

## ⚡ Deploy Rapido

### ☁️ Deploy Koyeb (Gratis, 24/7, No Carta di Credito)

1. **Registrazione**: Vai su [Koyeb.com](https://koyeb.com) (nessuna carta richiesta).
2. **Crea App**: Clicca **Create App** ➔ Seleziona **GitHub** ➔ Scegli il repository `Eful97/Posterium`.
3. **Variabili d'Ambiente** (Environment Variables):
   - `TMDB_API_KEY`: La tua chiave API TMDB
   - `MDBLIST_API_KEY`: *(opzionale)* Chiave MDBList
   - `OMDB_API_KEY`: *(opzionale)* Chiave OMDb
   - `KV_REST_API_URL` & `KV_REST_API_TOKEN`: *(opzionale)* Database Redis [Upstash](https://upstash.com) per mantenere i salvataggi tra i redeploy.
4. **Deploy**: Mantieni il builder su **Dockerfile** e clicca **Deploy**. In 2-3 minuti l'app è pronta!

📌 *URL Manifest Stremio*: `https://tuo-app.koyeb.app/manifest.json`

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
docker run -p 8080:8080 -e TMDB_API_KEY=la_tua_chiave_tmdb posterium
```

---

## 🔑 Variabili d'Ambiente

| Variabile | Obbligatoria | Descrizione |
|---|:---:|---|
| `TMDB_API_KEY` | ✅ | Chiave API TMDB (v3) |
| `MDBLIST_API_KEY` | ❌ | Per classifiche anime e voto IMDb aggregato |
| `OMDB_API_KEY` | ❌ | Fallback per voto IMDb quando MDBList non è fornito |
| `KV_REST_API_URL` | ❌ | URL Upstash Redis per salvataggio persistente cloud |
| `KV_REST_API_TOKEN` | ❌ | Token Upstash Redis |
| `ADMIN_TOKEN` | ❌ | Protegge gli endpoint di gestione cache (`/api/cache/clear`) |

---

## 🙏 Credits

Ispirato da [erdb](https://github.com/realbestia1/erdb) di realbestia1 (licenza AGPL v3).
