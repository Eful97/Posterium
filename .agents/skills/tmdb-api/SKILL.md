---
name: tmdb-api
description: >
  TMDB API usage in Posterium. Covers the v3 endpoints used (find, external_ids,
  details, images), API key resolution (x-api-key header / api_key query / opt-in
  POSTERIUM_TMDB_KEY instance fallback), caching (5 min in-memory, URL without api_key), inflight
  coalescing, health checks, and image URL construction (TMDB_IMG_URL, w500/original).
  Trigger: "tmdb", "api key", "external_ids", "resolveImdbId", "getDetails",
  "poster path", "image.tmdb.org", "chiamata TMDB", "chiave api", "mock server".
---

Posterium has NO instance-level TMDB key by default. Every TMDB call carries the
key from the request (`x-api-key` header, fallback `api_key` query param) or from
the opt-in instance fallback. `TMDB_API_KEY` env var is intentionally NOT read
by the app. There is NO profile key store: `?u=` is identity/tracking only and
never provides API keys.

An **opt-in instance fallback** exists for personal single-user deploys (e.g. a
Vercel instance used by one person): `POSTERIUM_TMDB_KEY` (and
`POSTERIUM_MDBLIST_KEY` for MDBList) are read as a LAST-RESORT when the request
carries no key. Header/query always win. Do NOT set these on public
multi-user instances (HF Spaces, shared VPS) — a shared instance key would burn
one quota for everyone.

## Key resolution

`resolveRequestApiKey(req)` in `src/lib/tmdb.ts`:
1. Header `x-api-key`
2. Query param `api_key`
3. Env `POSTERIUM_TMDB_KEY` (fallback d'istanza, opt-in)
4. Otherwise `undefined` → TMDB calls fail (poster 404, empty catalogs)

`resolveImdbId`/`resolveImdbToTmdb` MUST receive the request key explicitly. Never
reintroduce a default key in the fetch layer itself.

## Endpoints used

| What | Where | Notes |
|---|---|---|
| `GET /find/{external_id}?external_source=imdb_id` | `src/lib/imdb-resolver.ts` | `resolveImdbToTmdb(imdbId, "movie"\|"tv", apiKey)`. Regex `^tt\d+$` guard. Cache: hit 7 days, no-match 60 s (sentinella -1). Network errors NOT cached. |
| `GET /{type}/{id}/external_ids` | `src/lib/tmdb.ts` (`resolveImdbId`) | Used by catalogs (FlixPatrol, MDBList fallback). |
| `GET /{type}/{id}` details | `src/lib/tmdb.ts` (`getDetails`) | Language `it-IT` in catalog flows. |
| `GET /{type}/{id}/images` | `src/lib/tmdb.ts` (`getImages`) | `TMDBImage` list for poster selection. |
| Health check | `src/lib/tmdb.ts` (`checkTmdbEndpoint`) | `/api/health`; never leaks the key in response/errors. |

## Fetch layer rules (tmdbFetch)

- Base URL: `TMDB_BASE_URL` env or `https://api.themoviedb.org/3`. Mock mode
  (`TMDB_BASE_URL` set) uses `mock-key` so e2e works without a real key
  (`e2e/mock-server.mjs`).
- Cache key = URL WITHOUT `api_key` (shared across users, key never in memory/Map).
- In-memory cache 5 min, max 500 entries, LRU eviction (promote on hit).
- Inflight coalescing: concurrent identical requests share one promise. The
  AbortSignal applies to the first request only — the render deadline is the bound.
- Per-request timeout 30 s; `checkTmdbEndpoint` 8 s.

## Images

`IMG_BASE = TMDB_IMG_URL || "https://image.tmdb.org/t/p"`.
Path format: `{IMG_BASE}/{size}/{file_path}` (e.g. `w500`, `original`).
`src/lib/poster-render-helpers.ts` keeps rendering deterministic (no dependency on
image.tmdb.org at render time) and validates paths start with `https://image.tmdb.org/t/p/`.
`src/lib/utils.ts` has the client-side `NEXT_PUBLIC_TMDB_IMG_URL` counterpart.

## Do NOT

- Do NOT read `TMDB_API_KEY`/`MDBLIST_API_KEY` env vars (catalog.md rule).
- Do NOT log or cache URLs containing the api_key.
- Do NOT put the key in Map keys, cache keys, or error messages.
- Do NOT add extra TMDB calls for imdbId where the source (JustWatch) already
  provides it.
- Do NOT change `resolveRequestApiKey` semantics (public contract, `auth.test.ts`
  covers it).

## Files

- `src/lib/tmdb.ts` — base URLs, `resolveRequestApiKey`, `tmdbFetch`, `checkTmdbEndpoint`, `getDetails`/`getExternalIds`/`getImages`
- `src/lib/imdb-resolver.ts` — `resolveImdbToTmdb` (find endpoint + cache)
- `src/lib/flixpatrol.ts` — own `TMDB_BASE` constant for its internal lookups
- `src/lib/poster-render-helpers.ts` — deterministic image URL handling
- `e2e/mock-server.mjs` — mock endpoints used by e2e/visual tests
