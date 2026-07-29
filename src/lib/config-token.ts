/**
 * Stateless URL Config Token (stile AIOMetadata / RPDB)
 *
 * Codifica le preferenze utente in un token URL-safe compatto.
 * Firmato con HMAC-SHA256 per prevenire manomissioni.
 */

import crypto from "node:crypto"

export interface PosteriumUserConfig {
  globalBadges: boolean
  rankingBadges: boolean
  badgeStyle: "shadow" | "pill" | "bar" | "colored" | "bordo" | "vetro"
  rankingBadgeStyle: "default" | "bar" | "colored" | "pill" | "netflix"
  blurEnabled: boolean
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  gradientHeight: number
  networkLogo: boolean
  autoRotateClean: boolean
  logoFitEnabled: boolean
  customBadge?: string
}

const HMAC_SECRET = process.env.ENCRYPTION_KEY_SECRET || process.env.CONFIG_HMAC_SECRET || ""

/**
 * Encode a PosteriumUserConfig into a compact signed URL-safe token.
 * Formato: `base64url-json.hmac-base64url`
 * Se HMAC_SECRET non è configurato, genera un token senza firma (dev/test).
 */
export function encodeConfig(config: PosteriumUserConfig): string {
  const json = JSON.stringify(config)
  const b64 = Buffer.from(json, "utf-8").toString("base64url")
  if (!HMAC_SECRET) return b64
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(json).digest("base64url")
  return `${b64}.${sig}`
}

/**
 * Decode a config token back to a PosteriumUserConfig.
 * Verifica la firma HMAC se presente e se HMAC_SECRET è configurato.
 * Accetta token legacy (senza firma) solo in assenza di HMAC_SECRET.
 * Restituisce null in caso di token malformato o firma non valida (fail-safe).
 */
export function decodeConfig(token: string): PosteriumUserConfig | null {
  try {
    let json: string
    const dotIdx = token.lastIndexOf(".")

    if (dotIdx > 0) {
      // Formato firmato: base64url.hmacsig
      const b64 = token.slice(0, dotIdx)
      const sig = token.slice(dotIdx + 1)
      json = Buffer.from(b64, "base64url").toString("utf-8")
      if (HMAC_SECRET) {
        const expected = crypto.createHmac("sha256", HMAC_SECRET).update(json).digest("base64url")
        if (expected.length !== sig.length) return null
        if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
      }
    } else {
      // Token legacy (senza firma) — accettato solo in dev/test
      if (HMAC_SECRET) return null
      const normalized = token.replace(/-/g, "+").replace(/_/g, "/")
      const remainder = normalized.length % 4
      const padded = remainder !== 0
        ? normalized + "=".repeat(4 - remainder)
        : normalized
      json = Buffer.from(padded, "base64").toString("utf-8")
    }

    const parsed = JSON.parse(json) as Record<string, unknown>

    // Validazione strict dei campi richiesti
    const REQUIRED_BOOLS: (keyof PosteriumUserConfig)[] = [
      "globalBadges", "rankingBadges", "blurEnabled",
      "networkLogo", "autoRotateClean", "logoFitEnabled",
    ]
    for (const key of REQUIRED_BOOLS) {
      if (typeof parsed[key] !== "boolean") return null
    }

    const REQUIRED_STRINGS: (keyof PosteriumUserConfig)[] = [
      "badgeStyle", "rankingBadgeStyle",
    ]
    for (const key of REQUIRED_STRINGS) {
      if (typeof parsed[key] !== "string") return null
    }

    const REQUIRED_NUMS: (keyof PosteriumUserConfig)[] = [
      "blurIntensity", "blurFade", "blurDarkness", "gradientHeight",
    ]
    for (const key of REQUIRED_NUMS) {
      if (typeof parsed[key] !== "number" || !Number.isFinite(parsed[key])) return null
    }

    if (parsed.customBadge !== undefined && typeof parsed.customBadge !== "string") return null

    return {
      ...parsed as unknown as PosteriumUserConfig,
      blurIntensity: Math.round(parsed.blurIntensity as number),
      blurFade: Math.round(parsed.blurFade as number),
      blurDarkness: Math.round(parsed.blurDarkness as number),
      gradientHeight: Math.round(parsed.gradientHeight as number),
    }
  } catch {
    return null
  }
}
