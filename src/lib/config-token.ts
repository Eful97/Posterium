/**
 * Stateless URL Config Token (stile AIOMetadata / RPDB)
 *
 * Codifica le preferenze utente in un token URL-safe compatto.
 * Il server lo decodifica al volo, senza bisogno di database o login.
 */

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

/**
 * Encode a PosteriumUserConfig into a compact URL-safe Base64 token.
 * Non contiene padding `=`, e i caratteri `+` / `/` sono sostituiti
 * con `-` / `_` per sicurezza negli URL.
 */
export function encodeConfig(config: PosteriumUserConfig): string {
  const json = JSON.stringify(config)
  const base64 = Buffer.from(json, "utf-8").toString("base64")
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Decode a config token back to a PosteriumUserConfig.
 * Accetta sia il formato URL-safe (con - _) che il base64 tradizionale.
 * Restituisce null in caso di token malformato o dati non validi (fail-safe).
 */
export function decodeConfig(token: string): PosteriumUserConfig | null {
  try {
    // Normalizza: ripristina + / dal formato URL-safe
    const normalized = token.replace(/-/g, "+").replace(/_/g, "/")
    // Ripristina il padding
    const remainder = normalized.length % 4
    const padded = remainder !== 0
      ? normalized + "=".repeat(4 - remainder)
      : normalized
    const json = Buffer.from(padded, "base64").toString("utf-8")
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
      // Arrotonda i numeri per evitare drift floating-point
      blurIntensity: Math.round(parsed.blurIntensity as number),
      blurFade: Math.round(parsed.blurFade as number),
      blurDarkness: Math.round(parsed.blurDarkness as number),
      gradientHeight: Math.round(parsed.gradientHeight as number),
    }
  } catch {
    return null
  }
}
