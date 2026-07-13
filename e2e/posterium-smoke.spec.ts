import { expect, test } from "@playwright/test"

test("home loads and exposes main actions", async ({ page }) => {
  await page.goto("/")

  const logo = page.getByAltText("Posterium")
  const logoFallback = page.getByText("Posterium")
  await expect(logo.or(logoFallback).first()).toBeVisible()

  await expect(page.getByPlaceholder(/cerca un film|cerca una serie|search/i)).toBeVisible()
  await expect(page.getByRole("button", { name: /AIOMetadata URL/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /Installa catalogo/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /I miei poster/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /Impostazioni|settings/i })).toBeVisible()
})

test("home works on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")

  await expect(page.getByPlaceholder(/cerca/i)).toBeVisible()
  const logo = page.getByAltText("Posterium")
  const logoFallback = page.getByText("Posterium")
  await expect(logo.or(logoFallback).first()).toBeVisible()
})

test("can open an editor from search", async ({ page }) => {
  const hasTmdbKey = process.env.TMDB_API_KEY?.length > 0
  test.skip(!hasTmdbKey, "TMDB_API_KEY not set")

  await page.goto("/")

  const search = page.getByPlaceholder(/cerca/i)
  await search.fill("avatar")
  await search.press("Enter")

  await expect(page.getByText(/Avatar/i).first()).toBeVisible({ timeout: 20_000 })
  await page.getByText(/Avatar/i).first().click()

  await expect(page.getByText(/Anteprima/i)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Poster/i)).toBeVisible()
  await expect(page.getByText(/Loghi/i)).toBeVisible()
})
