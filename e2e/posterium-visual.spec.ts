import { test, expect, type Page, type APIRequestContext } from "@playwright/test"

const hasTmdbKey = !!(process.env.TMDB_API_KEY?.length)
const MOVIE_TMDB = 19995 // Avatar
const MEDIA_TYPE = "movie"

// Helper: get a valid poster path for the test movie
let _posterPath: string

async function getPosterPath(request: APIRequestContext): Promise<string> {
  if (_posterPath) return _posterPath
  const url = `/api/tmdb/${MOVIE_TMDB}/images?type=${MEDIA_TYPE}&languages=en,null&api_key=${process.env.TMDB_API_KEY}`
  const res = await request.get(url)
  if (!res.ok()) return "" as string
  const data = await res.json()
  const clean = (data.posters || []).find((p: { iso_639_1: string | null }) => p.iso_639_1 === null)
  _posterPath = clean?.file_path || data.posters?.[0]?.file_path || ""
  return _posterPath
}

// Helper: render a poster URL in the page and return a locator for the <img>
async function renderPoster(page: Page, posterUrl: string) {
  await page.setViewportSize({ width: 1280, height: 1600 })
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

test("status — page renders", async ({ page }) => {
  await page.goto("/status")
  // Give the health check time to load (it's async with multiple fetches)
  await page.waitForTimeout(3000)
  await expect(page).toHaveScreenshot("status-page.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.05,
  })
})

//
// ─── POSTER API — functional (requires TMDB_API_KEY) ─────────
//
// These tests verify the API returns valid images for various
// badge/gradient/blur configurations.

test.describe("poster API — functional", () => {

  test("default badge (shadow style) — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&bs=shadow&badges=1&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
    expect(res.headers()["content-type"]).toMatch(/image\/(?:png|webp|jpeg)/)
  })

  test("badge style: pill — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&bs=pill&badges=1&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: bar — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&bs=bar&badges=1&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: colored — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&bs=colored&badges=1&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("ranking badge (bar) + label — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&badges=1&ranking=1&rank=3&label=${encodeURIComponent("Top 3")}&rs=bar&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("extra badge (custom text) — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&badges=1&ranking=1&extra=${encodeURIComponent("Oscar 2024")}&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("gradient up + down — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&badges=1&ranking=0&gradDir=up&gradHeight=30&gradColor=000000&gradOpacity=0.8&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("blur enabled — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&badges=1&ranking=0&blur=8&bf=60&bd=40&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("all badges off (clean poster) — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&badges=0&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("full config — valid image", async ({ request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=8.0&badges=1&ranking=1&rank=5&label=${encodeURIComponent("Top 5")}&bs=pill&rs=bar&gradDir=up&gradHeight=25&blur=5&bf=50&bd=30&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })
})

//
// ─── POSTER API — visual regression (requires TMDB_API_KEY) ──
//
// These tests render the poster image in a page and compare
// screenshots to catch visual regressions in badge rendering,
// gradient, blur, and overall composition.

test.describe("poster API — visual regression", () => {

  test("default badge (shadow style) — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&bs=shadow&badges=1&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-default-shadow.png", { maxDiffPixelRatio: 0.10 })
  })

  test("pill badge — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&bs=pill&badges=1&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-pill.png", { maxDiffPixelRatio: 0.10 })
  })

  test("bar badge — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&bs=bar&badges=1&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-bar.png", { maxDiffPixelRatio: 0.10 })
  })

  test("colored badge — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&bs=colored&badges=1&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-colored.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking badge + label — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&badges=1&ranking=1&rank=3&label=${encodeURIComponent("Top 3")}&rs=bar&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking.png", { maxDiffPixelRatio: 0.10 })
  })

  test("extra badge — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&badges=1&ranking=1&extra=${encodeURIComponent("Oscar 2024")}&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-extra.png", { maxDiffPixelRatio: 0.10 })
  })

  test("gradient up — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&badges=1&ranking=0&gradDir=up&gradHeight=30&gradColor=000000&gradOpacity=0.8&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-gradient-up.png", { maxDiffPixelRatio: 0.10 })
  })

  test("blur enabled — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=7.8&badges=1&ranking=0&blur=8&bf=60&bd=40&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-blur.png", { maxDiffPixelRatio: 0.10 })
  })

  test("clean poster (no badges) — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&badges=0&ranking=0&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-clean.png", { maxDiffPixelRatio: 0.10 })
  })

  test("full feature poster — screenshot", async ({ page, request }) => {
    test.skip(!hasTmdbKey, "TMDB_API_KEY not set")
    const path = await getPosterPath(request)
    const url = `/api/poster/${MEDIA_TYPE}/${MOVIE_TMDB}?poster=${encodeURIComponent(path)}&genreName=Action&voteAverage=8.0&badges=1&ranking=1&rank=5&label=${encodeURIComponent("Top 5")}&bs=pill&rs=bar&gradDir=up&gradHeight=25&blur=5&bf=50&bd=30&api_key=${process.env.TMDB_API_KEY}&preview=1`
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-full-feature.png", { maxDiffPixelRatio: 0.10 })
  })
})