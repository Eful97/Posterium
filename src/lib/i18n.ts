import en from "./translations/en.json"
import it from "./translations/it.json"
import fr from "./translations/fr.json"
import de from "./translations/de.json"
import es from "./translations/es.json"

export type Lang = keyof typeof dicts

const dicts: Record<string, Record<string, string>> = { en, it, fr, de, es }

let _currentLang: string = "it"

export const BADGE_KEY_PREFIX = "__"

export function isPrefixedKey(val: string): boolean {
  return val.startsWith(BADGE_KEY_PREFIX)
}

export function badgeKey(val: string): string {
  return isPrefixedKey(val) ? val.slice(BADGE_KEY_PREFIX.length) : val
}

export function resolveLabel(val: string): string {
  return isPrefixedKey(val) ? t(badgeKey(val)) : val
}

export function resolveLabelFor(val: string, lang: string): string {
  return isPrefixedKey(val) ? createT(lang)(badgeKey(val)) : val
}

export function isRankKey(val: string | null): string | null {
  if (!val) return null
  if (isPrefixedKey(val)) {
    const key = badgeKey(val)
    if (key === "badge.today" || key === "badge.anime") return key
    return null
  }
  if (val === "Oggi" || val === "Today" || val === "Aujourd'hui" || val === "Heute" || val === "Hoy") return "badge.today"
  if (val === "Anime") return "badge.anime"
  return null
}

export function setLang(lang: string) {
  _currentLang = lang
}

export function getLang(): string {
  return _currentLang
}

function lookup(lang: string, key: string): string | undefined {
  return dicts[lang]?.[key] ?? dicts["en"]?.[key]
}

export function t(key: string, params?: Record<string, string | number>): string {
  let val = lookup(_currentLang, key) ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(`{${k}}`, String(v))
    }
  }
  return val
}

export function createT(lang: string) {
  return (key: string, params?: Record<string, string | number>): string => {
    let val = lookup(lang, key) ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(`{${k}}`, String(v))
      }
    }
    return val
  }
}
