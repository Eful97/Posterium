/**
 * Posterium — Status Widget
 *
 * Footer line persistente (setStatus) con lo stato del progetto:
 *   posterium v0.15.2 · rv 296c4f6e9e · ⚡ main (3) · ✓ visual 42s
 *
 * - rv: RENDER_VERSION corrente (src/lib/render-version.ts);
 * - branch + count working-tree modificati (git);
 * - esito dell'ultimo run della suite visiva (letto da
 *   .pi/state/visual-test-last.json, scritto da posterium-render-guard);
 * - notify quando RENDER_VERSION cambia tra un turno e l'altro.
 */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STATE_DIR = join(process.cwd(), ".pi", "state");
const RESULT_FILE = join(STATE_DIR, "visual-test-last.json");

interface VisualResult {
  rv?: string;
  ok?: boolean;
  exitCode?: number;
  durationMs?: number;
  timestamp?: string;
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

function readAppVersion(): string | null {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function readVisualResult(): VisualResult | null {
  try {
    if (!existsSync(RESULT_FILE)) return null;
    return JSON.parse(readFileSync(RESULT_FILE, "utf8")) as VisualResult;
  } catch {
    return null;
  }
}

function fmtDuration(ms: number | undefined): string {
  if (ms === undefined) return "";
  return `${Math.round(ms / 1000)}s`;
}

export default function posteriumStatusWidget(pi: ExtensionAPI) {
  if (!isPosterium()) return;

  let lastRv: string | null = null;

  async function refresh(ctx: ExtensionContext): Promise<void> {
    const rv = readVersion();

    let branch = "";
    let dirty = 0;
    try {
      const b = await pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
      if (b.code === 0) branch = b.stdout.trim();
      const s = await pi.exec("git", ["status", "--porcelain"]);
      if (s.code === 0) dirty = s.stdout.split("\n").filter((l) => l.trim()).length;
    } catch {
      /* non-git o errore: footer minimo */
    }

    const visual = readVisualResult();
    const visualText = visual
      ? visual.ok
        ? `✓ visual ${fmtDuration(visual.durationMs)}`
        : `✗ visual FAIL (exit ${visual.exitCode})`
      : "";

    const app = readAppVersion();
    ctx.ui.setStatus?.(
      "posterium",
      [
        `posterium ${app ?? ""}`,
        `rv ${rv ?? "?"}`,
        branch ? `${branch}${dirty > 0 ? ` (${dirty})` : ""}` : "",
        visualText,
      ]
        .filter(Boolean)
        .join(" · "),
    );

    if (rv && lastRv && rv !== lastRv) {
      ctx.ui.notify?.(`RENDER_VERSION cambiata: ${lastRv} → ${rv}`, "info");
    }
    lastRv = rv;
  }

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify?.("Estensioni Posterium attive: render-guard · poster-probe · secrets-guard · git-workflow · status", "info");
    await refresh(ctx);
  });

  pi.on("turn_end", async (_event, ctx) => {
    await refresh(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    await refresh(ctx);
  });
}
