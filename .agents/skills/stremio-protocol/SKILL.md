---
name: stremio-protocol
description: >
  Stremio addon contract for Posterium: manifest (manifest.json, /u/<uuid>/
  path variant for AIOMetadata), addonId scheme, resources (catalog, poster),
  catalog routes and their query params (u=, config=, skip=), poster endpoint
  contract, resolvable metadata IDs (tt... / provider:id — never bare numbers),
  headers (Cache-Control, CORS), maxDuration. Trigger: "manifest", "addon",
  "stremio", "catalogo", "catalog route", "AIOMetadata", "meta id", "id risolvibile",
  "poster url", "addonId".
---

Posterium is a Stremio addon whose purpose is ONLY serving posters and catalogs:
it does NOT resolve `/meta/{type}/{id}` (Stremio asks external addons like
AIOMetadata for that). Therefore catalog `id` values MUST be resolvable by those
addons.

## Golden rule — resolvable metadata IDs

AIOMetadata resolves metadata only from `tt...` (IMDb) or `provider:id` (e.g.
`tmdb:12345`) IDs. A bare number (`12345`) is NOT resolvable → "no metadata" on
click. Resolution order (helper `catalogMetaId` in `src/lib/catalog-handler.ts`):
1. `imdbId` provided by the source (JustWatch already returns it);
2. else TMDB `/{type}/{id}/external_ids` (`resolveImdbId`, passes the request key);
3. else fallback `tmdb:<id>`.

Never emit a bare numeric `id` as the meta id.

## Manifest (`src/lib/build-manifest.ts`)

- URL: classic `manifest.json?u=...` OR path `/u/<uuid>/manifest.json` for
  AIOMetadata imports (they reject/break URLs with query strings).
- `addonId`: `org.posterium` + `.` + first 8 chars of user UUID (or config token).
- Fields: `resources: ["catalog", "poster"]`, `types: ["movie", "series"]`,
  `manifestVersion: 1`, `catalogs` from `POSTERIUM_CATALOGS` each with
  `extra: [{ name: "skip" }]`, `version: APP_VERSION` (generated).
- Headers: `Access-Control-Allow-Origin: *`, `Content-Type: application/json`,
  `Cache-Control: no-cache, max-age=0, must-revalidate`.

## Catalog route

`src/app/catalog/[type]/[id]/route.ts` — type normalized movie/series (see
`normalizeCatalogType` in `catalog-handler.ts`). Query params: `u=` (user UUID
profile) and `config=` (config token) — both enter cache keys and poster URLs.
`skip=` supports pagination.

- Empty `metas: []` = unknown catalog, missing key, or error. Rate limit → 429
  with `Retry-After`. `Cache-Control: no-cache`, CORS `*`.
- `maxDuration = 60`: a cold catalog does ~20 `getDetails` + ranking calls.

## Poster endpoint

`/api/poster/{type}/{id}` — the SAME endpoint serves the client preview and the
Stremio poster. Query params: `rv` (render version), `mv` (saved mapping), `u=`
(user profile), plus all render params (see `.agents/render-params.md`).

## Catalog list (`POSTERIUM_CATALOGS` in `catalog-definitions.ts`)

- `posterium-jw-movies` / `posterium-jw-series` — JustWatch StreamingCharts
- `posterium-netflix/prime/disney/apple/hbo/paramount-{movies,series}` — FlixPatrol Top 10
- `posterium-anime` — MDBList `mdblistAnime`

Warmup: `posterium-jw-movies`, `posterium-jw-series`, `posterium-anime`
(`WARMUP_CATALOG_IDS`), refreshed at 03:00 UTC (cache tag `catalog`).

## Do NOT

- Do NOT emit bare numeric meta ids.
- Do NOT hardcode new catalogs in the route: add them to `POSTERIUM_CATALOGS`
  (and `WARMUP_CATALOG_IDS` if they must be pre-warmed).
- Do NOT change route/param names or response formats (public contracts).
- Do NOT add a `/meta` resource to the manifest.

## Files

- `src/lib/build-manifest.ts` — manifest builder
- `src/lib/catalog-definitions.ts` — catalog list + warmup
- `src/lib/catalog-handler.ts` — `posteriumCatalog` logic, `catalogMetaId`
- `src/app/catalog/[type]/[id]/route.ts` — Stremio catalog route
- `src/lib/stremio-poster-url.ts` / `stremio-poster-params.ts` — poster URL builder
- `.agents/catalog.md` — full catalog architecture doc
