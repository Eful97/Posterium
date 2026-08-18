import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isBreakerOpen, recordSuccess, recordFailure, __resetCircuitBreaker } from "@/lib/awards"

// Il breaker è variabile module-level: ogni test parte da zero così le soglie
// non si contaminano tra test (i moduli vitest sono isolati per file).
describe("circuit breaker Wikidata (half-open)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    __resetCircuitBreaker()
  })

  afterEach(() => {
    vi.useRealTimers()
    __resetCircuitBreaker()
  })

  it("starts closed and opens only after the failure threshold", () => {
    expect(isBreakerOpen()).toBe(false)

    for (let i = 1; i < 5; i++) {
      recordFailure()
      // Fino alla soglia le richieste continuano a passare (i fallimenti
      // vengono registrati, ma il breaker non rifiuta ancora nulla).
      expect(isBreakerOpen()).toBe(false)
    }

    recordFailure() // 5° failure → apre la finestra di backoff
    expect(isBreakerOpen()).toBe(true)
  })

  it("recovers via half-open after the backoff window expires (success closes it)", () => {
    for (let i = 0; i < 5; i++) recordFailure()
    expect(isBreakerOpen()).toBe(true)

    // Finestra scaduta: entra in half-open, UNA richiesta di prova passa.
    vi.setSystemTime(Date.now() + 61_000)
    expect(isBreakerOpen()).toBe(false) // la prova può uscire
    expect(isBreakerOpen()).toBe(true)  // le altre restano rifiutate

    // La prova ha successo → il breaker si chiude e il servizio riprende.
    recordSuccess()
    expect(isBreakerOpen()).toBe(false)
  })

  it("a failed trial re-opens the window for another backoff", () => {
    for (let i = 0; i < 5; i++) recordFailure()

    vi.setSystemTime(Date.now() + 61_000)
    expect(isBreakerOpen()).toBe(false) // prova
    recordFailure() // la prova fallisce

    // Finestra re-aperta: nessuna richiesta passa per altri 60s.
    expect(isBreakerOpen()).toBe(true)
    vi.setSystemTime(Date.now() + 61_000)
    expect(isBreakerOpen()).toBe(false) // prossima prova possibile
  })

  it("recovers automatically after failures never exceeding the threshold", () => {
    for (let i = 0; i < 4; i++) recordFailure()
    recordSuccess() // un successo azzera i contatori
    expect(isBreakerOpen()).toBe(false)
    for (let i = 0; i < 4; i++) recordFailure()
    expect(isBreakerOpen()).toBe(false) // sotto soglia: ancora chiuso
  })
})