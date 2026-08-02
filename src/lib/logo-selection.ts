import type { TMDBImage } from "./types"

/**
 * Selects the best logo from a list based on language preference.
 *
 * Priority (descending):
 *   1. Preferred language (`lang`)
 *   2. Italian ("it")
 *   3. English ("en")
 *   4. Original language of the content (`origLang`)
 *   5. Any first available logo
 *
 * Returns `undefined` when `logos` is empty.
 */
export function selectBestLogo(
  logos: TMDBImage[],
  lang: string,
  origLang?: string | null,
): TMDBImage | undefined {
  if (logos.length === 0) return undefined
  const langLogo = logos.find((l) => l.iso_639_1 === lang)
  const itLogo = lang !== "it" ? logos.find((l) => l.iso_639_1 === "it") : undefined
  const enLogo = lang !== "en" ? logos.find((l) => l.iso_639_1 === "en") : undefined
  const origLogo =
    origLang && origLang !== lang ? logos.find((l) => l.iso_639_1 === origLang) : undefined
  return langLogo || itLogo || enLogo || origLogo || logos[0]
}

/**
 * Returns a string describing which fallback tier was used, for logging.
 * Returns null when the selected logo is an exact match for `lang`.
 */
export function logoBestLogoFallbackReason(
  selected: TMDBImage | undefined,
  lang: string,
  origLang?: string | null,
): "origLang" | "any" | "none" | null {
  if (!selected) return "none"
  if (selected.iso_639_1 === lang) return null
  if (origLang && selected.iso_639_1 === origLang) return "origLang"
  if (selected.iso_639_1 === "it" || selected.iso_639_1 === "en") return null
  return "any"
}
