<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:badge-sync -->
# Parametri sincronizzati Client ↔ Server

Quando modifichi un parametro di resa visiva in un file, aggiorna il corrispettivo lato server (o viceversa).

## Badge Genere/Rating (GenreRatingBadges)

| Parametro | Client (`PreviewBadges.tsx`) | Server (`satori-badge.ts:renderGenreBadge`) |
|---|---|---|
| Font size | `fs = round(finalFs)` da `24 * containerW / 380` | `finalFontSize = round(24 * pw / 380)` |
| Gap genere→bullet | `round(fs / 3)` ≈ `fs * 0.33` | `round(finalFontSize * 0.33)` |
| Gap stella→voto | `round(fs / 6)` ≈ `fs * 0.17` | `round(finalFontSize * 0.17)` |
| Padding orizzontale | (flex naturale) | `pad = round(finalFontSize * 0.35)` × 2 |
| Larghezza bullet | (naturale) | `bulletW = round(finalFontSize * 0.35)` |
| Larghezza stella | (naturale) | `starW = round(finalFontSize * 0.92)` |
| Altezza badge | (flex naturale) | `svgH = max(round(finalFontSize * 1.6), 24)` |
| Colori testo | `text-gray-200` (≈ `#e5e7eb`) | `#e5e7eb` |
| Text shadow | `"0 4px 6px rgba(0,0,0,0.5)"` | `"0 4px 6px rgba(0,0,0,0.5)"` |
| Overflow protection | `fs` ridotto se `totalW > containerW - 20`, calcolato con `genreClientDims()` | Stessa logica: `totalW > pw - 20`, usa `genreBadgeDims()` riproporziona `fs` |
| Allineamento verticale | Flex baseline naturale | Bullet `translateY(5px)`, Stella `translateY(fs * 0.23)`, Voto `translateY(5px)`, Anno `translateY(5px)` |

## Badge Ranking/Extra

| Parametro | Client (`PreviewBadges.tsx`) | Server (`satori-badge.ts:renderRankingBadge/renderExtraBadge`) |
|---|---|---|
| Font size base | `23 * containerW / 380` | `23 * pw / 380` |
| Padding X | `px = round(fs)` | `px = round(finalFontSize * 1.0)` |
| Padding Y | `py = round(fs * 0.5)` | `pt = pb = round(finalFontSize * 0.5)` |
| Border radius | `r = round(fs * 0.7)` | `r = round(finalFontSize * 0.7)` |
| Ombra | `shadowOff = round(fs * 0.2)`, `shadowBlur = round(fs * 0.6)`, `boxShadow: "0 ${shadowOff}px ${shadowBlur}px rgba(0,0,0,0.3)"` | `shadowBlur = round(fs * 0.6)`, `shadowOff = round(fs * 0.2)` (stessa formula scalata) |
| Sfondo | `topLight ? "bg-black/80" : "bg-white/80"` | `topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"` |
| Testo | `topLight ? "text-white/80" : "text-black/80"` | `topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"` |
| Overflow protection | `fs` ridotto se `fs * (textLen * 0.58 + 2.35) > containerW - 20` (ranking, 2.35 = hash + px*2) o `fs * (labelLen * 0.58 + 2.0) > containerW - 20` (extra) | Stessa formula con `pw - 20`, fattori `3.55` (ranking, include shadow) e `3.2` (extra) |
| Posizione | `top-0 left-1/2 -translate-x-1/2` | Composito a `top: 0, left: round((pw - w) / 2)` |

## Gradiente fondo poster

| Parametro | Client (`PreviewBadges.tsx`) | Server (`badges.ts:bottomGradientSVG`) |
|---|---|---|
| Altezza | `height: gradientHeight%`, `minHeight: 100 * containerH / 570` | `gh = max(round(ph * pct / 100), 100)` |
| Colore | `gradientColor` → `rgba(r,g,b,gradientOpacity)` | `color` + `opacity` |
| Direzione | `dirCSS = gradientDir === "down" ? "to bottom" : "to top"` | `y1 = dir === "up" ? "0" : "1"`, `y2 = dir === "up" ? "1" : "0"` |
| Posizione | `posClass = gradientDir === "down" ? "top-0" : "bottom-0"` | `top = dir === "up" ? ph - gh : 0` |
| Fade (client: bottom→top) | `0% opaco → gf% opaco → fadeEnd% trasp → 100% trasp` <br>`gf = min(gradientFade, 100)`, `fadeEnd = min(gf + 20, 100)` | `0% trasp → svgFadeEnd% trasp → svgSolidPct% opaco → 100% opaco` <br>`svgSolidPct = 100 - cappedFade`, `svgFadeEnd = max(100 - min(cappedFade + 20, 100), 0)` |
| Note | Gradiente CSS `to top` (0% = bottom) | Gradiente SVG `y1=0 y2=1` (0% = top) — valori invertiti |
| Posizione badge genere | `bottom: 20 * containerH / 570 + bottomOffset` | `badgeY = ph - h - round(20 * ph / 570)` |

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
| `tl` | `topLight ? "1" : "0"` (se rankingBadges attivi) | `qTopLight` — override se presente |
| `rank` | `badge.rank` (se rankingBadges attivi) | `qRank` — override del ranking |
| `label` | `badge.rankLabel \|\| badge.label` | `qLabel` — override label ranking |
| `extra` | `badge.label` (se extra) o `customBadge` | `queryExtra` — forza badge extra |

## Bordo poster

| Parametro | Client (`EditView.tsx`) | Server (`route.ts`) |
|---|---|---|
| Bordo | `3px solid rgba(255,255,255,0.80)` | Rimosso (solo client) |
| Overlay | `absolute inset-0 pointer-events-none` (sopra ogni contenuto) | — |

## Files coinvolti

- `src/components/PreviewBadges.tsx` — client-side preview (React)
- `src/components/EditView.tsx` — orchestratore preview client
- `src/lib/context.tsx` — stato, URL builder, localStorage
- `src/lib/badges.ts` — server-side SVG (bottomGradientSVG)
- `src/lib/satori-badge.ts` — server-side Satori+Resvg (renderGenreBadge, renderRankingBadge, renderExtraBadge)
- `src/lib/badge-priority.ts` — logica priorità badge (condivisa)
- `src/app/api/poster/[type]/[id]/route.ts` — composizione poster finale
<!-- END:badge-sync -->
