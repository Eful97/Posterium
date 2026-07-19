# Extending the Badge System

## Structure

The priority chain is defined in `src/lib/badge-priority.ts:computeBadge()`.

## How to add a new badge type

1. **Define the badge** in `getAllBadgeOptions()` in `badge-priority.ts`:
   ```ts
   { key: "badge.myNewBadge", label: "My New Badge" }
   ```

2. **Add translations** in every file under `src/lib/translations/*.json`:
   ```json
   "badge.myNewBadge": "Etichetta in questa lingua"
   ```

3. If the badge requires external data, add it to `metaInfo` in `context.tsx` and
   fetch it in `openPosterBrowser()` with parallel `Promise.all`.

4. Add to the priority chain in `computeBadge()` — insert at the correct position
   (first match wins).

5. If the badge has a different style, add a case in the renderer
   `svg-badge.ts` (`renderRankingBadge` or `renderExtraBadge`).

## Priority order (top to bottom)

- Nuovo film / nuova serie (< 2 weeks)
- Anime rank (MDBList)
- Trend rank (JustWatch)
- Award winner (Wikidata P166)
- Franchise (Wikidata P179)
- Nomination (Wikidata P1411)
- Network/Studio (TMDB)
- Director (Wikidata P57)
- Miniseries / Returning
- Binge-worthy / Top rated (≥ 8.5)

## Testing

Badges are tested in `src/__tests__/badge-validation.test.ts`.
Add a test for every new badge in the chain.
