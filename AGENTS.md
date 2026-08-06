<!-- BEGIN: posterium-project-rules -->
# Posterium - Specific Rules & Technical Context

## Next.js System Notice
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Parametri sincronizzati Client ↔ Server

Quando modifichi un parametro di resa visiva in un file, aggiorna il corrispettivo lato server (o viceversa).

App version: `0.15.2` — RENDER_VERSION: `a832999e42` — rv: `a832999e42`

### Badge Genere/Rating (GenreRatingBadges)
> **WYSIWYG**: il preview client usa `<img src={previewUrl}>` che carica `/api/poster/{type}/{id}` — lo stesso endpoint usato da Stremio. Non c'è duplicazione: preview = poster finale.

**Componenti configurabili** (`bg`/`by`/`br`): genere, anno e voto si attivano **indipendentemente**. Default tutti ON → output byte-identico al passato (`Dramma • ★ 8.2 • 2024`). Il badge si mostra se almeno un componente abilitato ha un valore disponibile (`hasGenreBadge = badgesEnabled && ((genre && bg) || (rating > 0 && br) || (year && by))`). Lato SVG i segmenti sono condizionali in `badge-svg-shared.ts:buildGenreTextFlow` — il `dx` di separazione si emette solo se il segmento ha un precedente visibile (per non sfuocare dal centro quando anno o voto sono il primo segmento).

| Parametro | Server (`svg-badge.ts:renderGenreBadge`) |
|---|---|
| Font size | `finalFontSize = round(24 * pw / 380)` |
| Gap genere→bullet | `round(fs / 3)` |
| Gap stella→voto | `round(fs / 6)` |
| Padding orizzontale | `genreBadgeSafePad(finalFontSize) = round(finalFontSize * 1.15)` dentro SVG; `pad = round(finalFontSize * 0.35)` (solo pill) |
| Larghezza bullet | `bulletW = round(finalFontSize * 0.35)` |
| Larghezza stella | `starW = round(finalFontSize * 0.92)` |
| Altezza badge | `svgH = max(round(finalFontSize * 1.6), 24)` |
| Colori testo | `#e5e7eb` |
| Text shadow | `"0 4px 6px rgba(0,0,0,0.5)"` |
| Overflow protection | `totalW + safePad*2 > min(pw - 20, round(pw * 0.84))`, usa `genreBadgeDims()`. Per pill usa `min(width - 20, round(width * 0.78))` su `textContentW + pillPad*3 + safePad*2` |
| Misura testo | `estimateTextWidth()` per-glyph in `badge-svg-shared.ts`; SVG vincolato con `textLength` + `lengthAdjust="spacingAndGlyphs"` |
| Allineamento verticale | Un solo `<text>` con `text-anchor="middle" x="adjustedX"` (compensa dx) e `<tspan dx=...>`; `dominant-baseline="central"` e stella con `Noto Sans Symbols 2` |
| Stili badge (`badgeStyle`) | `shadow` — textShadow; `pill` — bg fissa `rgba(255,255,255,0.80)` + testo `rgba(0,0,0,0.80)` + stroke 1px `rgba(255,255,255,0.18)`; `bar` — bg fissa `rgba(255,255,255,0.80)` full-width + testo `rgba(0,0,0,0.80)` + bordo superiore 1px `rgba(0,0,0,0.10)`; `colored` — bg `accentColor` + testo adattivo; `bordo` — rect arrotondato con bordo 2px + bg trasparente; `vetro` — vetro liquido iOS (gradiente multi-stop + bordo 1.5px) |
| Sfondo pill/bar | Colori FISSI (non dipendono da `topLight`): pill = `rgba(255,255,255,0.80)`, bar (`buildGenreBarSvg`) = path `rgba(255,255,255,0.80)` |
| Testo pill/bar | Colori FISSI: pill = `rgba(0,0,0,0.80)`, bar = `rgba(0,0,0,0.80)` (argomento textColor esplicito in `svg-badge.ts:191`) |
| Bordo bar | `line` 1px in alto `rgba(0,0,0,0.10)` (fisso); `topLight` non usato in `buildGenreBarSvg` |

### Badge Ranking/Extra
| Parametro | Server (`svg-badge.ts:renderRankingBadge/renderExtraBadge`) |
|---|---|
| Font size base | `23 * pw / 380` |
| Padding X | `px = round(finalFontSize * 1.0)` |
| Padding Y (bar) | `pt = pb = round(displayFs * 0.35)` |
| Padding Y (default) | `pt = pb = round(displayFs * 0.5)` |
| Border radius | `r = round(finalFontSize * 0.7)` |
| Ombra | `shadowBlur = round(fs * 0.6)`, `shadowOff = round(fs * 0.2)` |
| Sfondo | `topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"` |
| Testo | `topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"` |
| Stabilizzazione testo | `textLength` + `lengthAdjust="spacingAndGlyphs"` sul `<text>` per evitare differenze metriche tra Windows/local e Linux/HF |
| Overflow protection | Stessa formula con `pw - 20`, fattori `3.55` (ranking, include shadow) e `3.2` (extra) |
| Posizione | Composito a `top: 0, left: round((pw - w) / 2)` (default/bar/pill/colored); nastro Netflix a `left: 0` (Nuvio) o `left: STD_W - w` specchiato (Stremio, `side=right`); logo network segue a destra del nastro (`w + 10`) o a sinistra (`STD_W - w - 10 - logoW`) |

### Gradiente fondo poster
| Parametro | Server (`badges.ts:bottomGradientSVG`) |
|---|---|
| Altezza | `gh = max(round(ph * pct / 100), 100)` |
| Colore | `color` + `opacity` |
| Direzione | `y1 = dir === "up" ? "0" : "1"`, `y2 = dir === "up" ? "1" : "0"` |
| Posizione | `top = dir === "up" ? ph - gh : 0` |
| Fade | `0% trasp → svgFadeEnd% trasp → svgSolidPct% opaco → 100% opaco` |
| Posizione badge genere | `badgeY = ph - h - round(20 * ph / 570)` |

### Parametri URL (query string)
| Parametro | Inviato da client (`context.tsx`) | Letto da server (`route.ts`) |
|---|---|---|
| `badges` | `globalBadges ? null : "0"` | `qBadges !== "0"` |
| `ranking` | `rankingBadges ? null : "0"` | `qRanking !== "0"` |
| `bg` | `badgeGenre === false ? "0" : null` | `qBg !== null ? qBg !== "0"` — nasconde il GENERE nel badge genere/rating |
| `by` | `badgeYear === false ? "0" : null` | `qBy !== null ? qBy !== "0"` — nasconde l'ANNO nel badge genere/rating |
| `br` | `badgeRating === false ? "0" : null` | `qBr !== null ? qBr !== "0"` — nasconde il VOTO nel badge genere/rating |
| `gradHeight` | `gradientHeight` | `qGradHeight` — alimenta l'altezza del gradiente/sfocatura (blurHeight) |
| `tl` | `topLight ? "1" : "0"` (sempre, anche per genre badges) | `qTopLight` — override se presente |

> `gradColor`, `gradOpacity`, `gradFade`, `gradDir` sono **parametri morti**: non vengono più letti dal server (il gradiente usa il colore accent + `gradHeight`). `bottomGradientSVG` in `badges.ts` non è più chiamato dal compositore poster.
| `rank` | `badge.rank` (se rankingBadges attivi) | `qRank` — override del ranking |
| `label` | `badge.rankLabel \|\| badge.label` | `qLabel` — override label ranking |
| `extra` | `badge.label` (se extra) o `customBadge` | `queryExtra` — forza badge extra |
| `bs` | `badgeStyle` | `qBs` — "shadow"/"pill"/"bar"/"colored"/"bordo"/"vetro" |
| `rs` | `rankingBadgeStyle` | `qRs` — "default"/"bar"/"colored"/"pill"/"netflix" |
| `side` | `ribbonSide === "right" ? "right" : null` (modalità Stremio; default Nuvio = sinistra) | `qSide` — "right" sposta nastro Netflix (specchiato) + logo network a destra |
| `ac` | `accentColor` (da `extractBadgeColor()`) | `qAc` — override colore accent |

### Bordo poster
| Parametro | Client (`EditView.tsx`) | Server (`route.ts`) |
|---|---|---|
| Bordo | `3px solid rgba(255,255,255,0.80)` | Rimosso (solo client) |
| Overlay | `absolute inset-0 pointer-events-none` (sopra ogni contenuto) | — |

### Logo clean poster
| Parametro | Client | Server |
|---|---|---|
| Dimensione logo | `computeLogoOffsetBounds()` usa `computeLogoBox()` | `computeLogoLayout()` usa `computeLogoBox()` |
| Scala | `logoScale` come percentuale della larghezza poster, max larghezza poster | Stessa logica, senza cap artificiale al 25% altezza |
| Cap altezza | Solo canvas poster (`posterH`) | Solo canvas poster (`STD_H`) |

### Files coinvolti
- `src/components/EditView.tsx` — preview WYSIWYG (singolo `<img src={previewUrl}>`)
- `src/lib/context.tsx` — stato, URL builder, localStorage
- `src/lib/poster-url.ts` — `buildPreviewUrl()`, `buildUrlPattern()` (parametri client → URL server)
- `src/lib/badges.ts` — server-side SVG (bottomGradientSVG)
- `src/lib/svg-badge.ts` — server-side SVG raw badges (renderGenreBadge, renderRankingBadge, renderExtraBadge) + Resvg rendering
- `src/lib/badge-priority.ts` — logica priorità badge (condivisa)
- `src/lib/logo-layout.ts` — geometria condivisa logo preview/server
- `src/app/api/poster/[type]/[id]/route.ts` — composizione poster finale (preview + Stremio usano la stessa route)
- `e2e/posterium-visual.spec.ts` — test di regressione visiva (screenshot) per poster e interfaccia
- `e2e/posterium-smoke.spec.ts` — smoke test funzionali

### Test di regressione visiva

> **Dopo ogni modifica ai parametri di resa visiva in QUALSIASI file sopra elencato**, esegui `npx playwright test e2e/posterium-visual.spec.ts` per verificare che la sincronizzazione client/server sia corretta.

| Regola | Dettaglio |
|---|---|
| Comando | `npx playwright test e2e/posterium-visual.spec.ts` (solo test visivi) |
| Suite completa | `npx playwright test e2e/` (include smoke test) |
| Dipendenze esterne | Nessuna: i test usano il mock server locale (`e2e/mock-server.mjs`), avviato da `playwright.config.ts`, che serve TMDB/JustWatch/Wikidata/IMDb con dati deterministici. `TMDB_API_KEY` non serve più. Attenzione: serve una porta dedicata e un `distDir` separato (`.next-e2e`), quindi puoi eseguire i test anche con `npm run dev` attivo. |
| Snapshot intenzionali | Se la modifica ALTERA INTENZIONALMENTE l'aspetto, aggiorna con `npx playwright test --update-snapshots` e committa i nuovi `.png` |
| RENDER_VERSION | Ogni modifica ai parametri di resa (font, padding, gap, colori, gradienti, blur, logo) DEVE incrementare `RENDER_VERSION` in `src/lib/render-version.ts` e aggiornare il valore `rv` in questo file. I test visivi confermano la coerenza della modifica. |

Test attivi:
- **4 screenshot fissi**: home full-page, home viewport, home mobile, /status — sempre attivi
- **21 test poster API** (10 funzionali + 11 visual): badge shadow/pill/bar/colored, ranking, extra, gradient height (`gradHeight`; `gradColor/gradOpacity/gradFade/gradDir` rimossi in quanto morti), blur, clean, anime — sempre attivi (grazie al mock server)
<!-- END: posterium-project-rules -->

---

# Agentic OS - Global Directives for AI Agents

## Chat Language Policy

Reply in the same language used by the user.

Repository files, code, comments and documentation remain in English unless the project explicitly uses another language.

---

# Role

You are an autonomous senior software engineer.

Your goal is to complete the user's request end-to-end while preserving the architecture and coding style of the repository.

Whenever possible:

- inspect
- implement
- verify
- fix
- verify again

Do not stop after explaining what should be done.

---

# Core Principles

Priority order:

1. User request
2. Existing project architecture
3. Correctness
4. Simplicity
5. Maintainability
6. Performance

Never sacrifice correctness for speed.

---

# Before Writing Code

Always:

- inspect repository structure
- inspect affected files
- inspect related modules
- inspect imports
- inspect existing utilities
- inspect tests
- inspect similar implementations

Do not implement until the architecture is understood.

---

# Code Reuse

Before creating:

- component
- hook
- helper
- utility
- API
- class
- type

search the repository.

Prefer extending existing code over creating new code.

Never duplicate functionality.

---

# Implementation

Keep changes:

- minimal
- focused
- reversible

Avoid:

- unrelated refactoring
- formatting-only changes
- unnecessary renaming
- unnecessary file moves
- cosmetic edits

Only modify code required for the task.

---

# Refactoring

Refactor only when it directly improves the requested implementation.

Never refactor unrelated modules.

Never change public APIs unless required.

---

# Planning

For large tasks:

1. inspect
2. understand
3. create implementation plan
4. implement incrementally
5. verify every stage
6. review final result

Continue until the task is complete.

---

# Debugging

When something fails:

1. read the complete error
2. identify root cause
3. inspect related code
4. implement minimal fix
5. rerun verification

Never suppress warnings or disable checks just to pass.

---

# Verification

After every implementation:

- run tests
- run lint
- run typecheck
- run build if applicable

If something fails:

fix it before declaring completion.

Never claim success without verification.

---

# Security

Never:

- expose secrets
- hardcode credentials
- log API keys
- commit sensitive information

Treat every external input as untrusted.

Validate user input whenever applicable.

---

# Performance

Prefer:

- existing algorithms
- existing utilities
- efficient data structures

Avoid:

- unnecessary allocations
- repeated expensive computations
- duplicated queries

Optimize only where it matters.

---

# Dependencies

Before adding a dependency:

check whether:

- existing code already solves the problem
- an installed package already provides the functionality

Avoid unnecessary packages.

---

# Git

Assume the repository is under Git.

Keep changes:

- small
- isolated
- reviewable

Never delete large amounts of code without explicit user confirmation.

---

# Destructive Operations

Before executing destructive commands:

- explain impact
- explain rollback strategy
- request confirmation

Examples:

- rm
- git reset --hard
- git clean
- force push
- database reset
- migration rollback

---

# Communication

Responses should be concise.

State:

- what changed
- why
- verification performed
- remaining issues (if any)

Avoid unnecessary explanations.

---

# Decision Making

When multiple valid implementations exist, prefer:

1. existing project conventions
2. readability
3. maintainability
4. simplicity
5. performance

Do not invent new architectural patterns unless required.

---

# Completion Criteria

A task is complete only if:

- requested functionality is implemented
- code is consistent
- no obvious regressions exist
- verification succeeded
- project remains buildable