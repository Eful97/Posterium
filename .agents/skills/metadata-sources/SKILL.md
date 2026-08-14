---
name: metadata-sources
description: >
  External metadata/ranking sources used by Posterium catalogs and badges:
  JustWatch StreamingCharts (GraphQL, getJWRankings, 30 min cache, shared with
  /api/trending/rank and warmup), FlixPatrol Top 10 (fp-crawler catalogs,
  SUPPORTED_COUNTRIES fail-closed, disk+memory cache), MDBList lists
  (mdblistMovie/Show/Anime, key-hashed cache keys, 30 min TTL). Covers cache
  tags, TTLs, and ID resolution fallbacks. Trigger: "justwatch", "flixpatrol",
  "mdblist", "ranking", "top 10", "trending", "classifica", "badge trend",
  "fonte metadati", "graphql".
---

Posterium pulls rankings from three external sources. All of them feed catalogs
and/or the trend badges. Full architecture: `.agents/catalog.md`.

## JustWatch (`src/lib/justwatch.ts`)

- GraphQL POST to `JUSTWATCH_API_URL` (env, default `https://apis.justwatch.com/graphql`)
  with headers `Content-Type: application/json`, `X-Platform: WEB`.
- `getJWRankings(objectType: "MOVIE" | "SHOW", country = "IT", first = 20)` —
  filter `DAILY_POPULARITY_SAME_CONTENT_TYPE`, language `it-IT`.
- Returns `{ tmdbId, imdbId, rank }[]` — **imdbId comes from JustWatch itself**;
  do NOT re-fetch TMDB external_ids for these rows.
- In-memory cache 30 min, max 100 entries, key `{objectType}:{country}:{first}`.
  Shared with `/api/trending/rank` (trend badge) and warmup. Test hook clears it.
- Timeout 15 s.

## FlixPatrol (`src/lib/flixpatrol.ts`)

- `getTop10(slug, "italy", apiKey)` — catalogs fetched from
  `https://raw.githubusercontent.com/0xConstant1/fp-crawler/main/catalogs/{country}.json`.
- `SUPPORTED_COUNTRIES` closed list → unknown country is rejected fail-closed
  (no arbitrary URL fetch, no silent fallback to Italy).
- `SLUG_TO_PLATFORM`: netflix, disney, amazon-prime, hbo-max, apple-tv,
  paramount-plus.
- Cache: disk file `flixpatrol_cache_{country}.json` under `DATA_DIR` (falls back
  to `os.tmpdir()` when DATA_DIR is not writable, e.g. serverless) + in-memory
  Map. Per-country cache files exist under `data/`.
- Source does NOT provide imdbId → catalog depends entirely on `resolveImdbId`
  (TMDB external_ids).
- Also drives the network badge (which platform + rank).

## MDBList (`src/lib/mdblist.ts`)

- Lists: `mdblistMovie` (trending movies), `mdblistShow` (trending shows),
  `mdblistAnime` (trending anime) — `MDBLISTS` const.
- `fetchMDBList(listKey, apiKey)` → `{ imdb, title, year, tmdb? }[]` (top 20).
- Key resolution: explicit request key only (no instance key). The key is hashed
  (sha1, 8 chars) into the cache key so different keys don't collide, never in
  plaintext.
- Cache: `cacheSet`/`cacheGet` (tag `mdblist`), TTL 30 min. Only NON-empty
  results are cached — network errors return `[]` and are retried on next access.
- `MDBLIST_API_URL` env (mock server in e2e) always wins over the real endpoint.
- `checkMDBLists(imdbId)` → list key + rank for the MDBList badge.

## Shared rules

- API keys come from the request (see `tmdb-api` skill) — never env defaults.
- JustWatch rows already carry `imdbId`: no extra TMDB call (catalog.md rule).
- Cache tags used: `catalog` (refresh 03:00 UTC), `mdblist`.
- Empty results are cached briefly (catalog 60 s) or not at all (mdblist) so
  transient failures don't freeze lists.

## Files

- `src/lib/justwatch.ts` — GraphQL + cache
- `src/lib/flixpatrol.ts` — Top 10 + cache files
- `src/lib/mdblist.ts` — lists + cache
- `src/lib/ratings.ts` — rating badges (same key-hash pattern)
- `src/app/api/trending/rank/route.ts` — trend badge endpoint
- `data/flixpatrol_cache*.json`, `data/justwatch_cache.json`, `data/mdblist_cache.json`
