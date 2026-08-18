---
name: perf
description: >
  Render-pipeline performance invariants for Posterium — the caps and patterns
  that keep cold poster renders fast without OOM: getImages parallel with
  getDetails, worst-case timeout caps (auto-fit scoring 1200 / fetch 5000 /
  Wikidata 2500 / rating 1500 ms), AbortSignal.any in fetch layers, blur as raw
  RGBA overlay (no PNG roundtrip), buffer reuse from best-fit, slot limiter,
  RENDER_VERSION regeneration rule. Trigger: "performance", "slow poster",
  "ottimizzazione", "render lento", "latency", "timeout", "RENDER_VERSION",
  "pipeline audit".
---

These are the invariants of the poster render pipeline. When editing the pipeline
or auditing it for speed, preserve them. They were established in the
2026-08-12 optimization pass; don't regress them silently.

## Invariants

### 1. Parallel first data block (non-mapped branch, `route.ts`)
- `getImages` starts in PARALLEL with `getDetails` + `getExternalIds` using only
  `preferredLanguage,en,null`. It does NOT wait for `original_language`.
- `original_language` is added only in a CONDITIONAL retry: when posters OR
  logos are missing from the base langs (title in a small language). Don't add
  `origLang` to every request (costs payload + the same RTT).

### 2. Worst-case caps (env-overridable, module-level)
| Cap | Default | Env var | Clamp |
|---|---|---|---|
| Auto-fit **scoring** (CPU) | 1200 ms | `POSTERIUM_AUTO_FIT_TIMEOUT_MS` | 300–10000 |
| Auto-fit **fetch** (logo + candidates, I/O) | 5000 ms | `POSTERIUM_AUTO_FIT_FETCH_TIMEOUT_MS` | 1000–15000 |
| Wikidata awards | 2500 ms | `WIKIDATA_TIMEOUT` | – |
| Rating wait (TMDB+IMDb upgrade) | 1500 ms | `POSTERIUM_RATING_WAIT_MS` | 300–10000 |

The auto-fit **scoring** cap is the CPU bound (metrics, not product). The
auto-fit **fetch** cap is separate network I/O to TMDB: when both shared
`POSTERIUM_AUTO_FIT_TIMEOUT_MS`, slow-network platforms (HF, Vercel) exceeded
1200 ms on the logo/candidates fetch and skipped best-fit entirely, falling
back to the first clean poster. Keep the two caps separate.

Rating wait is SHARED with the tmdb-details route (same knob).

### 3. `AbortSignal.any` in fetch layers
- `fetchImg` (`poster-render-helpers.ts`) and `fetchAggregatedRating`
  (`ratings.ts`) combine the caller signal with their own internal timeout via
  `AbortSignal.any`. A never-aborted external signal (e.g. `renderAbort` after a
  successful render) must NOT bypass the internal timeout. Never revert to
  `signal ?? timeout`.
- `ratingAbort` (dedicated AbortController for the rating fetch) is aborted
  right after the `Promise.race` — leaves no orphan background fetch.

### 4. Blur as raw RGBA overlay (no PNG roundtrip)
- `applyBlur` returns `{ overlay, top, height }` raw RGBA; `poster-service.ts`
  composites it as the FIRST layer of the final composite, under
  backdrop/vignette/badges. The `modulate` lives in the same pipeline →
  one decode + one encode total. Do NOT reintroduce the `blur → modulate`
  PNG roundtrip.

### 5. Buffer reuse from best-fit
- `posterPathBuffer` AND `logoPathBuffer` are carried from the best-fit result
  into the render (no re-fetch in the poster/logo fetch block). Logo re-fetch
  only as fallback (cache hit or timeout).
- Poster buffer is w342 upscaled to 500×750 (accepted softness). Do NOT add a
  w500 re-fetch silently — that re-fetch fires on every best-fit pick of a
  non-first poster and eats the buffer-reuse win. Discuss before changing.

### 6. Concurrency & deadline
- Slot limiter: `POSTERIUM_MAX_CONCURRENT_RENDERS` (default 4),
  `POSTERIUM_RENDER_SLOT_WAIT_MS` (15000, clamp 500–60000),
  `POSTERIUM_RENDER_QUEUE` (0). Waiters don't hold image buffers.
- Deadline watchdog: `POSTERIUM_RENDER_TIMEOUT_MS` (30000, clamp 1000–120000)
  frees slot + inflight map on overrun.
- Negative cache: `POSTERIUM_NEGATIVE_CACHE_TTL_MS` (5000) for 500/503.

### 7. RENDER_VERSION — never hand-edited
- `src/lib/render-version.ts` is AUTO-GENERATED. After touching ANY file in
  `RENDER_FILES` (`scripts/write-render-version.mjs`): `node scripts/write-render-version.mjs`.
  If your file affects visual output but isn't listed, ADD it, then regenerate.
- `predev`/`prebuild`/`pretest` already regenerate; the manual run is for
  immediate verification. A stale RENDER_VERSION means cache + Stremio URLs
  don't invalidate.

## Audit workflow

1. Read `route.ts` (non-mapped branch, caps, race), `poster-service.ts`,
   `poster-auto-fit.ts`, `poster-render-helpers.ts` (fetchImg), `ratings.ts`,
   `blur.ts`, `poster-runtime-cache.ts` (limiter).
2. Check each invariant above holds.
3. Check RENDER_VERSION freshness: run the generator, confirm no diff.
4. Report regressions with `file:line`; propose the minimal fix.
