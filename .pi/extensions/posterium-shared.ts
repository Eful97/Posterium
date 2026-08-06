/**
 * Posterium — Shared infra for pi extensions
 *
 * Infrastruttura condivisa tra le estensioni posterium (poster-probe,
 * poster-diff): avvio/riuso dei server di prova (mock server locale +
 * next dev su porte dedicate), descrizione dei parametri di resa e builder
 * dell'URL del poster.
 *
 * Porte: mock 8791, app 3101 (diverse da quelle e2e 8790/3100).
 * Override via env POSTERIUM_PROBE_MOCK_PORT / POSTERIUM_PROBE_PORT.
 *
 * Nota: pi carica ogni `*.ts` di `.pi/extensions` come estensione e segnala
 * un errore se il modulo non esporta una factory valida — questo modulo ha
 * quindi un default export no-op per non produrre noise nel loader.
 */
import { spawn } from "node:child_process";
import { mkdirSync, openSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const MOCK_PORT = Number(process.env.POSTERIUM_PROBE_MOCK_PORT) || 8791;
export const APP_PORT = Number(process.env.POSTERIUM_PROBE_PORT) || 3101;
export const MOCK_BASE = `http://127.0.0.1:${MOCK_PORT}`;
export const APP_BASE = `http://127.0.0.1:${APP_PORT}`;

export const STATE_DIR = join(process.cwd(), ".pi", "state");
const DIST_DIR = ".next-e2e-probe";

let serversPromise: Promise<{ appBase: string }> | null = null;

export function isPosterium(): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { name?: string };
    return pkg.name === "posterium";
  } catch {
    return false;
  }
}

async function reachable(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

async function reachableAny(url: string, timeoutMs: number): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return true; // qualsiasi risposta HTTP (anche 503) = server su
  } catch {
    return false;
  }
}

async function waitFor(url: string, timeoutMs: number, anyStatus: boolean): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const check = anyStatus ? reachableAny : reachable;
  while (Date.now() < deadline) {
    if (await check(url, 2000)) return true;
    await new Promise((r) => setTimeout(r, 750));
  }
  return check(url, 2000);
}

function spawnNode(args: string[], extraEnv: Record<string, string>, logPath: string): void {
  mkdirSync(dirname(logPath), { recursive: true });
  const fd = openSync(logPath, "a");
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    detached: true,
    stdio: ["ignore", fd, fd],
    windowsHide: true,
  });
  child.on("error", () => {
    /* il log del file mostra l'errore */
  });
  if (typeof child.unref === "function") child.unref();
}

/**
 * Avvia (o riusa se già attivi) mock server + next dev, come da render_poster.
 * I server restano attivi tra sessioni pi (detached).
 */
export async function ensureServers(): Promise<{ appBase: string }> {
  if (!serversPromise) {
    serversPromise = startServers().catch((err) => {
      serversPromise = null; // consente un retry alla chiamata successiva
      throw err;
    });
  }
  return serversPromise;
}

async function startServers(): Promise<{ appBase: string }> {
  // 1. Mock server (dati TMDB/JustWatch/Wikidata/IMDb deterministici)
  if (!(await reachable(`${MOCK_BASE}/healthz`, 1500))) {
    spawnNode(["e2e/mock-server.mjs"], { MOCK_PORT: String(MOCK_PORT) }, join(STATE_DIR, "mock.log"));
    if (!(await waitFor(`${MOCK_BASE}/healthz`, 20_000, false))) {
      throw new Error(`Mock server non raggiungibile su ${MOCK_BASE} — vedi ${join(STATE_DIR, "mock.log")}`);
    }
  }

  // 2. App (next dev con base URL esterne puntate al mock)
  if (!(await reachableAny(`${APP_BASE}/api/health`, 2000))) {
    const env = {
      NEXT_DIST_DIR: DIST_DIR,
      TMDB_BASE_URL: `${MOCK_BASE}/3`,
      TMDB_IMG_URL: `${MOCK_BASE}/t/p`,
      NEXT_PUBLIC_TMDB_IMG_URL: `${MOCK_BASE}/t/p`,
      JUSTWATCH_API_URL: `${MOCK_BASE}/graphql`,
      WIKIDATA_SPARQL_URL: `${MOCK_BASE}/sparql`,
      IMDB_CHART_URL: `${MOCK_BASE}/chart/top`,
      MDBLIST_API_URL: `${MOCK_BASE}/mdblist/api`,
      TRAKT_API_URL: `${MOCK_BASE}/trakt`,
      SIMKL_API_URL: `${MOCK_BASE}/simkl`,
    };
    spawnNode(
      ["./node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", String(APP_PORT)],
      env,
      join(STATE_DIR, "app.log"),
    );
    if (!(await waitFor(`${APP_BASE}/api/health`, 180_000, true))) {
      throw new Error(`App non raggiungibile su ${APP_BASE} entro 180s — vedi ${join(STATE_DIR, "app.log")}`);
    }
  }

  return { appBase: APP_BASE };
}

// Parametri di resa documentati in AGENTS.md (tabella "Parametri URL").
export const PARAM_DESCRIPTIONS: ReadonlyArray<readonly [string, string]> = [
  ["badges", "0 per nascondere il badge genere/rating"],
  ["ranking", "0 per nascondere il badge ranking"],
  ["bg", "0 per nascondere il GENERE nel badge genere/rating"],
  ["by", "0 per nascondere l'ANNO nel badge genere/rating"],
  ["br", "0 per nascondere il VOTO nel badge genere/rating"],
  ["gradHeight", "altezza gradiente/sfocatura (es. 30)"],
  ["tl", "1 = poster chiaro (topLight), 0 = scuro"],
  ["rank", "override del ranking (es. #1)"],
  ["label", "override label ranking (es. TOP 250)"],
  ["extra", "testo per badge extra/custom"],
  ["bs", "stile badge genere: shadow|pill|bar|colored|bordo|vetro"],
  ["rs", "stile badge ranking: default|bar|colored|pill|netflix"],
  ["side", "right = nastro Netflix a destra (modalità Stremio)"],
  ["ac", "colore accent (hex, es. #E50914)"],
];

export const POSTER_PARAM_KEYS = PARAM_DESCRIPTIONS.map(([key]) => key).filter((k) => k !== "poster");

/** Legge la RENDER_VERSION corrente da src/lib/render-version.ts. */
export function readRenderVersion(): string {
  try {
    const src = readFileSync(join(process.cwd(), "src", "lib", "render-version.ts"), "utf8");
    const m = src.match(/RENDER_VERSION\s*=\s*"([^"]+)"/);
    return m ? m[1] : "?";
  } catch {
    return "?";
  }
}

export interface RenderParams {
  mediaType: string;
  id: number;
  poster: string;
  values: Record<string, string | undefined>;
}

/**
 * Costruisce l'URL del poster per la route /api/poster/{type}/{id}
 * (la stessa usata da preview client e Stremio). I valori undefined
 * non vengono inviati (default server).
 */
export function buildPosterUrl(appBase: string, p: RenderParams): string {
  const qs = new URLSearchParams();
  qs.set("poster", p.poster);
  qs.set("preview", "1");
  for (const key of POSTER_PARAM_KEYS) {
    const value = p.values[key];
    if (value !== undefined) qs.set(key, value);
  }
  return `${appBase}/api/poster/${p.mediaType}/${p.id}?${qs.toString()}`;
}

/** Default export no-op: pi pretende una factory in ogni `.ts` di extensions. */
export default function posteriumShared(): void {
  /* modulo condiviso — nessuna registrazione */
}
