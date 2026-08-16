# Open Design — Brief pronti per Posterium

> Come usarli: in Open Design seleziona il design system **Posterium**, poi scegli il tipo di artefatto (Prototype / Deck / Image) e incolla il brief (in inglese, così l'agente sfrutta al meglio il `DESIGN.md`). Genera → critica → itera → esporta (HTML / PPTX / PDF / PNG).

## Workflow rapido nell'app

1. **Home** → scegli uno skill (es. `od-default` o `od-new-generation`) + design system **Posterium** → incolla il brief.
2. Oppure entra in un progetto → **Studio** → scegli il tipo di artefatto.
3. Dopo la prima bozza usa la **critica**: "keep the overall layout, make X …", "try variant Y".
4. **Esporta**: prototipo → HTML (poi portabile in React/Tailwind nel repo); deck → PPTX/PDF; immagine → PNG ad alta risoluzione.

---

## Brief 1 — Editor UI mockup (Prototype)

```
Create a single-page HTML prototype of the Posterium editor, following the
Posterium design system (tokens.css + DESIGN.md) exactly: dark glassmorphism,
near-black background #0a0a0a with a soft radial accent glow top-center,
accent #e85d2a, Geist UI font, glass recipe (gradient + tint + border +
shadow + 14px blur).

Layout, desktop-first (1280px+):
- Centered header: Posterium logo image on top, uppercase muted tagline
  "POSTER PERSONALIZZATI PER LA TUA LIBRERIA STREMIO" beneath it (letter-
  spacing 0.14em, 11px).
- Three-column editor below: left = poster options (grid of poster tiles
  2/3 aspect with hover lift + accent glow, one tile selected with accent
  border ring, a small amber "BEST FIT" badge on the best-fit tile); center =
  live poster preview standing on a frosted podium (glass frame, accent glow
  ring when active), a mock 500x750 movie poster with the genre badge
  (pill style, genre + year + rating) and a Netflix-style red ranking
  ribbon on the left edge; right = details/settings panel (badge style
  segmented control with the 6 style previews, sliders for blur intensity /
  gradient height with accent fill, toggles with accent-on state and glow).
- Top-right floating glass toolbar (copy URL, profile, settings icons,
  36-44px icon buttons with hover tooltips).
- Use compact dense labels (10-12px, 600-700 weight), tabular numbers for
  the rating, min 44px touch targets.

The prototype must be self-contained HTML/CSS (no external images except
the placeholder poster, which you can generate as an inline SVG mock).
```

---

## Brief 2 — Landing page (Prototype)

```
Create a single-page HTML landing page for Posterium, a dynamic poster
generator for Stremio. Follow the Posterium design system exactly
(tokens.css + DESIGN.md): dark glassmorphism, #0a0a0a background, accent
#e85d2a, Geist font, glass panels.

Sections:
1. Hero: Posterium logo, headline "Custom posters for your Stremio
   library", tagline "Clean logos, IMDb/TMDB ratings, JustWatch trends,
   Netflix Top 10 ribbons, awards badges — generated in real time",
   primary CTA button (accent gradient, white text, glow) "Install on
   Stremio" + secondary "Deploy your own". Kicker pill above the headline
   ("OPEN-SOURCE · SELF-HOSTED").
2. Feature grid (6 glass cards, each with a small accent icon):
   one-click clean poster selection with best-fit, 6+5 badge styles,
   automatic rankings (JustWatch/FlixPatrol/MDBList/IMDb Top 250/awards),
   network logos (Netflix, Disney+, HBO Max, ...), 24h poster rotation,
   cloud profile sync.
3. Gallery: a row of 3 mock 2/3 movie posters with different badge styles
   (shadow, pill, netflix ribbon + network logo) on a glass carousel track.
4. Deploy strip: chips "Docker · Vercel · HF Spaces · Oracle · Termux".
5. Footer: AGPL-3.0, credits line.

Self-contained HTML/CSS; mock posters as inline SVG.
```

---

## Brief 3 — Pitch deck (Deck)

```
Create a 9-slide pitch deck for Posterium, a dynamic poster generator for
Stremio/media centers. Use the Posterium design system (tokens.css +
DESIGN.md): dark #0a0a0a slides, accent #e85d2a, Geist font, glass panels,
compact uppercase section kickers with accent color.

Slides:
1. Title: Posterium logo, "Custom posters for your Stremio library".
2. Problem: default Stremio posters are generic and boring — clean artwork
   with title text baked in, no ratings, no rankings, no branding.
3. Solution: one endpoint (/api/poster/{type}/{id}) serves both the WYSIWYG
   editor preview and the final Stremio poster — what you see is what you
   get.
4. How it works: pick a clean poster → best-fit algorithm → compose badges
   (genre/rating), rankings, network logos, blur gradient → serve with CDN-
   friendly caching.
5. Badges showcase: 6 genre/rating styles (shadow, pill, bar, colored,
   bordo, vetro) and 5 ranking styles including the Netflix red ribbon.
6. Automatic data: JustWatch Italy, FlixPatrol Top 10, MDBList, IMDb Top
   250, Oscar/Cannes/BAFTA/Emmy awards (Wikidata), cult directors.
7. Personalization: per-title config, cloud profile (UUID + password),
   per-link config tokens (HMAC), multi-language UI (5 languages).
8. Deploy: Docker, Vercel, HF Spaces, Oracle Cloud, Termux, VPS — no
   instance API keys, per-user keys only.
9. Closing: "Your library, your posters." + AGPL-3.0 note.

Use the poster badge visual language in slide graphics (mock posters with
ribbons and badges as SVG). Export-ready for PPTX/PDF: avoid overlap,
keep text within safe margins.
```

---

## Brief 4 — Social / README banner (Image)

```
Generate a 1600x900 promotional image for Posterium. Dark background
#0a0a0a with a soft radial accent glow (#e85d2a, alpha ~0.12) top-center.
Composition:
- Posterium logo centered upper third, with the uppercase tagline
  "Poster personalizzati per la tua libreria Stremio" in muted 11px
  letterspaced text below it.
- Lower two thirds: a row of three 2/3 movie posters (mock, cinematic
  artwork) — the center poster larger and raised, showing a genre badge
  (pill, accent) and a red Netflix-style ranking ribbon; the side posters
  show a shadow badge and a colored badge with a network logo chip.
- Subtle glass panel behind the posters (border rgba(255,255,255,0.08),
  inset top highlight), vignette at the edges.
Style: premium streaming aesthetic, layered glass, no extra accent colors.
Output at high resolution.
```

---

## Consigli

- **Itera con la critica**, non rigenerare da zero: "keep the layout, make the center poster bigger", "switch the ribbon to the right side (Stremio)", "use the pill badge style everywhere".
- **Il prototipo editor (Brief 1)** è il candidato migliore per tornare nel repo: esporta l'HTML e portalo in React/Tailwind seguendo i componenti già esistenti (`EditorPanel`, `PosterOptions`, `preview-frame`…), poi verifica con la visual suite.
- **Il deck (Brief 3)** può andare in `docs/` del repo quando lo esporti.
- Se un output non rispetta i token (es. accent sbagliato), punta l'errore nella critica: "use #e85d2a for the accent and the glass recipe from tokens.css" — il package è lì per questo.
