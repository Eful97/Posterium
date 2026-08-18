import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// BEST_FIT_GLOBAL è letto a module-load (`const raw = process.env...`), quindi
// ogni import deve avvenire DOPO l'impostazione dell'env (stesso pattern di
// config-token.test.ts). `importConfig()` resetta il registro moduli e
// re-importa così il modulo legge l'env corrente.
async function importConfig() {
  vi.resetModules()
  return import("@/lib/best-fit-config")
}

describe("POSTERIUM_BEST_FIT_ENABLED (module-level)", () => {
  beforeEach(() => {
    delete process.env.POSTERIUM_BEST_FIT_ENABLED
  })
  afterEach(() => {
    delete process.env.POSTERIUM_BEST_FIT_ENABLED
    vi.resetModules()
  })

  it("auto quando la variabile non è impostata", async () => {
    delete process.env.POSTERIUM_BEST_FIT_ENABLED
    const { BEST_FIT_GLOBAL } = await importConfig()
    expect(BEST_FIT_GLOBAL).toBe("auto")
  })

  it("off per valori falsy", async () => {
    for (const v of ["0", "false", "off", "no", "OFF"]) {
      process.env.POSTERIUM_BEST_FIT_ENABLED = v
      const { BEST_FIT_GLOBAL } = await importConfig()
      expect(BEST_FIT_GLOBAL, `valore: ${v}`).toBe("off")
    }
  })

  it("on per valori truthy", async () => {
    for (const v of ["1", "true", "on", "yes", "ON"]) {
      process.env.POSTERIUM_BEST_FIT_ENABLED = v
      const { BEST_FIT_GLOBAL } = await importConfig()
      expect(BEST_FIT_GLOBAL, `valore: ${v}`).toBe("on")
    }
  })

  it("ignora spazi bianchi", async () => {
    process.env.POSTERIUM_BEST_FIT_ENABLED = " 0 "
    const { BEST_FIT_GLOBAL } = await importConfig()
    expect(BEST_FIT_GLOBAL).toBe("off")
  })
})
