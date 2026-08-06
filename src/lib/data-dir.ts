import path from "node:path"
import { createLogger } from "@/lib/logger"

const log = createLogger("data-dir")

export const DATA_DIR = process.env.POSTERIUM_DATA_DIR || path.join(process.cwd(), "data")

// Su Vercel (serverless) il filesystem è read-only e non persistente: lo store
// file (mapping/profili) fallirebbe. KV è l'unica persistenza valida lì.
// Avvertiamo subito invece di fallire a runtime in modo poco chiaro.
if (process.env.VERCEL && !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)) {
  log.warn("⚠️  Vercel rilevato senza KV_REST_API_URL/KV_REST_API_TOKEN: i salvataggi (mapping/profili) NON persistono. Imposta lo store KV di Vercel/Upstash.")
}
