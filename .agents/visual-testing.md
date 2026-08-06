# Posterium - Visual Regression Testing

> **Dopo ogni modifica ai parametri di resa visiva in QUALSIASI file elencato in
> `render-params.md`**, esegui la suite visiva per verificare che la sincronizzazione
> client/server sia corretta.

## Comandi

| Regola | Dettaglio |
|---|---|
| Comando | `npx playwright test e2e/posterium-visual.spec.ts` (solo test visivi) |
| Suite completa | `npx playwright test e2e/` (include smoke test) |
| Dipendenze esterne | Nessuna: i test usano il mock server locale (`e2e/mock-server.mjs`), avviato da `playwright.config.ts`, che serve TMDB/JustWatch/Wikidata/IMDb con dati deterministici. `TMDB_API_KEY` non serve più. Attenzione: serve una porta dedicata e un `distDir` separato (`.next-e2e`), quindi puoi eseguire i test anche con `npm run dev` attivo. |
| Snapshot intenzionali | Se la modifica ALTERA INTENZIONALMENTE l'aspetto, aggiorna con `npx playwright test --update-snapshots` e committa i nuovi `.png` |
| RENDER_VERSION | Ogni modifica ai parametri di resa (font, padding, gap, colori, gradienti, blur, logo) DEVE rigenerare `RENDER_VERSION` (mai editare `src/lib/render-version.ts` a mano) e aggiornare il valore `rv` nella riga header di `AGENTS.md`. `predev`/`prebuild`/`pretest` rigenerano automaticamente; per verifica immediata: `node scripts/write-render-version.mjs`. I test visivi confermano la coerenza della modifica. |

## Test attivi

- **4 screenshot fissi**: home full-page, home viewport, home mobile, /status — sempre attivi
- **21 test poster API** (10 funzionali + 11 visual): badge shadow/pill/bar/colored, ranking, extra, gradient height (`gradHeight`; `gradColor/gradOpacity/gradFade/gradDir` rimossi in quanto morti), blur, clean, anime — sempre attivi (grazie al mock server)

## Regole

- Fallimento della suite visiva = bloccante. Fix o re-baseline intenzionale; mai ignorare.
- Non committare snapshot rigenerati senza averli revisionati.
- Gli snapshot stanno in git: sono il contratto di regressione.

> Il workflow operativo completo (diagnosi del diff, update snapshots, MCP browser) vive nel skill `poster-visual`.
