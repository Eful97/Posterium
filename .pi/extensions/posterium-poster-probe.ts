/**
 * Posterium — Poster Probe
 *
 * Tool custom `render_poster`: renderizza un poster con i parametri voluti e
 * restituisce l'immagine PNG all'agente (che può vederla direttamente).
 *
 * Infrastruttura: riusa lo stesso setup della suite e2e — mock server locale
 * (e2e/mock-server.mjs, dati deterministici, nessuna API key) + `next dev` su
 * porta dedicata con le base URL esterne puntate al mock. Entrambi i server
 * vengono avviati al primo uso e riusati per le chiamate successive.
 * Logica condivisa con poster-diff in posterium-shared.ts.
 *
 * Porte: mock 8791, app 3101 (diverse da quelle e2e 8790/3100).
 * Override via env POSTERIUM_PROBE_MOCK_PORT / POSTERIUM_PROBE_PORT.
 *
 * Log server: .pi/state/mock.log e .pi/state/app.log
 * I server restano attivi tra sessioni pi (detached): riusati alla chiamata
 * successiva. Per fermarli: taskkill sui processi node sulle porte 3101/8791
 * oppure riavviare il PC.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { ensureServers, buildPosterUrl, isPosterium, readRenderVersion, PARAM_DESCRIPTIONS } from "./posterium-shared";

// Parametri di resa documentati in AGENTS.md (tabella "Parametri URL").
const PARAM_DESCRIPTIONS_NO_POSTER = PARAM_DESCRIPTIONS.filter(([key]) => key !== "poster");

export default function posteriumPosterProbe(pi: ExtensionAPI) {
  if (!isPosterium()) return;

  const params: Record<string, unknown> = {};
  for (const [key, desc] of PARAM_DESCRIPTIONS_NO_POSTER) {
    params[key] = Type.Optional(Type.String({ description: desc }));
  }

  pi.registerTool({
    name: "render_poster",
    label: "Render Poster",
    description:
      "Renderizza un poster Posterium con i parametri di resa indicati e restituisce l'immagine PNG all'agente. " +
      "Usa il mock server locale (dati deterministici: Avatar 19995, Interstellar 157336, Matrix 603, Inception 27205, " +
      "Pulp Fiction 680), nessuna API key necessaria. Avvia al primo uso mock server + next dev su porte dedicate (8791/3101).",
    promptSnippet: "Render a Posterium poster PNG and inspect its visual output",
    promptGuidelines: [
      "Use render_poster to visually verify badge/logo/gradient changes before committing, instead of reasoning about SVG math blindly.",
      "render_poster uses the local e2e mock server (deterministic data), so the first call may take ~30-60s to boot next dev; later calls are fast.",
      "Set tl=1/0 to test light/dark posters, bs/rs for badge styles, bg/by/br to toggle genre/year/rating segments, gradHeight for the gradient height.",
    ],
    parameters: Type.Object({
      mediaType: Type.Optional(Type.Union([Type.Literal("movie"), Type.Literal("tv")])),
      id: Type.Optional(Type.Number({ description: "TMDB id (default 19995 = Avatar)" })),
      ...params,
    }),

    async execute(toolCallId, params, signal, onUpdate) {
      if (signal?.aborted) {
        return { content: [{ type: "text", text: "Cancelled" }], details: { cancelled: true } };
      }

      const mediaType = params.mediaType ?? "movie";
      const id = params.id ?? 19995;
      const rv = readRenderVersion();

      onUpdate?.({ content: [{ type: "text", text: "Avvio server di prova (mock + next dev)…" }], details: { progress: 30 } });

      const { appBase } = await ensureServers();

      onUpdate?.({ content: [{ type: "text", text: "Rendering poster…" }], details: { progress: 60 } });

      const values: Record<string, string | undefined> = {};
      for (const [key] of PARAM_DESCRIPTIONS_NO_POSTER) {
        values[key] = (params as Record<string, string | undefined>)[key];
      }

      const url = buildPosterUrl(appBase, {
        mediaType,
        id,
        poster: (params as Record<string, string | undefined>).poster ?? "/mocked/avatar.jpg",
        values,
      });

      const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(120_000) });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 500);
        throw new Error(`POSTER route ${res.status}: ${body}`);
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const base64 = buf.toString("base64");
      const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/png";

      return {
        content: [
          {
            type: "text",
            text:
              `Poster renderizzato: ${mediaType}/${id} (${buf.length} bytes, rv ${rv})\n` +
              `URL: ${url}\nParametri: ${new URL(url).searchParams.toString()}`,
          },
          { type: "image", data: base64, mimeType },
        ],
        details: { url, bytes: buf.length, mediaType, id, query: new URL(url).searchParams.toString(), mimeType },
      };
    },
  });
}
