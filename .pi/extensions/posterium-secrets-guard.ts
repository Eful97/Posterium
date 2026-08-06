/**
 * Posterium — Secrets Guard
 *
 * Protezione dei segreti del progetto (vibeguard è configurato solo per
 * opencode, non per pi):
 *
 *   1. BLOCCA read/write/edit su file ambiente (.env.local, .env, …);
 *   2. BLOCCA i comandi bash che li stampano a schermo (cat/type/head/tail su
 *      .env, printenv, env);
 *   3. REDIGE dai risultati dei tool (bash, read, grep, …) i valori sensibili:
 *      - i valori reali presenti in .env.local/.env (chiave=valore),
 *      - pattern noti: sk-…, ghp_…, AKIA…, xox…, Bearer …, chiavi api_key/
 *        token/secret/password, token lunghi ≥48 caratteri (allineato al
 *        vibeguard del progetto).
 *
 * Nota: l'estensione stessa legge .env.local per costruire la mappa di
 * redazione — è l'unica lettura ammessa e non viene esposta all'agente.
 */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PROTECTED_BASENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
]);

const SECRET_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]{10,}/gi,
  /\b[A-Za-z0-9_-]{48,}\b/g,
  /\b(api[_-]?key|secret|password)\s*[=:]\s*["']?[A-Za-z0-9._~+/=-]{8,}/gi,
  /\btoken\s*[=:]\s*["']?[A-Za-z0-9._~+/=-]{12,}/gi,
];

const FILE_DUMP_RE = /^(cat|type|more|less|head|tail)\s+[^\s|&;]*\.env(\.local|\.production|\.development|\.test)?(\s|$)/;
const PRINTENV_RE = /\bprintenv(\s|$)/;
const ENV_DUMP_RE = /(^|[;&|]\s*)env\s*$/;

function loadSecretValues(): string[] {
  const values: string[] = [];
  for (const file of [".env.local", ".env"]) {
    const p = join(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, "").trim();
      if (value.length >= 8) values.push(value);
    }
  }
  return values;
}

function redact(text: string, secretValues: string[]): string {
  let out = text;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  for (const value of secretValues) {
    if (value.length >= 8 && out.includes(value)) out = out.split(value).join("[REDACTED]");
  }
  return out;
}

export default function posteriumSecretsGuard(pi: ExtensionAPI) {
  const secretValues = loadSecretValues();

  // 1+2. Blocco di letture/scritture e comandi che espongono i file ambiente
  pi.on("tool_call", (event, ctx: ExtensionContext) => {
    if (event.toolName === "read" || event.toolName === "write" || event.toolName === "edit") {
      const path = String((event.input as { path?: unknown }).path ?? "").replace(/\\/g, "/");
      const base = path.split("/").pop() ?? "";
      if (PROTECTED_BASENAMES.has(base)) {
        ctx.ui.notify?.(`Bloccata ${event.toolName} su ${path} (protezione segreti)`, "warning");
        return { block: true, reason: `File protetto da posterium-secrets-guard: ${path}` };
      }
      return undefined;
    }

    if (event.toolName === "bash") {
      const cmd = String((event.input as { command?: unknown }).command ?? "");
      if (FILE_DUMP_RE.test(cmd) || PRINTENV_RE.test(cmd) || ENV_DUMP_RE.test(cmd)) {
        ctx.ui.notify?.("Bloccato comando che espone variabili d'ambiente", "warning");
        return { block: true, reason: "Comando bloccato da posterium-secrets-guard: espone segreti" };
      }
      return undefined;
    }
  });

  // 3. Redazione dei segreti in tutti i risultati dei tool
  pi.on("tool_result", (event) => {
    if (!event.content || event.content.length === 0) return undefined;

    let changed = false;
    const content = event.content.map((part) => {
      if (part.type === "text" && part.text) {
        const next = redact(part.text, secretValues);
        if (next !== part.text) {
          changed = true;
          return { ...part, text: next };
        }
      }
      return part;
    });

    return changed ? { content } : undefined;
  });
}
