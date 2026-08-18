// Genera gli screenshot del README (public/Screen/*) usando il mock server E2E,
// così le immagini sono deterministiche e non richiedono chiavi/network reali.
//
// Uso: node scripts/take-readme-shots.mjs
// Avvia: mock server (e2e/mock-server.mjs) + `next dev` con le base URL puntate
// al mock, poi cattura: home.png, editor.png, myposters.png e i poster demo.

import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import http from "node:http"
import { chromium } from "@playwright/test"

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT_DIR = path.join(ROOT, "public", "Screen")
const APP_PORT = 3100
const MOCK_PORT = 8790
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`
const APP_URL = `http://127.0.0.1:${APP_PORT}`
// Stessa chiave del smoke test E2E (gate client della ricerca: >= 20 char).
const TMDB_KEY = "mock-tmdb-key-0000000000"

const children = []
function start(cmd, args, env) {
  const child = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: "ignore" })
  children.push(child)
  return child
}

function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (Date.now() > deadline) return reject(new Error(`timeout waiting for ${url}`))
      http
        .get(url, (res) => { res.resume(); resolve() })
        .on("error", () => setTimeout(attempt, 500))
    }
    attempt()
  })
}

function cleanup() {
  for (const child of children) {
    try { child.kill("SIGTERM") } catch {}
  }
}
process.on("exit", cleanup)

// localStorage comune: profilo demo, onboarding chiuso, lingua it, chiave.
// NIENTE stub di Math.random: con valore 0 il router interno di Next smette di
// navigare (visto empiricamente); il mock ha comunque dati fissi, quindi il
// podio mostra sempre gli stessi titoli (l'ordine degli slot può variare).
const INIT_SCRIPT = () => {
  try {
    localStorage.setItem("posterium_profile_id", "e2e")
    localStorage.setItem("posterium_onboarding_done", "true")
    localStorage.setItem("preferred_lang", "it")
    localStorage.setItem("tmdb_key", "mock-tmdb-key-0000000000")
  } catch {}
}

async function newPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  // Congela marquee/bob/pulse: screenshot e click stabili.
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.addInitScript(INIT_SCRIPT)
  return page
}

const APP_ENV = {
  NEXT_DIST_DIR: ".next-e2e",
  POSTERIUM_DATA_DIR: path.join(ROOT, ".next-e2e", "data"),
  TMDB_BASE_URL: `${MOCK_URL}/3`,
  TMDB_IMG_URL: `${MOCK_URL}/t/p`,
  NEXT_PUBLIC_TMDB_IMG_URL: `${MOCK_URL}/t/p`,
  JUSTWATCH_API_URL: `${MOCK_URL}/graphql`,
  WIKIDATA_SPARQL_URL: `${MOCK_URL}/sparql`,
  IMDB_CHART_URL: `${MOCK_URL}/chart/top`,
  MDBLIST_API_URL: `${MOCK_URL}/mdblist/api`,
  TRAKT_API_URL: `${MOCK_URL}/trakt`,
  SIMKL_API_URL: `${MOCK_URL}/simkl`,
}

try {
  console.log("[shots] avvio mock server + app…")
  start(process.execPath, ["e2e/mock-server.mjs"], { MOCK_PORT: String(MOCK_PORT) })
  await waitForUrl(`${MOCK_URL}/healthz`, 15_000)
  start(process.execPath, ["./node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", String(APP_PORT)], APP_ENV)
  await waitForUrl(APP_URL, 120_000)

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  // ---- 1. Home (hero + carosello + strip di stato) ----
  {
    const page = await newPage(browser)
    await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" })
    // Podio caricato
    await page.waitForFunction(() => {
      const imgs = Array.from(document.querySelectorAll(".p-frame img"))
      return imgs.length >= 3 && imgs.every((i) => i.complete && i.naturalWidth > 0)
    }, { timeout: 90_000 })
    // Carosello: aspetta che una buona parte delle card abbia il poster caricato
    await page.waitForFunction(() => {
      const imgs = Array.from(document.querySelectorAll(".carousel-track img"))
      const loaded = imgs.filter((i) => i.complete && i.naturalWidth > 0).length
      return imgs.length >= 10 && loaded >= Math.min(10, imgs.length)
    }, { timeout: 90_000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(OUT_DIR, "home.png"), fullPage: true })
    console.log("[shots] home.png ok")
    await page.close()
  }

  // ---- 2. Editor (flusso identico allo smoke test E2E) ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    // Stessa init dello smoke test "can open an editor from search" (niente
    // Math.random: non serve qui e potrebbe interferire con il flusso).
    await page.addInitScript(() => {
      try {
        localStorage.setItem("tmdb_key", "mock-tmdb-key-0000000000")
        localStorage.setItem("posterium_onboarding_done", "true")
        localStorage.setItem("preferred_lang", "it")
        localStorage.setItem("posterium_profile_id", "e2e-smoke-profile")
      } catch {}
    })
    const failedRequests = []
    page.on("requestfailed", (req) => failedRequests.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText}`))
    const consoleErrors = []
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`))
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(`console: ${msg.text()}`) })

    await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" })
    const search = page.getByPlaceholder(/cerca/i).first()
    await search.waitFor({ state: "visible", timeout: 60_000 })
    await search.fill("avatar")
    await search.press("Enter")
    await page.getByText(/Avatar/i).first().waitFor({ state: "visible", timeout: 60_000 })
    await page.getByText(/Avatar/i).first().click()
    // Editor: anteprima server-rendered caricata
    try {
      await page.waitForFunction(() => {
        const img = document.querySelector(".preview-frame img")
        return img && img.complete && img.naturalWidth > 0
      }, { timeout: 30_000 })
    } catch (e) {
      console.log("[shots] DEBUG failedRequests:", JSON.stringify(failedRequests.slice(0, 10), null, 2))
      console.log("[shots] DEBUG consoleErrors:", JSON.stringify(consoleErrors.slice(0, 8), null, 2))
      const state = await page.evaluate(() => ({
        previewFrame: !!document.querySelector(".preview-frame"),
        h3s: Array.from(document.querySelectorAll("h3")).map((h) => h.textContent).slice(0, 8),
        historyState: window.history.state,
      }))
      console.log("[shots] DEBUG editor state:", JSON.stringify(state, null, 2))
      await page.screenshot({ path: path.join(OUT_DIR, "_debug-editor.png") })
      throw e
    }
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(OUT_DIR, "editor.png") })
    console.log("[shots] editor.png ok")
    await page.close()
  }

  // ---- 3. I miei poster (seed di mapping via API, poi vista libreria) ----
  {
    const page = await newPage(browser)
    // Seed mapping nel data dir isolato (route admin fail-open con mock)
    const seed = [
      { tmdbId: 19995, mediaType: "movie", title: "Avatar", genreName: "Azione", voteAverage: 7.9 },
      { tmdbId: 157336, mediaType: "movie", title: "Interstellar", genreName: "Avventura", voteAverage: 8.4 },
      { tmdbId: 27205, mediaType: "movie", title: "Inception", genreName: "Azione", voteAverage: 8.4 },
      { tmdbId: 66732, mediaType: "tv", title: "Stranger Things", genreName: "Fantascienza", voteAverage: 8.6 },
      { tmdbId: 1399, mediaType: "tv", title: "Game of Thrones", genreName: "Dramma", voteAverage: 8.4 },
      { tmdbId: 1396, mediaType: "tv", title: "Breaking Bad", genreName: "Crime", voteAverage: 9.5 },
    ]
    for (const m of seed) {
      await fetch(`${APP_URL}/api/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...m,
          posterPath: "/mocked/avatar.jpg",
          logoPath: null,
          originalPosterPath: null,
          language: "it",
        }),
      })
    }
    await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" })
    await page.getByRole("button", { name: /I miei poster/i }).first().click()
    await page.waitForFunction(() => {
      const imgs = Array.from(document.querySelectorAll(".grid img"))
      const loaded = imgs.filter((i) => i.complete && i.naturalWidth > 0).length
      return loaded >= 4
    }, { timeout: 90_000 })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(OUT_DIR, "myposters.png"), fullPage: true })
    console.log("[shots] myposters.png ok")
    await page.close()
  }

  // ---- 4. Poster demo (render diretti /api/poster, poster esplicito = nessun fetch TMDB) ----
  {
    const demos = [
      { file: "1405.jpg", type: "movie", id: 1405, params: "poster=/mocked/avatar.jpg&genreName=Dramma&voteAverage=8.9&bs=vetro&gradHeight=25&blur=30&bf=50&bd=40&tl=0&logoFit=0&year=2020&preview=1" },
      { file: "66732.jpg", type: "tv", id: 66732, params: "poster=/mocked/avatar.jpg&genreName=Fantascienza&voteAverage=8.6&ranking=1&rank=2&label=Serie%20tv&rs=netflix&gradHeight=25&blur=30&bf=50&bd=40&tl=0&logoFit=0&year=2016&preview=1" },
      { file: "85552.jpg", type: "tv", id: 85552, params: "poster=/mocked/avatar.jpg&genreName=Crime&voteAverage=8.3&bs=bordo&gradHeight=20&blur=25&bf=50&bd=30&tl=0&logoFit=0&year=2018&preview=1" },
    ]
    for (const d of demos) {
      const res = await fetch(`${APP_URL}/api/poster/${d.type}/${d.id}?${d.params}`)
      if (!res.ok) throw new Error(`poster demo ${d.file} -> HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(path.join(OUT_DIR, d.file), buf)
      console.log(`[shots] ${d.file} ok (${buf.length} bytes)`)
    }
  }

  await browser.close()
  console.log("[shots] tutti gli screenshot generati in public/Screen/")
} finally {
  cleanup()
}
