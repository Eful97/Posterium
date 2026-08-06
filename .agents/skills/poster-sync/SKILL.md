---
name: poster-sync
description: >
  Synchronize client/server visual render parameters in Posterium. Every visual
  render parameter (badges, ranking, gradient, blur, logo, accent) has a client
  counterpart in the preview (EditView, context, poster-url) and a server
  counterpart in the poster route (route.ts, svg-badge.ts, badges.ts). When one
  side changes, the other MUST change too or the WYSIWYG preview diverges from
  the Stremio poster. Also handles RENDER_VERSION regeneration and the visual
  regression check. Trigger: "sync render params", "update badge style",
  "modifica parametro di resa", "change gradient/logo/blur/ranking", or any edit
  to a rendering file.
---

Posterium renders ONE poster: the client preview is a single `<img src={previewUrl}>`
that loads `/api/poster/{type}/{id}` — the same endpoint Stremio uses. There is no
separate client renderer. "Client" here means the URL params the client builds
(`src/lib/context.tsx`, `src/lib/poster-url.ts`); "server" means what the route reads
(`src/app/api/poster/[type]/[id]/route.ts`) and how SVG badges are drawn
(`src/lib/svg-badge.ts`, `src/lib/badge-svg-shared.ts`, `src/lib/logo-layout.ts`).

## When this skill triggers

When you modify any visual rendering parameter: badge geometry/colors/styles,
ranking/extra badges, bottom gradient, blur, logo size/position, font sizes,
paddings/gaps, accent color extraction, ribbon side, overflow protection formulas.

## Sync checklist (do ALL of these)

1. **Locate the server counterpart.** Grep the parameter name across `src/lib/*.ts`
   and `src/app/api/poster/[type]/[id]/route.ts`. Every server-side constant has a
   matching client-side usage or query param. The canonical param map lives in
   `AGENTS.md` (section "Parametri URL (query string)" and the badge geometry tables).
   When AGENTS.md and code disagree, CODE WINS — update AGENTS.md.

2. **Shared geometry lives in shared modules.** If the change is geometry (logo box,
   badge dims, text flow), the function likely already exists in `src/lib/logo-layout.ts`
   or `src/lib/badge-svg-shared.ts` and is used by BOTH sides. Change it once there,
   never fork the formula. Check `computeLogoBox`, `buildGenreTextFlow`,
   `genreBadgeDims`, `estimateTextWidth`.

3. **Regenerate RENDER_VERSION** — never hand-edit `src/lib/render-version.ts`
   (it is auto-generated). Run:
   ```
   node scripts/write-render-version.mjs
   ```
   It hashes the render files listed in `scripts/write-render-version.mjs`
   (`RENDER_FILES`). If your file is not in that list and it affects visual output,
   add it, then regenerate. The `predev`/`prebuild`/`pretest` scripts already do
   this automatically — the manual run is for immediate verification.

4. **Update `rv` in AGENTS.md.** Keep the "App version ... — RENDER_VERSION: X — rv: X"
   header line in sync with the regenerated value.

5. **Run the visual regression suite** to confirm client/server coherence:
   ```
   npx playwright test e2e/posterium-visual.spec.ts
   ```
   No external dependencies: `playwright.config.ts` starts `e2e/mock-server.mjs`
   automatically (dedicated port + `.next-e2e` distDir), so it works even with
   `npm run dev` running.

6. **Intentional appearance change?** Update snapshots deliberately:
   ```
   npx playwright test e2e/posterium-visual.spec.ts --update-snapshots
   ```
   Review the `.png` diffs before committing them.

## Query params quick reference (client → server)

| Param | Client sends | Server reads |
|---|---|---|
| `badges` | `globalBadges ? null : "0"` | `qBadges !== "0"` |
| `ranking` | `rankingBadges ? null : "0"` | `qRanking !== "0"` |
| `bg` / `by` / `br` | `false ? "0" : null` per badgeGenre/badgeYear/badgeRating | `qBg/qBy/qBr !== "0"` (genre/year/rating segment) |
| `gradHeight` | `gradientHeight` | `qGradHeight` (gradient + blurHeight) |
| `tl` | `topLight ? "1" : "0"` (always sent) | `qTopLight` (override wins) |
| `rank` | `badge.rank` | `qRank` |
| `label` | `badge.rankLabel \|\| badge.label` | `qLabel` |
| `extra` | `badge.label` / `customBadge` | `queryExtra` |
| `bs` | `badgeStyle` | `qBs` ("shadow"/"pill"/"bar"/"colored"/"bordo"/"vetro") |
| `rs` | `rankingBadgeStyle` | `qRs` ("default"/"bar"/"colored"/"pill"/"netflix") |
| `side` | `ribbonSide === "right" ? "right" : null` | `qSide` |
| `ac` | `accentColor` (from `extractBadgeColor()`) | `qAc` |

Dead params: `gradColor`, `gradOpacity`, `gradFade`, `gradDir` are not read by the
server anymore. Do not reintroduce them.

## Hard rules

- Never edit `src/lib/render-version.ts` by hand.
- Never duplicate a shared geometry formula in client and server.
- Never change one side of a param pair without the other.
- After ANY render-affecting change, run the visual suite (step 5). This is a
  hard gate, not optional.
