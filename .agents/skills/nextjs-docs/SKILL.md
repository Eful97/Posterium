---
name: nextjs-docs
description: >
  Load the versioned Next.js guides bundled with this repo before writing any
  Next.js code. This project's Next.js version has breaking changes: APIs,
  conventions, and file structure may differ from training data. The canonical
  docs are shipped in `node_modules/next/dist/docs/` (01-app, 02-pages,
  03-architecture). Heed deprecation notices. Trigger: writing or modifying any
  file under `src/app/`, `src/lib/`, `middleware`, `next.config.*`, using Next.js
  APIs (next/image, next/headers, route handlers, Server Components, caching,
  revalidation, metadata), or before any build/dev/deploy work.
---

Never trust training-data Next.js conventions. This project uses a Next.js version
with breaking changes; the matching guides are bundled locally.

## Docs location

```
node_modules/next/dist/docs/
├── 01-app/           # App Router: routing, data fetching, rendering, caching, API routes
├── 02-pages/         # Pages Router (legacy)
├── 03-architecture/  # supported features, security, upgrading
└── index.md
```

Read the guide that matches what you are about to write BEFORE writing code.

## When to load docs

- Route handlers under `src/app/api/**` — check params handling, streaming,
  caching, and runtime defaults.
- Dynamic segments like `src/app/api/poster/[type]/[id]/route.ts` — confirm how
  `params` is shaped (async or not) for this version.
- Data fetching / Server Components / client components (`"use client"`).
- `next/image`, fonts, metadata, redirects, middleware/proxy.
- Caching and revalidation (this project caches generated posters in memory and
  uses RENDER_VERSION to invalidate URLs).
- `next.config.*` options and build behavior.
- Any deprecation warning surfaced during `npm run build` or `npm run dev`.

## Workflow

1. Identify the area (app router routing, data fetching, rendering, api).
2. Open the relevant `.md` under `node_modules/next/dist/docs/01-app/` (or the
   matching 02-pages/03-architecture section).
3. Note the exact API shape and any deprecation notices for THIS version.
4. Write or modify the code to match. Do not "modernize" past the installed version.
5. Verify with `npm run build` (or `npm run dev`), fixing any deprecation warnings
   it reports.

## Rules

- Heed deprecation notices from build/dev output — resolve them in the same change.
- When docs and AGENTS.md conflict, AGENTS.md project rules win for project-specific
  conventions; docs win for framework API truth.
- Do not add dependencies to work around API differences; the bundled docs describe
  the intended usage of what is already installed.
