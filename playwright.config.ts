import { defineConfig, devices } from "@playwright/test"

const isCi = process.env.CI === "true"
const port = process.env.PLAYWRIGHT_PORT || (isCi ? "41731" : "3000")

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `node ./node_modules/next/dist/bin/next dev -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
})
