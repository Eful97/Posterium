<p align="center">
  <img src="public/posterium.svg" alt="Posterium" width="400" />
</p>

Crea poster personalizzati per Stremio con badge genere/rating, ranking streaming e loghi.

## Funzionalità

- **Poster personalizzati** — scegli poster, loghi e badge per ogni film/serie
- **Badge automatici** — genere, rating, ranking JustWatch/FlixPatrol, premi e tendenze
- **Badge premi** — Oscar, Cannes, Venezia, BAFTA, Golden Globe, Emmy, David di Donatello
- **Loghi** — seleziona loghi ufficiali TMDB, posizionamento regolabile
- **Anteprima live** — vedi il risultato in tempo reale mentre modifichi
- **Badge condivisi** — SVG identici tra anteprima client e rendering server (Sharp)
- **Ranking streaming** — JustWatch Top 10 + FlixPatrol per piattaforma
- **TMDB integration** — cerca film/serie, sfoglia poster e loghi
- **Mapping CRUD** — salva, modifica, esporta/importa le tue configurazioni
- **Rate limiting** — protezione API con token bucket
- **Responsive** — ottimizzato sia per mobile che desktop

## Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Linguaggio**: TypeScript
- **Rendering poster**: Sharp
- **Dati**: TMDB API, JustWatch GraphQL, FlixPatrol, Wikidata SPARQL
- **Storage**: file system (JSON)

## Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|-----------|:------------:|-------------|
| `TMDB_API_KEY` | No | Chiave API TMDB (puoi inserirla anche dall'interfaccia) |

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Deploy su Hugging Face

1. Crea un nuovo Space su [huggingface.co/spaces](https://huggingface.co/spaces) con SDK **Docker**
2. Carica i file (tranne `node_modules`, `.next`, `.git`)
3. Imposta `TMDB_API_KEY` nelle variabili d'ambiente (opzionale)
4. Lo Space fa build e deploy automaticamente

## Licenza

MIT
