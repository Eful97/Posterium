/**
 * Posterium — Render Guard
 *
 * Applica automaticamente la regola di AGENTS.md:
 *   "Dopo ogni modifica ai parametri di resa visiva in QUALSIASI file della
 *    pipeline, esegui npx playwright test e2e/posterium-visual.spec.ts"
 *
 * Flusso (su agent_end, se l'agente ha toccato un file di rendering):
 *   1. rigenera src/lib/render-version.ts via `node scripts/write-render-version.mjs`;
 *   2. se l'hash RENDER_VERSION cambia (o è stato toccato un file UI come
 *      EditView.tsx), lancia IN BACKGROUND la suite di regressione visiva
 *      (mock server locale: nessuna API key, deterministica);
 *   3. l'esito viene scritto in .pi/state/visual-test-last.json e mostrato via
 *      notify — lo status-widget lo rilegge per la footer line.
 *
 * Per disattivare solo l'auto-run dei test: AUTO_RUN_VISUAL_TESTS = false
 * (l'hash viene comunque rigenerato e viene notificato il comando manuale).
 */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import { mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// File che determinano l'OUTPUT del poster (stesso elenco di
// scripts/write-render-version.mjs + route poster): una modifica qui cambia
// l'hash RENDER_VERSION e quindi deve rieseguire la suite visiva.
const HASH_FILES: readonly string[] = [
  "src/app/api/poster/[type]/[id]/route.ts",
  "src/lib/accent-color.ts",
  "src/lib/badge-priority.ts",
  "src/lib/badge-styles.ts",
  "src/lib/badge-svg-shared.ts",
  "src/lib/badges.ts",
  "src/lib/blur.ts",
  "src/lib/config-token.ts",
  "src/lib/logo-layout.ts",
  "src/lib/logo-selection.ts",
  "src/lib/luminance.ts",
  "src/lib/network-svgs.ts",
  "src/lib/poster-auto-fit.ts",
  "src/lib/poster-badge.ts",
  "src/lib/poster-config.ts",
  "src/lib/poster-fit-adjust.ts",
  "src/lib/poster-fit-score.ts",
  "src/lib/poster-render-helpers.ts",
  "src/lib/poster-rotation.ts",
  "src/lib/poster-service.ts",
  "src/lib/poster-url.ts",
  "src/lib/release-badge.ts",
  "src/lib/stremio-poster-params.ts",
  "src/lib/stremio-poster-url.ts",
  "src/lib/subgenres.ts",
  "src/lib/svg-badge.ts",
  "src/assets/fonts/Inter-Black.ttf",
  "src/assets/fonts/Inter-Bold.ttf",
  "src/assets/fonts/Inter-Regular.ttf",
  "src/assets/fonts/NotoSansSymbols2-Regular.ttf",
];

// File UI lato client: non cambiano l'hash del poster ma sono coperti dagli
// screenshot della home nella suite visiva → vanno comunque verificati.
const UI_FILES: readonly string[] = ["src/components/EditView.tsx"];

const AUTO_RUN_VISUAL_TESTS = true;

const STATE_DIR = join(process.cwd(), ".pi", "state");
const PID_FILE = join(STATE_DIR, "visual-test.pid");
const RESULT_FILE = join(STATE_DIR, "visual-test-last.json");

function norm(p: string): string {
  return p.replace(/\\/g, "/");
}

function isPosterium(): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { name?: string };
    return pkg.name === "posterium";
  } catch {
    return false;
  }
}

function readVersion(): string | null {
  try {
    const src = readFileSync(join(process.cwd(), "src", "lib", "render-version.ts"), "utf8");
    const m = src.match(/RENDER_VERSION\s*=\s*"([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function matchesAny(path: string, list: readonly string[]): boolean {
  return list.some((f) => path.includes(f));
}

export default function posteriumRenderGuard(pi: ExtensionAPI) {
  if (!isPosterium()) return;

  const touched = new Set<string>();

  pi.on("tool_call", (event) => {
    if (event.toolName !== "edit" && event.toolName !== "write") return;
    const path = norm(String((event.input as { path?: unknown }).path ?? ""));
    if (matchesAny(path, HASH_FILES) || matchesAny(path, UI_FILES)) {
      touched.add(path);
    }
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (touched.size === 0) return;
    const files = [...touched].sort();
    touched.clear();

    const hashChanged = await regenerateVersion(pi, ctx);
    const uiTouched = files.some((f) => matchesAny(f, UI_FILES));

    if (hashChanged || uiTouched) {
      if (AUTO_RUN_VISUAL_TESTS) {
        runVisualTests(ctx);
      } else {
        ctx.ui.notify?.(
          "File di rendering modificati — esegui: npx playwright test e2e/posterium-visual.spec.ts",
          "warning",
        );
      }
    } else {
      ctx.ui.notify?.("File di rendering toccati ma output invariato (hash RENDER_VERSION uguale)", "info");
    }
  });
}

async function regenerateVersion(pi: ExtensionAPI, ctx: ExtensionContext): Promise<boolean> {
  const before = readVersion();
  const res = await pi.exec("node", ["scripts/write-render-version.mjs"], { timeout: 30_000 });
  const after = readVersion();

  if (res.code !== 0 || !after) {
    ctx.ui.notify?.(`Rigenerazione RENDER_VERSION fallita (exit ${res.code}) — ${res.stderr.trim() || "errore sconosciuto"}`, "error");
    return false;
  }
  if (before !== after) {
    ctx.ui.notify?.(`RENDER_VERSION aggiornata: ${before ?? "?"} → ${after}`, "info");
    return true;
  }
  return false;
}

function readPid(): number | null {
  try {
    const raw = readFileSync(PID_FILE, "utf8").trim();
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runVisualTests(ctx: ExtensionContext): void {
  const runningPid = readPid();
  if (runningPid !== null && isAlive(runningPid)) {
    ctx.ui.notify?.("Test visivi già in esecuzione (salto avvio)", "info");
    return;
  }
  // pid file stantio (run precedente interrotto): puliscilo e riparti
  if (runningPid !== null) rmSync(PID_FILE, { force: true });

  mkdirSync(STATE_DIR, { recursive: true });
  const stamp = Date.now();
  const logFile = join(STATE_DIR, `visual-${stamp}.log`);
  const fd = openSync(logFile, "a");

  const rv = readVersion() ?? "?";

  const child = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", "e2e/posterium-visual.spec.ts", "--reporter=line"],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: ["ignore", fd, fd],
      windowsHide: true,
    },
  );
  writeFileSync(PID_FILE, String(child.pid));

  child.on("error", (err) => {
    rmSync(PID_FILE, { force: true });
    ctx.ui.notify?.(`Test visivi non avviati: ${err.message}`, "error");
  });

  child.on("exit", (code) => {
    rmSync(PID_FILE, { force: true });
    const ok = code === 0;
    const durationMs = Date.now() - stamp;
    writeFileSync(
      RESULT_FILE,
      JSON.stringify(
        { rv, ok, exitCode: code, durationMs, logFile, timestamp: new Date().toISOString() },
        null,
        2,
      ),
    );
    ctx.ui.notify?.(
      ok
        ? `✓ Test visivi passati (${Math.round(durationMs / 1000)}s, rv ${rv})`
        : `✗ Test visivi FALLITI (exit ${code}) — log: ${logFile}`,
      ok ? "info" : "error",
    );
  });

  if (typeof child.unref === "function") child.unref();
}
