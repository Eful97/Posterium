import { expect, test } from "@playwright/test"

test("home visual smoke", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveScreenshot("home.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.03,
  })
})
