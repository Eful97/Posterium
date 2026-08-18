---
name: deploy
description: >
  Posterium deployment runbook — Docker (manual + compose), Hugging Face Spaces,
  Vercel, VPS. Covers build args (NODE_MAX_OLD_SPACE), /data persistence (HF
  Storage bucket, uid 1000), entrypoint self-warmup (POSTERIUM_SELF_WARMUP),
  Vercel KV requirement + Hobby limits, and the post-deploy verification
  checklist (/api/health, /api/status, /manifest.json). Trigger: "deploy",
  "docker", "huggingface", "hf space", "vercel", "vps", "entrypoint", "warmup",
  "rebuild", "build image", "rilascio".
---

Deployment targets and the checks that must pass after each one. The README
("Deploy Rapido") is the canonical user-facing guide; this skill is the
operator/agent checklist.

## Target matrix

| Target | Command / notes | Persistence | Warmup |
|---|---|---|---|
| Docker manual | `docker build --build-arg NODE_MAX_OLD_SPACE=1024 -t posterium .` then `docker run -p 8080:8080 -v posterium-data:/data posterium` | named volume `/data` | entrypoint self-warmup (needs rebuilt image) |
| Docker Compose | `docker compose up -d` (`.env` only for admin token; hardening cap_drop ALL, no-new-privileges; 512MB mem limit) | volume `posterium-data` | same |
| HF Spaces | frontmatter `sdk: docker` + `app_port: 8080`; env `NODE_OPTIONS=--max-old-space-size=1024` + **`POSTERIUM_PUBLIC_INSTANCE=1`** | Storage bucket → `/data` (uid 1000) | same |
| Vercel | deploy button / import repo; Next.js runtime; **`POSTERIUM_PUBLIC_INSTANCE=1`** needed for editor routes | **KV required for server-side saves** (KV_REST_API_URL/TOKEN); without it profiles degrade to stateless `?config=` (needs CONFIG_HMAC_SECRET) — fs is read-only | NOT useful on Hobby (10s limit) |
| VPS/Oracle/Termux | `npm run build && npm start` (or docker compose); Oracle A1 4 OCPU free tier | local `/data` | none |

> **Editor routes** (`POST/GET /api/mappings`, `/api/poster-fit`, `/api/defaults`)
> are admin-protected and **fail-closed in production** (`NODE_ENV=production`)
> unless `POSTERIUM_PUBLIC_INSTANCE=1` is set or an admin token is configured.
> Without the flag the editor cannot save posters and the 1-click best-fit
> returns nothing on HF/Vercel while working in local dev. Set the flag on any
> public multi-user instance (HF, Vercel, public VPS).

## Build args & env (Dockerfile)

- `ARG NODE_MAX_OLD_SPACE=384` → `NODE_OPTIONS=--max-old-space-size=${...}`.
  Platforms with RAM (HF 16GB) should pass `1024`+ via build-arg or platform env.
- `SHARP_CONCURRENCY=2`, `SHARP_CACHE_MEMORY_MB=64` (set by the Dockerfile).
- `POSTERIUM_DATA_DIR=/data`, non-root `nextjs` uid 1000, standalone server via
  `entrypoint.sh` (`node server.js`).

## Performance tuning (high-RAM instances)

Defaults (4 render slots, 150MB cache) target the 512MB compose limit. On
platforms with more RAM the bottleneck for cold poster grids is slot
concurrency, not CPU — raise `POSTERIUM_MAX_CONCURRENT_RENDERS` (rule of thumb:
~4 slots per 384MB of heap) and `POSTERIUM_CACHE_MAX_MB`. Suggested: HF Spaces
16GB → 8-12 slots / 300MB, Oracle A1 24GB → 12-16 slots / 400MB. Full table in
README "Tuning performance". Env vars are read at module level → restart needed.

## Entrypoint self-warmup (NEW)

`entrypoint.sh` runs `/api/warmup` in the background after boot:
1. Polls `http://127.0.0.1:${PORT:-8080}/api/health` up to ~60s.
2. POSTs `/api/warmup?lang=it` with `x-admin-token` if an admin token is set,
   else no header (public instance fail-open).
3. All failures are non-fatal (`|| true`) — never blocks boot.

- Disable with `POSTERIUM_SELF_WARMUP=0`.
- **Only takes effect on a REBUILT image** — the entrypoint must be part of the
  image. A running old container will not get it.

## Post-deploy verification checklist

Run these against the deployed instance:
1. `GET /api/health` → `ok` (does not leak data path).
2. `GET /api/status` → TMDB status, streaming, storage sections populated.
3. `GET /manifest.json` → Stremio manifest (`resources: catalog, poster`).
4. Warmup ran: check logs for `[entrypoint] Self-warmup completed` (or
   `POSTERIUM_SELF_WARMUP=0` intentionally).
5. On HF: confirm a Storage bucket is linked to `/data` (logs warn on boot if
   storage is not writable by uid 1000).

## Vercel specifics

- KV (`KV_REST_API_URL` + `KV_REST_API_TOKEN`) is required for **server-side
  persistence** of mappings/profiles. Without it the filesystem is read-only and
  saves degrade: mapping saves fail, and **profile creation falls back to a
  STATELESS profile** — `POST /api/profile` returns `{ stateless: true,
  configToken }` and the config travels in the signed `?config=` link instead of
  being stored. Stateless profiles live in browser localStorage (same-browser
  reload works); no per-title mappings, no `/u/<uuid>/manifest.json`, and API
  keys must be passed in the URL.
- The stateless fallback requires `CONFIG_HMAC_SECRET` (or
  `ENCRYPTION_KEY_SECRET`) to sign the token — without storage AND without the
  secret, profile creation still fails with an explanatory 500.
- Hobby function duration is 10s: cold catalogs (~10s) and burst poster renders
  can time out. Warmup does not complete on Hobby — not critical.
- `CONFIG_HMAC_SECRET` unlocks config tokens (fail-closed without it).
- `PROFILE_ENCRYPTION_KEY` encrypts profile apiKeys at rest.

## Rules

- No TMDB/MDBList API keys in env or `.env` — keys are request-scoped or per
  profile (see the `tmdb-api` skill).
- `POSTERIUM_TRUST_PROXY=1` only behind a trusted edge that overwrites IP
  headers (Cloudflare/HF edge/Nginx).
- Env table + full defaults live in README "Variabili d'Ambiente" — keep this
  skill in sync with it.
