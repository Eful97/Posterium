# Pictorium - Render Parameters (Client ↔ Server)

> **Source of truth.** This file is the canonical map of every visual render parameter
> in Pictorium. The client preview is a single `<img src={previewUrl}>` that loads
> `/api/poster/{type}/{id}` — the same endpoint used by Stremio. There is no
> duplication: preview = final poster. When this file and the code disagree,
> **CODE WINS** — update this file.

When you modify a visual render parameter in one file, update its server counterpart
(or vice versa). The `poster-sync` skill drives this workflow end-to-end.

## Badge Genere/Rating (GenreRatingBadges)

**Componenti configurabili** (`bg`/`by`/`br`): genere, anno e voto si attivano **indipendentemente**. Default tutti ON → output byte-identico al passato (`Dramma • ★ 8.2 • 2024`). Il badge si mostra se almeno un componente abilitato ha un valore disponibile (`hasGenreBadge = badgesEnabled && ((genre && bg) || (rating > 0 && br) || (year && by))`). Lato SVG i segmenti sono condizionali in `badge-svg-shared.ts:buildGenreTextFlow` — il `dx` di separazione si emette solo se il segmento ha un precedente visibile (per non sfuocare dal centro quando anno o voto sono il primo segmento).

| Parametro | Server (`svg-badge.ts:renderGenreBadge`) |
|---|---|
| Font size | `finalFontSize = round(24 * 1.2 * pw / 380)` (base 120% nativa) |
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

## Badge Ranking/Extra

| Parametro | Server (`svg-badge.ts:renderRankingBadge/renderExtraBadge`) |
|---|---|
| Font size base | `23 * pw / 380` (rank), `×0.9` per extra ("Vincitore Oscar" a 100% troppo grande) |
| Padding X | `px = round(finalFontSize * 1.0)` |
| Padding Y (bar) | `pt = pb = round(displayFs * 0.35)` |
| Padding Y (default) | `pt = pb = round(displayFs * 0.5)` |
| Border radius | `r = round(finalFontSize * 0.7)` |
| Ombra | `shadowBlur = round(fs * 0.6)`, `shadowOff = round(fs * 0.2)` |
| Sfondo | `topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"` |
| Testo | `topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"` |
| Stabilizzazione testo | `textLength` + `lengthAdjust="spacingAndGlyphs"` sul `<text>` per evitare differenze metriche tra Windows/local e Linux/HF |
| Overflow protection | Stessa formula con `pw - 20`, fattori `3.55` (ranking, include shadow) e `3.2` (extra); extra compatti cappati al 65% di `pw` (solo label oltre il cap si rimpiccioliscono) |
| Posizione | Composito a `top: 0, left: round((pw - w) / 2)` (default/bar/pill/colored); nastro Netflix a `left: 0` (Nuvio) o `left: STD_W - w` specchiato (Stremio, `side=right`); logo network segue a destra del nastro (`w + 10`) o a sinistra (`STD_W - w - 10 - logoW`) |
| Scala badge superiore (`topBadgeScale`) | Resize bitmap dopo il render (nastro incluso; la **barra** scala nativa via font per restare full-width), prima di `fitBadgeToCanvas`; `%` 10..200, default 100; entra nella `rankBadgeKey` |
| Offset badge superiore (`topBadgeOffsetX/Y`) | Solo stili centrati: `left = center + tox`, `top = 0 + toy` (px, default 0); nastro/barra restano ancorati; la matematica overlap usa `finalRankTop + h` |
| Posizione badge qualità | Angolo in alto a destra (`left = pw - w - padX`, `top = padY`); con nastro Netflix a destra (Stremio) va a **sinistra** (`left = padX`) per non restargli accanto, impilato sotto il logo network se occupa il top-left (`top = netBottom + gap`) |

## Pill Network Logo

| Parametro | Server (`network-svgs.ts:loadNetworkPng` & `poster-service.ts`) |
|---|---|
| Sfondo | `topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"` |
| Bordo | `topLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.20)"` stroke-width 1px |
| Padding | `px = round(fs * 0.65)`, `pt = pb = round(fs * 0.32)` dove `fs = round(max(18 * pw / 380, 12))` |
| Raggio | `r = round(pillH * 0.35)` (squircle, identico al badge qualità) |
| Posizione | default in alto a sinistra (`top = round(18 * STD_H / 570)`, `left = round(18 * STD_W / 380)`, resta a sinistra anche con `side="right"`); centrato sopra il logo film (`top = logoTop - h - gap`) SOLO con nastro Netflix o Coming Soon; senza logo film e con nastro: a fianco del nastro (`w + 10`). Se si sovrappone al badge centrale, rimpicciolisce fino a 0.55x |
| Scala (`netscale`) | Resize bitmap dopo il fetch, prima del fit; `%` 10..200, default 100 |
| Offset (`nox`/`noy`) | `top += noy`, `left += nox` (px, default 0) dopo il posizionamento automatico |
| Logo interno | `topLight ? rgba(255,255,255,0.85) : rgba(18,18,22,0.88)` (eccetto Marvel a colori brand) |
| Ombra | Nessuna ombra esterna (pill piatta, contrasto garantito dallo sfondo della pill) |

## Riga multi-rating (Custom Rating Provider)

Solo quando il provider è abilitato server-side (`PICTORIUM_CUSTOM_RATING_*`) ed esistono item: a provider OFF nessun pixel cambia (snapshot fermi, niente bump di `RENDER_VERSION`).

| Parametro | Server (`multi-rating-renderer.ts:renderMultiRatings`) |
|---|---|
| Font size | `20` fissa (non scala con `pw`) |
| Pill | `h = 38`, `rx = 19`, padding X totale `28`, gap `8` |
| Cap display | `MAX_CUSTOM_RATINGS = 5` (i dati restano completi, la riga mostra le prime 5) |
| Colori | convenzione ranking-badge: `topLight ? rgba(0,0,0,0.80) : rgba(255,255,255,0.80)` bg; testo `topLight ? rgba(255,255,255,0.80) : rgba(0,0,0,0.80)` |
| Testo | `fontFamilyFor(label)` per-pill (ebraico → Rubik) + `textLength`/`lengthAdjust="spacingAndGlyphs"` come gli altri badge; `dominant-baseline="central"`, nome troncato a 80 char, `escSvg` |
| Font embedded | `wrapSvg()` come tutti i badge (pesi 400/700/900) |
| Fit | `w = min(maxWidth, width)` con `maxWidth = STD_W - 40`, `h` in scala proporzionale |
| Posizione | centrata, `top = legacyTop - h - 10` sopra il badge genere (o `STD_H - 20` senza badge) — `poster-service.ts` |

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
| `bg` | `badgeGenre === false ? "0" : null` | `qBg !== null ? qBg !== "0"` — nasconde il GENERE nel badge genere/rating |
| `by` | `badgeYear === false ? "0" : null` | `qBy !== null ? qBy !== "0"` — nasconde l'ANNO nel badge genere/rating |
| `br` | `badgeRating === false ? "0" : null` | `qBr !== null ? qBr !== "0"` — nasconde il VOTO nel badge genere/rating |
| `cr` | sempre esplicito in preview (`cr=0/1`, WYSIWYG); solo-OFF in pattern/Stremio | `qCr` — display riga rating custom: `query > mapping.customRatings > config > defaults > true`, AND con env `PICTORIUM_CUSTOM_RATING_ENABLED` |
| `gradHeight` | `gradientHeight` | `qGradHeight` — alimenta l'altezza del gradiente/sfocatura (blurHeight) |
| `tl` | `topLight ? "1" : "0"` (sempre, anche per genre badges) | `qTopLight` — override se presente |
| `pre` | `preRelease ? "1" : null` (solo se ON, default OFF) | `qPre` — effetto pre-digitale: velo scuro (sotto logo e badge, che restano luminosi) + nastro angolare rosso "coming soon!" in alto (a sinistra; a destra con side="right") sui film senza disponibilità digitale/streaming (JW offerte non-CINEMA > TMDB type 4). Catena: query > config token > server defaults (`PICTORIUM_PRE_RELEASE`) > false |
| `rd`/`fad` | date complete `release_date`/`first_air_date` (solo se valide `YYYY-MM-DD`) | ramo query: date a piena precisione per rilevamento pre-digitale (fallback `year` → `${y}-01-01`) |
| `title` | `selected.title \|\| selected.name` (preview) / `mapping?.title` (Stremio) | titolo per il match JustWatch (`preTitle`: mapping > query > session > `genreName`) — senza, la ricerca usa `genreName` e il match per tmdbId fallisce (rilevamento pre-digitale + qualità degradati) |

> `gradColor`, `gradOpacity`, `gradFade`, `gradDir` sono **parametri morti**: non vengono più letti dal server (il gradiente usa il colore accent + `gradHeight`). `bottomGradientSVG` in `badges.ts` non è più chiamato dal compositore poster. Non reintrodurli.
| `rank` | `badge.rank` (se rankingBadges attivi) | `qRank` — override del ranking |
| `animerank` | rank anime del titolo selezionato (da `mdblistAnimeList`, solo preview WYSIWYG) | `qAnimeRank` — override del rank anime (`media_type=tv`); senza, il server lo calcola da `fetchMDBList` con la chiave della richiesta o il fallback d'istanza (`PICTORIUM_MDBLIST_KEY`) |
| `label` | `badge.rankLabel \|\| badge.label` | `qLabel` — override label ranking |
| `extra` | `badge.label` (se extra) o `customBadge` | `queryExtra` — forza badge extra |
| `bs` | `badgeStyle` | `qBs` — "shadow"/"pill"/"bar"/"colored"/"bordo"/"vetro" |
| `rs` | `rankingBadgeStyle` | `qRs` — "default"/"bar"/"colored"/"pill"/"netflix" |
| `tscale`/`tox`/`toy` | `topBadgeScale`/`topBadgeOffsetX`/`topBadgeOffsetY` (badge superiore) | scala `%` 10..200 (default 100, tutti gli stili) + offset px (default 0, solo centrati) |
| `gscale` | `genreBadgeScale` (badge genere/rating in basso) | scala `%` 10..200 (default 100 su base 120% nativa; la **barra** scala nativa via font per restare full-width) |
| `gox`/`goy` | `genreBadgeOffsetX`/`genreBadgeOffsetY` | offset px (default 0, solo stili non-bar) |
| `qscale` | `qualityBadgeScale` (badge qualità streaming) | scala `%` 10..200 (default 100 su base 120% nativa) |
| `qox`/`qoy` | `qualityBadgeOffsetX`/`qualityBadgeOffsetY` | offset px (default 0) |
| `netscale` | `networkLogoScale` (logo network) | scala `%` 10..200 (default 100) |
| `nox`/`noy` | `networkLogoOffsetX`/`networkLogoOffsetY` | offset px (default 0) |
| `side` | `ribbonSide === "right" ? "right" : null` (modalità Stremio; default Nuvio = sinistra) | `qSide` — "right" sposta nastro Netflix (specchiato) + logo network + nastro Coming Soon a destra |
| `ac` | `accentColor` (da `extractBadgeColor()`) | `qAc` — override colore accent |

> URL Stremio (cataloghi/meta): `buildStremioPosterUrl()` emette gli stessi parametri ma dal **mapping salvato con fallback ai default** (`mapping?.X ?? defaults.X`) per `badges`/`ranking`/`bs`/`rs`/`gradHeight`/`blur`/`bf`/`bd`/`be`/`extra`/`tscale`/`tox`/`toy`/`gscale`/`gox`/`goy`/`qscale`/`qox`/`qoy`/`netscale`/`nox`/`noy` — emissione sempre esplicita, così la precedenza server (query > mapping > config > defaults) resta fedele al per-titolo anche con installazioni `?config=` (dove il token scavalcerebbe il mapping). `extra` è emesso solo per customBadge **non** rank-key (`isRankKey`): le rank-key viaggiano via rank live + fallback `mapping.badgeRank`/`trendRank`/`animeRank` su fetch fallito (mai su miss genuina: un titolo uscito dalla chart non resuscita il rank stantio), altrimenti `queryExtra` duplicherebbe il badge (vince sul calcolato).

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
- `src/lib/svg-badge.ts` — server-side SVG raw badges (renderGenreBadge, renderRankingBadge, renderExtraBadge) + Resvg rendering + `wrapSvg()` (font embedding, usato anche dalla riga multi-rating)
- `src/lib/multi-rating-renderer.ts` — riga pill custom rating (`renderMultiRatings`, `MAX_CUSTOM_RATINGS`)
- `src/lib/custom-rating/` — provider server-side (`fetchCustomRatings`, `resolveCustomRatingConfig`, `formatRating`)
- `src/lib/badge-priority.ts` — logica priorità badge (condivisa)
- `src/lib/logo-layout.ts` — geometria condivisa logo preview/server
- `src/app/api/poster/[type]/[id]/route.ts` — composizione poster finale (preview + Stremio usano la stessa route)
- `e2e/pictorium-visual.spec.ts` — test di regressione visiva (screenshot) per poster e interfaccia
- `e2e/pictorium-smoke.spec.ts` — smoke test funzionali

> Dopo ogni modifica ai parametri di resa visiva in QUALSIASI file qui elencato, segui il workflow in `visual-testing.md`.
