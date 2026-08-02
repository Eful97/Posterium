import { test, expect, type Page } from "@playwright/test"

// I test poster girano SENZA TMDB_API_KEY: le chiamate esterne (TMDB, immagini,
// JustWatch, Wikidata, IMDb) vengono servite dal mock server locale
// `e2e/mock-server.mjs`, avviato da playwright.config.ts. Per aggiungere nuovi
// mock, aggiungi un handler in quel file (vedi header del mock server).

const MOVIE_TMDB = 19995 // Avatar (id usato dai dati fittizi del mock server)
const MEDIA_TYPE = "movie"
// Poster path servito dal mock server sotto /t/p/...
const POSTER_PATH = "/mocked/avatar.jpg"

function posterUrl(params: Record<string, string>, mediaType = MEDIA_TYPE, id: number | string = MOVIE_TMDB): string {
  const qs = new URLSearchParams({ ...params, poster: POSTER_PATH, preview: "1" })
  return `/api/poster/${mediaType}/${id}?${qs.toString()}`
}

// Helper: render a poster URL in the page and return a locator for the <img>
async function renderPoster(page: Page, posterUrl: string) {
  await page.setViewportSize({ width: 1280, height: 1600 })
  // Navigate first so the relative src resolves against the app origin:
  // `setContent` alone leaves baseURI on about:blank and the /api/poster URL
  // would never load.
  await page.goto("/")
  await page.setContent(`
    <html>
      <body style="margin:0;background:#000;display:flex;align-items:flex-start;justify-content:center;">
        <img id="poster" src="${posterUrl}" style="display:block;max-width:100%;height:auto;" />
      </body>
    </html>
  `)
  // Wait for the image to fully load
  await page.waitForFunction(() => {
    const img = document.getElementById("poster") as HTMLImageElement
    return img && img.complete && img.naturalWidth > 0
  }, { timeout: 30_000 })
  return page.locator("#poster")
}

//
// ─── HOME PAGE (no API key needed) ────────────────────────────
//

test("home — full page", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveScreenshot("home-fullpage.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.03,
  })
})

test("home — hero viewport", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page).toHaveScreenshot("home-viewport.png", {
    maxDiffPixelRatio: 0.03,
  })
})

test("home — mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page).toHaveScreenshot("home-mobile.png", {
    maxDiffPixelRatio: 0.03,
  })
})

//
// ─── STATUS PAGE (no API key needed) ──────────────────────────
//

test("status — page renders", async ({ page, request }) => {
  await page.goto("/status")
  // Determinismo: il server dev E2E è riusato tra i run (reuseExistingServer
  // locale) e la card cache cresce con i tag, cambiando l'altezza della pagina
  // full-page. Svuotiamo la cache prima dello screenshot: gli health check la
  // ripopolano con lo stesso set deterministico di tag (mock server).
  await request.post("/api/cache/clear")
  // Give the health check time to load (it's async with multiple fetches)
  await page.waitForTimeout(3000)
  await expect(page).toHaveScreenshot("status-page.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.05,
  })
})

//
// ─── POSTER API — functional ──────────────────────────────────
//
// Questi test verificano che l'API restituisca immagini valide per varie
// configurazioni di badge/gradiente/blur. Non richiedono chiave TMDB.

test.describe("poster API — functional", () => {

  test("default badge (shadow style) — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "shadow", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
    expect(res.headers()["content-type"]).toMatch(/image\/(?:png|webp|jpeg)/)
  })

  test("badge style: pill — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "pill", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: bar — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "bar", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: colored — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "colored", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("ranking badge (bar) + label — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "bar" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("extra badge (custom text) — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Oscar 2024" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("gradient up + down — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", gradDir: "up", gradHeight: "30", gradColor: "000000", gradOpacity: "0.8" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("blur enabled — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", blur: "8", bf: "60", bd: "40" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("all badges off (clean poster) — valid image", async ({ request }) => {
    const url = posterUrl({ badges: "0", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("full config — valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "8.0", badges: "1", ranking: "1", rank: "5", label: "Top 5", bs: "pill", rs: "bar", gradDir: "up", gradHeight: "25", blur: "5", bf: "50", bd: "30" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })
})

//
// ─── POSTER API — visual regression ───────────────────────────
//
// Questi test rendono il poster in pagina e confrontano gli screenshot per
// intercettare regressioni visive nel rendering di badge, gradiente, blur e
// composizione. Deterministici grazie al mock server.

test.describe("poster API — visual regression", () => {

  test("default badge (shadow style) — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "shadow", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-default-shadow.png", { maxDiffPixelRatio: 0.10 })
  })

  test("pill badge — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "pill", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-pill.png", { maxDiffPixelRatio: 0.10 })
  })

  test("bar badge — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "bar", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-bar.png", { maxDiffPixelRatio: 0.10 })
  })

  test("colored badge — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "colored", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-colored.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking badge + label — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "bar" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking.png", { maxDiffPixelRatio: 0.10 })
  })

  test("anime ranking (netflix ribbon) — screenshot", async ({ page }) => {
    // media_type=tv + id 19995 (Avatar) nella MDBList anime mockata → animeRankResult=1.
    // Il mock MDBList anime (mock-server.mjs) mette Avatar in posizione #1.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rs: "netflix" }, "tv", 19995)
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-anime.png", { maxDiffPixelRatio: 0.10 })
  })

  test("extra badge — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Oscar 2024" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-extra.png", { maxDiffPixelRatio: 0.10 })
  })

  test("gradient up — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", gradDir: "up", gradHeight: "30", gradColor: "000000", gradOpacity: "0.8" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-gradient-up.png", { maxDiffPixelRatio: 0.10 })
  })

  test("blur enabled — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", blur: "8", bf: "60", bd: "40" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-blur.png", { maxDiffPixelRatio: 0.10 })
  })

  test("clean poster (no badges) — screenshot", async ({ page }) => {
    const url = posterUrl({ badges: "0", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-clean.png", { maxDiffPixelRatio: 0.10 })
  })

  test("full feature poster — screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "8.0", badges: "1", ranking: "1", rank: "5", label: "Top 5", bs: "pill", rs: "bar", gradDir: "up", gradHeight: "25", blur: "5", bf: "50", bd: "30" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-full-feature.png", { maxDiffPixelRatio: 0.10 })
  })
})
