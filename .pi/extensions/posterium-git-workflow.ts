/**
 * Posterium — Git Workflow
 *
 * 1. CHECKPOINT: a ogni turno dell'agente crea un git stash (git stash create)
 *    collegato all'entry della sessione; su /fork offre di ripristinare il
 *    codice a quel punto.
 * 2. VALIDAZIONE conventional commits: quando l'agente lancia `git commit`,
 *    avvisa (senza bloccare) se il messaggio non rispetta Conventional Commits
 *    (feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert).
 * 3. AUTO-COMMIT all'uscita (solo reason="quit"): se la working tree è sporca,
 *    committa tutto con un messaggio Conventional Commits derivato dall'ultimo
 *    messaggio dell'assistente.
 *
 * Interruttori: AUTO_COMMIT_ON_EXIT, CHECKPOINTS_PER_TURN, VALIDATE_COMMITS.
 */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const AUTO_COMMIT_ON_EXIT = true;
const CHECKPOINTS_PER_TURN = true;
const VALIDATE_COMMITS = true;

const CONVENTIONAL_RE = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9_-]+\))?!?: .+/;

function commitTypeFrom(text: string): string {
  const lower = text.toLowerCase();
  if (/fix|bug|corregg|ripar/.test(lower)) return "fix";
  if (/test|spec|coverage/.test(lower)) return "test";
  if (/doc|readme|comment/.test(lower)) return "docs";
  if (/refactor|rename|move|clean|restructure/.test(lower)) return "refactor";
  if (/perf|fast|veloc|optimiz/.test(lower)) return "perf";
  if (/ci|docker|deploy|build|workflow/.test(lower)) return "ci";
  if (/feat|add|new|nuov|aggiung|implement|support|feat\(/.test(lower)) return "feat";
  return "chore";
}

function buildCommitMessage(assistantText: string, userText: string): { subject: string; body: string } {
  const type = commitTypeFrom(assistantText + " " + userText);
  const firstLine = (assistantText.split("\n").find((l) => l.trim()) || "work in progress").trim();
  const subject = `${type}: ${firstLine.replace(/^#{1,6}\s*/, "").replace(/[.!?]+$/, "").slice(0, 72) || type}`;

  const bullets = userText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && l.length < 120 && !/^(?:fix|feat|chore|docs|test|refactor|perf|ci|style|build|revert)[(:]/.test(l))
    .slice(0, 5)
    .map((l) => `- ${l.replace(/^[-*•]\s*/, "")}`);

  const body = bullets.length > 0 ? `Rif: ${bullets.join("\n")}` : "";
  return { subject, body };
}

function lastAssistantText(ctx: ExtensionContext): string {
  const entries = ctx.sessionManager.getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "message" && entry.message.role === "assistant") {
      const content = entry.message.content;
      if (Array.isArray(content)) {
        return content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n");
      }
      return String(content ?? "");
    }
  }
  return "";
}

function lastUserText(ctx: ExtensionContext): string {
  const entries = ctx.sessionManager.getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "message" && entry.message.role === "user") {
      const content = entry.message.content;
      if (Array.isArray(content)) {
        return content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n");
      }
      return String(content ?? "");
    }
  }
  return "";
}

export default function posteriumGitWorkflow(pi: ExtensionAPI) {
  const checkpoints = new Map<string, string>();
  let currentEntryId: string | undefined;

  // 1. Checkpoint per turno
  pi.on("tool_result", (_event, ctx) => {
    const leaf = ctx.sessionManager.getLeafEntry();
    if (leaf) currentEntryId = leaf.id;
  });

  if (CHECKPOINTS_PER_TURN) {
    pi.on("turn_start", async () => {
      const { stdout } = await pi.exec("git", ["stash", "create"]);
      const ref = stdout.trim();
      if (ref && currentEntryId) checkpoints.set(currentEntryId, ref);
    });
  }

  pi.on("session_before_fork", async (event, ctx) => {
    const ref = checkpoints.get(event.entryId);
    if (!ref) return;
    if (!ctx.hasUI) return;
    const choice = await ctx.ui.select("Ripristinare il codice al punto del fork?", [
      "Sì, ripristina",
      "No, tieni il codice attuale",
    ]);
    if (choice?.startsWith("Sì")) {
      await pi.exec("git", ["stash", "apply", ref]);
      ctx.ui.notify?.("Codice ripristinato al checkpoint", "info");
    }
  });

  pi.on("agent_end", () => checkpoints.clear());

  // 2. Validazione conventional commits (non bloccante)
  if (VALIDATE_COMMITS) {
    pi.on("tool_call", (event, ctx) => {
      if (event.toolName !== "bash") return;
      const cmd = String((event.input as { command?: unknown }).command ?? "").trim();
      if (!/^git\s+commit\b/.test(cmd)) return;
      const m = cmd.match(/-m\s+["']([^"']+)["']/);
      if (m && !CONVENTIONAL_RE.test(m[1].trim())) {
        ctx.ui.notify?.(
          `Commit non conventional: "${m[1].trim().slice(0, 60)}" — usa es. "feat(editor): messaggio"`,
          "warning",
        );
      }
    });
  }

  // 3. Auto-commit all'uscita reale da pi (non su /new, /resume, /fork, /reload)
  if (AUTO_COMMIT_ON_EXIT) {
    pi.on("session_shutdown", async (event, ctx) => {
      if (event.reason !== "quit") return;

      const { stdout: status, code } = await pi.exec("git", ["status", "--porcelain"]);
      if (code !== 0 || status.trim().length === 0) return; // niente da committare

      const { subject, body } = buildCommitMessage(lastAssistantText(ctx), lastUserText(ctx));

      await pi.exec("git", ["add", "-A"]);
      const { code: commitCode } = await pi.exec("git", ["commit", "-m", subject, ...(body ? ["-m", body] : [])]);
      if (commitCode === 0 && ctx.hasUI) {
        ctx.ui.notify?.(`Auto-commit: ${subject}`, "info");
      }
    });
  }
}
