import { lookup } from "node:dns"
import { BlockList, isIP } from "node:net"
import { Agent, request } from "undici"
import { combineAbortSignals } from "../abort-signal"
import type { CustomRatingConfig, RatingItem } from "./types"

const blocked = new BlockList()
for (const [address, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16], ["192.0.0.0", 24], ["198.18.0.0", 15], ["224.0.0.0", 3]] as const) blocked.addSubnet(address, prefix, "ipv4")
blocked.addSubnet("::", 96, "ipv6")
blocked.addSubnet("::ffff:0:0", 96, "ipv6")
blocked.addSubnet("fc00::", 7, "ipv6")
blocked.addSubnet("fe80::", 10, "ipv6")
blocked.addSubnet("ff00::", 8, "ipv6")
blocked.addSubnet("2001::", 32, "ipv6")
blocked.addSubnet("2002::", 16, "ipv6")
blocked.addSubnet("64:ff9b::", 96, "ipv6")

function publicAddress(address: string): boolean {
  const family = isIP(address)
  return !!family && !blocked.check(address, family === 4 ? "ipv4" : "ipv6")
}

// Validate the address used by the socket itself, preventing DNS rebinding.
const dispatcher = new Agent({ connect: { lookup(hostname, options, callback) {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, [])
    if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) {
      return callback(new Error("Custom rating destination is not public"), [])
    }
    if (options.all) callback(null, addresses)
    else callback(null, addresses[0].address, addresses[0].family)
  })
} } })

export type CustomRatingDiagnosisError =
  | "disabled"
  | "no-endpoint"
  | "unsafe-endpoint"
  | "unreachable"
  | "http-error"
  | "oversized"
  | "invalid-response"

export interface CustomRatingDiagnosis {
  status: number | null
  ms: number
  ratings: RatingItem[]
  error: CustomRatingDiagnosisError | null
}

/** Condivide la validazione item con fetchCustomRatings (stesso contratto). */
export function parseRatingItems(data: unknown): RatingItem[] | null {
  if (!data || typeof data !== "object" || !("ratings" in data) || !Array.isArray(data.ratings)) return null
  const ratings = new Map<string, RatingItem>()
  for (const item of data.ratings) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue
    const { id, name, value, format } = item
    if (typeof id !== "string" || !id.trim() || typeof name !== "string" || !name.trim()) continue
    if (typeof value !== "number" || !Number.isFinite(value)) continue
    if (format !== "decimal" && format !== "percent") continue
    // Last valid value wins; retain the first occurrence's position.
    ratings.set(id.trim(), { id: id.trim(), name: name.trim(), value, format })
  }
  return [...ratings.values()]
}

const RESPONSE_LIMIT = 16 * 1024

function resolveEndpointUrl(imdbId: string, config: CustomRatingConfig): URL | "unsafe" | null {
  if (!config.endpoint.includes("{imdbId}")) return null
  try {
    const url = new URL(config.endpoint.replaceAll("{imdbId}", imdbId))
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "unsafe"
    if (config.apiKey && url.protocol !== "https:") return "unsafe"
    const host = url.hostname.replace(/^\[|\]$/g, "")
    if (isIP(host) && !publicAddress(host)) return "unsafe"
    return url
  } catch {
    return "unsafe"
  }
}

function ratingHeaders(config: CustomRatingConfig): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" }
  if (config.apiKey) headers[config.apiKeyHeader || "X-API-Key"] = config.apiKey
  return headers
}

async function readBody(response: Awaited<ReturnType<typeof request>>): Promise<Buffer | null> {
  try {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > RESPONSE_LIMIT) return null
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } finally {
    response.body.destroy()
  }
}

export async function fetchCustomRatings(imdbId: string | null | undefined, config: CustomRatingConfig, signal?: AbortSignal): Promise<RatingItem[]> {
  if (!config.enabled || !imdbId || !/^tt\d+$/.test(imdbId) || signal?.aborted) return []
  try {
    const url = resolveEndpointUrl(imdbId, config)
    if (!url || url === "unsafe") return []
    const response = await request(url, {
      dispatcher, headers: ratingHeaders(config), signal: combineAbortSignals(signal, 1500),
      // undici.request does not follow redirects (no redirect interceptor).
      headersTimeout: 1500, bodyTimeout: 1500,
    })
    const body = await readBody(response)
    if (response.statusCode < 200 || response.statusCode >= 300) return []
    if (!body) return []
    return parseRatingItems(JSON.parse(body.toString("utf8"))) ?? []
  } catch {
    return []
  }
}

/**
 * Diagnostica per il bottone "Test provider" (sample fisso server-side):
 * stessi timeout/limiti/SSRF del fetch reale, ma con esito dettagliato.
 * Non restituisce mai la chiave API (resta solo negli header della request).
 */
export async function diagnoseCustomRatings(imdbId: string, config: CustomRatingConfig): Promise<CustomRatingDiagnosis> {
  const start = Date.now()
  const done = (partial: Omit<CustomRatingDiagnosis, "ms">): CustomRatingDiagnosis => ({ ...partial, ms: Date.now() - start })
  if (!config.enabled) return done({ status: null, ratings: [], error: "disabled" })
  if (!/^tt\d+$/.test(imdbId)) return done({ status: null, ratings: [], error: "invalid-response" })
  const url = resolveEndpointUrl(imdbId, config)
  if (url === null) return done({ status: null, ratings: [], error: "no-endpoint" })
  if (url === "unsafe") return done({ status: null, ratings: [], error: "unsafe-endpoint" })
  let response: Awaited<ReturnType<typeof request>>
  try {
    response = await request(url, {
      dispatcher, headers: ratingHeaders(config), signal: combineAbortSignals(undefined, 1500),
      headersTimeout: 1500, bodyTimeout: 1500,
    })
  } catch {
    return done({ status: null, ratings: [], error: "unreachable" })
  }
  if (response.statusCode < 200 || response.statusCode >= 300) {
    response.body.destroy()
    return done({ status: response.statusCode, ratings: [], error: "http-error" })
  }
  const body = await readBody(response)
  if (!body) return done({ status: response.statusCode, ratings: [], error: "oversized" })
  let data: unknown
  try {
    data = JSON.parse(body.toString("utf8"))
  } catch {
    return done({ status: response.statusCode, ratings: [], error: "invalid-response" })
  }
  const ratings = parseRatingItems(data)
  if (!ratings) return done({ status: response.statusCode, ratings: [], error: "invalid-response" })
  return done({ status: response.statusCode, ratings, error: null })
}
