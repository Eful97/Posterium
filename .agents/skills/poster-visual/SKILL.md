---
name: poster-visual
description: >
  Visual regression and screenshot verification workflow for Posterium. The project
  ships a Playwright suite (`e2e/posterium-visual.spec.ts`) with 4 fixed UI screenshots
  plus 21 poster API tests (10 functional + 11 visual) that run against a deterministic
  local mock server — no TMDB_API_KEY needed. Use to verify the WYSIWYG preview matches
  the server poster, to confirm a render change looks right, to inspect screenshot diffs,
  and to update snapshots only when a change intentionally alters the look. Trigger:
  "run visual tests", "check poster screenshot", "update snapshots", "the poster looks
  wrong", "regressione visiva", or after any rendering change.
---

Posterium guarantees WYSIWYG: the preview uses `/api/poster/{type}/{id}`, the same
route Stremio hits. Visual tests are the gate that proves client/server coherence.

## Available tools

- Built-in Playwright MCP tools (`kilo-playwright_browser_*`): navigate, snapshot,
  screenshot, click/fill, evaluate — for live inspection of the running app.
- The repo Playwright suite (`npx playwright test e2e/`) — deterministic, mock-based.

## The test suite

```
npx playwright test e2e/posterium-visual.spec.ts   # visual only
npx playwright test e2e/                           # visual + smoke
npx playwright test --update-snapshots             # regenerate .png baselines
```

- Runs against `e2e/mock-server.mjs`, auto-started by `playwright.config.ts` on a
  dedicated port with a separate `.next-e2e` distDir. Safe to run while `npm run dev`
  is active.
- No external dependencies, deterministic data for TMDB/JustWatch/Wikidata/IMDb.

## Workflow

1. **Baseline check** — after ANY render-affecting change, run:
   ```
   npx playwright test e2e/posterium-visual.spec.ts
   ```
   Failure means the client and server diverged, OR the look intentionally changed.

2. **Diagnose the diff.** For pixel-diff failures, locate the failing spec, read the
   diff image paths from the test output, and compare expected vs actual. Determine
   WHICH side regressed (client param not sent? server param not read? shared formula
   forked?).

3. **Fix, don't suppress.** If it's a real divergence, fix the code (see the
   `poster-sync` skill). Never edit baselines to hide a bug.

4. **Intentional change only** → update baselines:
   ```
   npx playwright test e2e/posterium-visual.spec.ts --update-snapshots
   ```
   Inspect the new `.png` files before committing them, and remember RENDER_VERSION
   must be regenerated (`node scripts/write-render-version.mjs`) and `rv` updated in
   AGENTS.md.

## Live inspection (Playwright MCP)

When a poster looks wrong but tests pass (or to eyeball a new feature):

1. `browser_navigate` to the app (dev server or `npm run build && npm start`).
2. `browser_snapshot` to find the preview `<img>`; `browser_take_screenshot` on it.
3. To compare client preview vs server output, navigate directly to the poster URL
   (e.g. `/api/poster/series/tt1234567?<params>`) and screenshot that too.
4. For console/network issues: `browser_console_messages` + `browser_network_requests`.
5. `browser_evaluate` can inspect the URL the preview img resolved to and the exact
   query params the client sent — confirm each one matches the server-side expectations
   in `AGENTS.md`.

## Rules

- Visual suite failure = blocking. Fix or intentionally re-baseline; never ignore.
- Never commit regenerated snapshots without reviewing them.
- Keep snapshots in git; they are the regression contract.
