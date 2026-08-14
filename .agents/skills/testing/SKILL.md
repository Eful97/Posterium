---
name: testing
description: >
  Test commands and workflow for Posterium — Vitest unit suite (~566 tests,
  61 files), Playwright E2E (posterium-visual.spec.ts + posterium-smoke.spec.ts),
  the deterministic mock server (e2e/mock-server.mjs), snapshot update policy,
  and the full `npm run verify` gate (tsc + eslint + vitest + next build).
  Trigger: "run tests", "vitest", "playwright", "snapshot", "e2e", "test fails",
  "update snapshots", "mock server", "verifica".
---

The test gate for any change. For render-affecting changes the visual suite is a
HARD gate (see `poster-visual` skill and `.agents/visual-testing.md`).

## Unit tests (Vitest)

```bash
npm test            # vitest run (single pass)
npx vitest          # watch mode
npx vitest run --coverage
```

- ~566 tests / 61 files across store, API routes, React components, badge SVG,
  poster-fit, utilities.
- `pretest` auto-regenerates RENDER_VERSION (and app version) before running.
- To run one file: `npx vitest run src/__tests__/poster-render-deadline.test.ts`.

## E2E (Playwright)

```bash
npx playwright install chromium     # first time
npx playwright test e2e/posterium-visual.spec.ts    # visual regression (4 UI + 21 poster API)
npx playwright test e2e/posterium-smoke.spec.ts     # functional smoke
npx playwright test e2e/            # everything
npm run e2e:ui                      # Playwright UI runner
```

- **No TMDB_API_KEY needed**: `playwright.config.ts` auto-starts
  `e2e/mock-server.mjs` (dedicated port + `.next-e2e` distDir), so tests work
  even with `npm run dev` running.
- **Update snapshots** (only for INTENTIONAL appearance changes):
  ```bash
  npx playwright test e2e/posterium-visual.spec.ts --update-snapshots
  ```
  Review the `.png` diffs before committing them.

## Adding a new external API mock

1. Add a handler in `e2e/mock-server.mjs` (deterministic data).
2. Add the matching env override in `playwright.config.ts` so the app points at
   the mock URL (e.g. `TMDB_BASE_URL`, `MDBLIST_API_URL`, `JUSTWATCH_API_URL`).

## Full verification gate

```bash
npm run verify    # tsc --noEmit && eslint . && vitest run && next build
```

Run this before finishing any non-trivial change. It is exactly what the
`poster-render` agent's workflow ends with.

## Rules

- Never update snapshots to hide a real divergence — fix the code instead.
- After ANY render-affecting change: visual suite must pass (hard gate).
- Mock server is deterministic — don't rely on the live network in tests.
