<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:badge-sync -->
# Badge Genere/Rating — Parametri sincronizzati

Quando l'utente modifica l'anteprima client (`PreviewBadges.tsx`), aggiornare anche il server (`badges.ts`).

## Parametri da sincronizzare

```
Client (PreviewBadges.tsx)          → Server (badges.ts)
────────────────────────────────────────────────────────────────────
genre: fontSize                      → fontSize = X * pw / 380
bullet: fontSize (es. 19px)         → bulletFontSize = fontSize * 19 / X
star: fontSize (es. 22px)           → starR = fontSize * 0.45  (restituisce 2*starR ≈ stella client a 380px)
vote: fontSize (es. 24px)           → stesso fontSize

gap genre→bullet (es. 8px)          → gap = round(fontSize * 8 / X)
gap bullet→star (es. 8px)           → gap (stesso valore, riusato)
gap star→vote (es. 6px)             → gap2 = round(fontSize * 6 / X)

genre: #fff, w500                   → #fff, w500
bullet: rgba(255,255,255,0.6)        → rgba(255,255,255,0.6)
star: #F5C518                       → #F5C518
vote: #fff, w600                    → #fff, w600

gradient: 0.7 at bottom, trasp 50%  → bottomGradientSVG: stop 50%=trasp, 100%=0.7
gradient height: 40% containerH     → gh = 40% posterH

Ranking/Extra badge (PreviewBadges.tsx → satori-badge.ts):
px-6 (24px)                         → px = round(fontSize * 1.2)
py-2.5 (10px per side)             → pt = pb = round(fontSize * 0.7)   (compensates line-height)
rounded-b-2xl (16px)               → r = round(fontSize * 0.8)
text-xl (20px)                      → fontSize = round(20 * pw / 380)
bottom-6 (24px) genre badge offset  → badgeY = ph - h - round(24 * ph / 570)
```

Dove `X` = base font size del client (es. 24px).

## Files coinvolti

- `src/components/PreviewBadges.tsx` — client-side preview (HTML flexbox)
- `src/lib/badges.ts` — server-side SVG (bottomGradientSVG + topGradientSVG)
- `src/lib/satori-badge.ts` — server-side Satori+Resvg (genreRatingBadge, rankingBadge, extraBadge)
<!-- END:badge-sync -->
