/**
 * Posterium — Poster Diff
 *
 * Tool custom `render_poster_diff`: renderizza lo STESSO poster con due
 * configurazioni di resa (PRIMA/DOPO) e restituisce un'unica immagine di
 * confronto — poster PRIMA e DOPO affiancati, con la mappa di diff dei pixel
 * sotto — più le metriche numeriche (diff media, diff massima, % pixel
 * cambiati oltre soglia).
 *
 * Uso tipico: verificare visivamente l'effetto di una modifica a badge,
 * gradiente, logo o stili — es. `render_poster_diff` con `after_bs=pill`
 * confronta il default (shadow) col badge pill, `after_tl=1` confronta
 * scuro/chiaro, `ac=#E50914, after_ac=#00BFFF` confronta i colori accent.
 *
 * Parametri: `X` = valore PRIMA, `after_X` = valore DOPO (default = stesso
 * valore di X; se X non è dato, default server). mediaType/id/poster sono
 * condivisi tra le due configurazioni.
 *
 * Infrastruttura: stessa di render_poster (posterium-shared.ts) — mock server
 * locale + next dev su porte 8791/3101, avviati al primo uso e riusati.
 *
 * Diff pixel: sharp decodifica i due PNG, confronta i canali RGBA e genera
 * una heatmap (bianco = invariato, rosso = pixel cambiato oltre soglia,
 * con intensità proporzionale alla magnitudine del diff).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createRequire } from "node:module";
import {
  ensureServers,
  buildPosterUrl,
  isPosterium,
  readRenderVersion,
  PARAM_DESCRIPTIONS,
  POSTER_PARAM_KEYS,
} from "./posterium-shared";

// sharp risiede nel node_modules del progetto (root) — risolto risalendo da .pi/extensions
const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof import("sharp");

const PARAM_DESCRIPTIONS_NO_POSTER = PARAM_DESCRIPTIONS.filter(([key]) => key !== "poster");

const GAP = 16; // padding tra i pannelli
const PAD_TOP = 30; // barra etichette PRIMA/DOPO
const PAD_MID = 26; // etichetta DIFF
const PAD_BOTTOM = 14;
const LABEL_BG = "rgba(255,255,255,0.85)";

interface RenderOut {
  url: string;
  bytes: number;
  data: Buffer;
  width: number;
  height: number;
}

async function renderPoster(
  appBase: string,
  mediaType: string,
  id: number,
  poster: string,
  values: Record<string, string | undefined>,
  signal: AbortSignal | undefined,
): Promise<RenderOut> {
  const url = buildPosterUrl(appBase, { mediaType, id, poster, values });
  const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(120_000) });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    throw new Error(`POSTER route ${res.status}: ${body}`);
  }
  const data = Buffer.from(await res.arrayBuffer());
  return { url, bytes: data.length, data, width: 0, height: 0 };
}

interface DiffResult {
  width: number;
  height: number;
  heatmap: Buffer; // RGB
  meanDiff: number;
  maxDiff: number;
  changedPct: number;
  identical: boolean;
}

function computeDiff(a: Buffer, b: Buffer, width: number, height: number, threshold: number): DiffResult {
  const n = width * height;
  const heatmap = Buffer.alloc(n * 3);
  let sumDiff = 0;
  let maxDiff = 0;
  let changed = 0;
  for (let i = 0; i < n; i++) {
    const ai = i * 4;
    const hi = i * 3;
    const dr = Math.abs(a[ai] - b[ai]);
    const dg = Math.abs(a[ai + 1] - b[ai + 1]);
    const db = Math.abs(a[ai + 2] - b[ai + 2]);
    const d = (dr + dg + db) / 3;
    sumDiff += d;
    if (d > maxDiff) maxDiff = d;
    // heatmap: bianco = invariato, rosso = pixel cambiato (intensità amplificata);
    // il canale r resta 255, g/b scendono con la magnitudine del diff
    const v = Math.min(255, Math.round(d * 2.2));
    const inv = 250 - v;
    if (d > threshold) {
      changed++;
      heatmap[hi] = 255;
      heatmap[hi + 1] = inv;
      heatmap[hi + 2] = inv;
    } else {
      heatmap[hi] = inv;
      heatmap[hi + 1] = inv;
      heatmap[hi + 2] = inv;
    }
  }
  return {
    width,
    height,
    heatmap,
    meanDiff: sumDiff / n,
    maxDiff,
    changedPct: (changed / n) * 100,
    identical: changed === 0,
  };
}

function buildLabelsSvg(totalW: number, totalH: number, w: number, h: number, threshold: number): string {
  const panels = [
    { label: "PRIMA", cx: GAP + w / 2, top: 0 },
    { label: "DOPO", cx: GAP * 2 + w + w / 2, top: 0 },
    { label: `DIFF (soglia ${threshold})`, cx: GAP + w / 2, top: PAD_TOP + h + PAD_MID },
  ];
  const rects = panels
    .map(
      (p, i) =>
        `<rect x="${p.cx - w / 2}" y="${i === 2 ? p.top : PAD_TOP}" width="${w}" height="${h}" fill="none" stroke="#c9c9c9" stroke-width="1"/>`,
    )
    .join("");
  const labels = panels
    .map(
      (p) =>
        `<g><rect x="${p.cx - 38}" y="${p.top + 6}" width="76" height="17" rx="8" fill="${LABEL_BG}"/>` +
        `<text x="${p.cx}" y="${p.top + 18}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="#333">${p.label}</text></g>`,
    )
    .join("");
  return `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">${rects}${labels}</svg>`;
}

export default function posteriumPosterDiff(pi: ExtensionAPI) {
  if (!isPosterium()) return;

  const params: Record<string, unknown> = {};
  for (const [key, desc] of PARAM_DESCRIPTIONS_NO_POSTER) {
    params[key] = Type.Optional(Type.String({ description: `${desc} — configurazione PRIMA` }));
    params[`after_${key}`] = Type.Optional(
      Type.String({ description: `${desc} — configurazione DOPO (default: stesso valore di ${key})` }),
    );
  }

  pi.registerTool({
    name: "render_poster_diff",
    label: "Render Poster Diff",
    description:
      "Renderizza lo stesso poster con due configurazioni (PRIMA/DOPO) e restituisce un'unica immagine di confronto " +
      "(poster affiancati + heatmap del diff pixel) con le metriche numeriche (diff media/massima, % pixel cambiati). " +
      "Usa `after_X` per la configurazione DOPO (es. after_bs=pill, after_tl=1, after_ac=#00BFFF); X senza after_X vale per entrambe. " +
      "Stesso mock server di render_poster: dati deterministici, nessuna API key.",
    promptSnippet: "Compare two poster renders side by side with a pixel-diff heatmap and metrics",
    promptGuidelines: [
      "Use render_poster_diff when you changed render params and need to see the before/after impact (badges, gradient, logo, colors) instead of rendering twice with render_poster.",
      "render_poster_diff renders the same poster twice: params without prefix are the BEFORE config, after_<param> overrides a param for the AFTER config (e.g. after_bs=pill, after_tl=1, after_ac=#00BFFF).",
      "The returned image shows BEFORE | AFTER side by side with the pixel-diff heatmap below; the text result gives numeric metrics (mean/max diff, % pixels over threshold).",
      "render_poster_diff uses the local e2e mock server (deterministic data), so the first call may take ~30-60s to boot next dev; later calls are fast.",
    ],
    parameters: Type.Object({
      mediaType: Type.Optional(Type.Union([Type.Literal("movie"), Type.Literal("tv")])),
      id: Type.Optional(Type.Number({ description: "TMDB id (default 19995 = Avatar)" })),
      poster: Type.Optional(Type.String({ description: "path immagine poster (default /mocked/avatar.jpg)" })),
      threshold: Type.Optional(
        Type.Number({ description: "soglia diff per pixel 'cambiato' in 0-255 (default 10)" }),
      ),
      ...params,
    }),

    async execute(toolCallId, params, signal, onUpdate) {
      if (signal?.aborted) {
        return { content: [{ type: "text", text: "Cancelled" }], details: { cancelled: true } };
      }

      const mediaType = params.mediaType ?? "movie";
      const id = params.id ?? 19995;
      const poster = params.poster ?? "/mocked/avatar.jpg";
      const threshold = params.threshold ?? 10;
      const rv = readRenderVersion();

      const p = params as Record<string, string | number | undefined>;

      const beforeValues: Record<string, string | undefined> = {};
      const afterValues: Record<string, string | undefined> = {};
      for (const key of POSTER_PARAM_KEYS) {
        const before = typeof p[key] === "string" ? (p[key] as string) : undefined;
        const afterKey = `after_${key}`;
        const after = typeof p[afterKey] === "string" ? (p[afterKey] as string) : undefined;
        beforeValues[key] = before;
        afterValues[key] = after ?? before;
      }

      onUpdate?.({ content: [{ type: "text", text: "Avvio server di prova (mock + next dev)…" }], details: { progress: 20 } });
      const { appBase } = await ensureServers();

      onUpdate?.({ content: [{ type: "text", text: "Rendering PRIMA e DOPO…" }], details: { progress: 50 } });
      const [before, after] = await Promise.all([
        renderPoster(appBase, mediaType, id, poster, beforeValues, signal),
        renderPoster(appBase, mediaType, id, poster, afterValues, signal),
      ]);

      onUpdate?.({ content: [{ type: "text", text: "Calcolo diff pixel…" }], details: { progress: 75 } });

      // Decodifica in RGBA grezzo, normalizzando le dimensioni se mai differissero
      const decA = await sharp(before.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let decB = await sharp(after.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (decB.info.width !== decA.info.width || decB.info.height !== decA.info.height) {
        decB = await sharp(after.data)
          .resize(decA.info.width, decA.info.height)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
      }

      const { width: w, height: h } = decA.info;
      const diff = computeDiff(decA.data, decB.data, w, h, threshold);

      onUpdate?.({ content: [{ type: "text", text: "Composizione immagine di confronto…" }], details: { progress: 90 } });

      const totalW = GAP * 3 + w * 2;
      const totalH = PAD_TOP + h + PAD_MID + h + PAD_BOTTOM;
      const svgBuf = Buffer.from(buildLabelsSvg(totalW, totalH, w, h, threshold));

      const canvas = await sharp({
        create: {
          width: totalW,
          height: totalH,
          channels: 4,
          background: { r: 250, g: 250, b: 250, alpha: 1 },
        },
      })
        .composite([
          { input: before.data, left: GAP, top: PAD_TOP },
          { input: after.data, left: GAP * 2 + w, top: PAD_TOP },
          { input: diff.heatmap, left: GAP, top: PAD_TOP + h + PAD_MID, raw: { width: w, height: h, channels: 3 } },
          { input: svgBuf, left: 0, top: 0 },
        ])
        .png()
        .toBuffer();

      const qsA = new URL(before.url).searchParams.toString();
      const qsB = new URL(after.url).searchParams.toString();
      const status = diff.identical ? "IDENTICI" : "DIFFERENTI";

      return {
        content: [
          {
            type: "text",
            text:
              `Diff poster: ${mediaType}/${id} (rv ${rv}) — ${status}\n` +
              `PRIMA: ${qsA}\n  → ${before.bytes} bytes\n` +
              `DOPO:  ${qsB}\n  → ${after.bytes} bytes\n` +
              `Pixel diff (soglia ${threshold}): media ${diff.meanDiff.toFixed(2)}/255, max ${diff.maxDiff.toFixed(1)}/255, ` +
              `${diff.changedPct.toFixed(2)}% pixel cambiati`,
          },
          { type: "image", data: canvas.toString("base64"), mimeType: "image/png" },
        ],
        details: {
          mediaType,
          id,
          rv,
          threshold,
          status,
          beforeUrl: before.url,
          afterUrl: after.url,
          beforeBytes: before.bytes,
          afterBytes: after.bytes,
          meanDiff: diff.meanDiff,
          maxDiff: diff.maxDiff,
          changedPct: diff.changedPct,
          width: totalW,
          height: totalH,
        },
      };
    },
  });
}
