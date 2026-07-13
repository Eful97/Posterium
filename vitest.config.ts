import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "node_modules/**",
      ".next/**",
      "e2e/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
