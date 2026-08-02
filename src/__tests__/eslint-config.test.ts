import { describe, expect, it } from "vitest"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { ESLint } from "eslint"

// Guardia di regressione per la configurazione ESLint:
// `npm run lint` deve restare verde in locale anche dopo i test E2E,
// che generano artefatti di build in `.next-e2e` (distDir di playwright).
// Senza gli ignore qui sotto, eslint lintava quei file generati e falliva
// con centinaia di errori (require() style import, @ts-ignore, ...).
describe("eslint config", () => {
  it("ignores generated build dirs (.next, .next-e2e)", async () => {
    const eslint = new ESLint({})
    for (const file of [".next/dev/build/probe.js", ".next-e2e/dev/build/probe.js"]) {
      expect(await eslint.isPathIgnored(file), `${file} should be ignored`).toBe(true)
    }
  })

  it("does not ignore real source files", async () => {
    const eslint = new ESLint({})
    expect(await eslint.isPathIgnored("src/app/layout.tsx")).toBe(false)
  })

  it("lints clean even when a generated artifact with lint errors sits in .next-e2e", async () => {
    const probeDir = path.join(".next-e2e", "dev", "build")
    const probe = path.join(probeDir, "eslint-guard-probe.js")
    await mkdir(probeDir, { recursive: true })
    // Same patterns that used to break the lint: require() + @ts-ignore
    await writeFile(probe, "const x = require('x')\n// @ts-ignore\nmodule.exports = x\n")
    try {
      const eslint = new ESLint({})
      const [result] = await eslint.lintFiles(probe)
      expect(result.errorCount).toBe(0)
    } finally {
      await rm(probe, { force: true })
    }
  })
})
