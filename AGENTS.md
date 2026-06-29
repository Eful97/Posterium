<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:badge-sync -->
# Parametri sincronizzati Client ↔ Server

Quando modifichi un parametro di resa visiva in un file, aggiorna il corrispettivo lato server (o viceversa).

App version: `0.13.0` — RENDER_VERSION: `74` — rv: `65`

## Badge Genere/Rating (GenreRatingBadges)

> **WYSIWYG**: il preview client usa `<img src={previewUrl}>` che carica `/api/poster/{type}/{id}` — lo stesso endpoint usato da Stremio. Non c'è duplicazione: preview = poster finale.

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
| Misura testo | `estimateTextWidth()` per-glyph in `badge-svg-shared.ts` |
| Allineamento verticale | Un solo `<text>` con `text-anchor="middle" x="adjustedX"` (compensa dx) e `<tspan dx=...>`; `dominant-baseline="central"` e stella con `Noto Sans Symbols 2` |
| Stili badge (`badgeStyle`) | `shadow` — textShadow; `pill` — bg `tlBg` (black/white 80% in base a `topLight`) con testo `tlFg`; `bar` — bg `tlBg` full-width + testo `tlFg`; `colored` — bg `accentColor` + testo adattivo |
| Sfondo pill/bar (`tlBg`) | `topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"` |
| Testo pill/bar (`tlFg`) | `topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"` |
| Bordo bar | `1px solid ${topLight ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}` |

## Badge Ranking/Extra

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
| Overflow protection | Stessa formula con `pw - 20`, fattori `3.55` (ranking, include shadow) e `3.2` (extra) |
| Posizione | Composito a `top: 0, left: round((pw - w) / 2)` |

## Gradiente fondo poster

| Parametro | Server (`badges.ts:bottomGradientSVG`) |
|---|---|
| Altezza | `gh = max(round(ph * pct / 100), 100)` |
| Colore | `color` + `opacity` |
| Direzione | `y1 = dir === "up" ? "0" : "1"`, `y2 = dir === "up" ? "1" : "0"` |
| Posizione | `top = dir === "up" ? ph - gh : 0` |
| Fade | `0% trasp → svgFadeEnd% trasp → svgSolidPct% opaco → 100% opaco` |
| Posizione badge genere | `badgeY = ph - h - round(20 * ph / 570)` |

## Parametri URL (query string)

| Parametro | Inviato da client (`context.tsx`) | Letto da server (`route.ts`) |
|---|---|---|
| `badges` | `globalBadges ? null : "0"` | `qBadges !== "0"` |
| `ranking` | `rankingBadges ? null : "0"` | `qRanking !== "0"` |
| `gradColor` | `gradientColor` | `qGradColor` |
| `gradOpacity` | `gradientOpacity` | `qGradOpacity` |
| `gradHeight` | `gradientHeight` | `qGradHeight` |
| `gradFade` | `gradientFade` | `qGradFade` |
| `gradDir` | `gradientDir` | `qGradDir` — "up" o "down" |
| `tl` | `topLight ? "1" : "0"` (sempre, anche per genre badges) | `qTopLight` — override se presente |
| `rank` | `badge.rank` (se rankingBadges attivi) | `qRank` — override del ranking |
| `label` | `badge.rankLabel \|\| badge.label` | `qLabel` — override label ranking |
| `extra` | `badge.label` (se extra) o `customBadge` | `queryExtra` — forza badge extra |
| `bs` | `badgeStyle` | `qBs` — "shadow"/"pill"/"bar"/"colored" |
| `rs` | `rankingBadgeStyle` | `qRs` — "default"/"bar"/"colored" |
| `ac` | `accentColor` (da `extractBadgeColor()`) | `qAc` — override colore accent |

## Bordo poster

| Parametro | Client (`EditView.tsx`) | Server (`route.ts`) |
|---|---|---|
| Bordo | `3px solid rgba(255,255,255,0.80)` | Rimosso (solo client) |
| Overlay | `absolute inset-0 pointer-events-none` (sopra ogni contenuto) | — |

## Logo clean poster

| Parametro | Client | Server |
|---|---|---|
| Dimensione logo | `computeLogoOffsetBounds()` usa `computeLogoBox()` | `computeLogoLayout()` usa `computeLogoBox()` |
| Scala | `logoScale` come percentuale della larghezza poster, max larghezza poster | Stessa logica, senza cap artificiale al 25% altezza |
| Cap altezza | Solo canvas poster (`posterH`) | Solo canvas poster (`STD_H`) |

## Files coinvolti

- `src/components/EditView.tsx` — preview WYSIWYG (singolo `<img src={previewUrl}>`)
- `src/lib/context.tsx` — stato, URL builder, localStorage
- `src/lib/poster-url.ts` — `buildPreviewUrl()`, `buildUrlPattern()` (parametri client → URL server)
- `src/lib/badges.ts` — server-side SVG (bottomGradientSVG)
- `src/lib/svg-badge.ts` — server-side SVG raw badges (renderGenreBadge, renderRankingBadge, renderExtraBadge) + Resvg rendering
- `src/lib/badge-priority.ts` — logica priorità badge (condivisa)
- `src/lib/logo-layout.ts` — geometria condivisa logo preview/server
- `src/app/api/poster/[type]/[id]/route.ts` — composizione poster finale (preview + Stremio usano la stessa route)
<!-- END:badge-sync -->
