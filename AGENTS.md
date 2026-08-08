# Posterium

Generatore di poster cinematografici per Stremio/Nuvio: un solo endpoint (`/api/poster/{type}/{id}`) serve sia il preview client (WYSIWYG) sia il poster finale Stremio — non c'è duplicazione di rendering.

## Next.js System Notice

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Golden Rule: Client ↔ Server Sync

Quando modifichi un parametro di resa visiva in un file, aggiorna il corrispettivo lato server (o viceversa). Il preview client deve sempre corrispondere al poster Stremio finale.

App version: `0.15.2` — RENDER_VERSION: `f89cfd92e3` — rv: `f89cfd92e3`

> Quando questo file (o `.agents/*.md`) e il codice discordano, vince il codice (CODE WINS) — aggiorna la documentazione.

## Commands

| Command | Purpose |
|---|---|
| `npm run verify` | Typecheck + lint + unit test + build |
| `npm run test` | Unit test (Vitest) |
| `npx playwright test e2e/posterium-visual.spec.ts` | Regressione visiva (solo visual) |
| `npx playwright test e2e/` | Suite Playwright completa (visual + smoke) |
| `npx playwright test --update-snapshots` | Aggiorna snapshot (solo modifiche intenzionali) |
| `node scripts/write-render-version.mjs` | Rigenera RENDER_VERSION (mai editare `render-version.ts` a mano) |
| `node scripts/load-smoke.mjs` | Load smoke della render pipeline: burst di titoli freddi, misura % 503, poster/sec e heap (assert: heap < 250MB) |

`predev`/`prebuild`/`pretest` rigenerano automaticamente app + render version.

## Render Pipeline Hardening

La render pipeline poster (`route.ts` → `poster-runtime-cache.ts` → `poster-service.ts`) ha un limiter di concorrenza (slot) anti-OOM e un deadline complessivo. Default, env var e comportamenti (slot, wait, coda, deadline, negative cache) sono documentati in `README.md` (§ Variabili d'Ambiente). Note operative non banali: i valori si leggono a module level (cambio env ⇒ restart, non hot-reload); i poster non-mappati (composti al volo) usano TTL 6h invece delle 24h del path mappato.

## Language

Reply in the same language used by the user. Repository files, code, comments and documentation remain in English unless the project explicitly uses another language — la documentazione di progetto (`AGENTS.md`, `.agents/render-params.md`, `.agents/visual-testing.md`) è in italiano by design; i file SKILL (`.agents/skills/*/SKILL.md`) restano in inglese.

## Detailed Instructions

- [Render Parameters & Geometry](.agents/render-params.md) — geometria badge/genere/ranking, gradiente, bordo, logo, parametri URL, file coinvolti
- [Visual Regression Testing](.agents/visual-testing.md) — comandi Playwright, mock server, policy snapshot, regola RENDER_VERSION, test attivi
- [Catalogs](.agents/catalog.md) — architettura cataloghi Stremio, id metadati risolvibili (tt.../tmdb:), cache e warmup
- [Poster Sync](.agents/skills/poster-sync/SKILL.md) — workflow completo di sincronizzazione client/server
- [Poster Visual](.agents/skills/poster-visual/SKILL.md) — workflow di regressione visiva e screenshot
