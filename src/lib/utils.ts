import type { TMDBImage, SearchResult } from "./types"

export const IMG_BASE = "https://image.tmdb.org/t/p"

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ")
}

export const LANG_FLAGS: Record<string, string> = {
  it: "🇮🇹", en: "🇬🇧", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸", pt: "🇵🇹",
  ja: "🇯🇵", ko: "🇰🇷", zh: "🇨🇳", ru: "🇷🇺", ar: "🇸🇦", nl: "🇳🇱",
  pl: "🇵🇱", sv: "🇸🇪", tr: "🇹🇷", hi: "🇮🇳",
}

export const LANG_NAMES: Record<string, string> = {
  en: "English", it: "Italiano", fr: "Français", de: "Deutsch",
  es: "Español", pt: "Português", ja: "日本語", ko: "한국어",
  zh: "中文", ru: "Русский", ar: "العربية", nl: "Nederlands",
  pl: "Polski", sv: "Svenska", tr: "Türkçe", hi: "हिन्दी",
  xx: "Senza lingua",
}

export function getDomain() {
  if (typeof window === "undefined") return ""
  return `${window.location.protocol}//${window.location.host}`
}

export function posterUrl(path: string, size = "w342") {
  if (path.startsWith("http")) return path
  return `${IMG_BASE}/${size}${path}`
}

export function titleOf(r: SearchResult) {
  return r.title || r.name || "Unknown"
}

export function yearOf(r: SearchResult) {
  const d = r.release_date || r.first_air_date
  return d ? d.slice(0, 4) : ""
}

export async function api(path: string, opts?: RequestInit, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(path, opts)
    if (res.ok) return res.json()
    if (res.status === 429 && attempt < retries) {
      const retryAfter = Number(res.headers.get("Retry-After") || 1) * 1000
      await new Promise((r) => setTimeout(r, retryAfter))
      continue
    }
    throw new Error(`API error: ${res.status}`)
  }
}

export function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = fn(item)
    ;(acc[key] = acc[key] || []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function limitBest(imgs: TMDBImage[], max = 15): TMDBImage[] {
  return [...imgs].sort((a, b) => b.vote_average - a.vote_average).slice(0, max)
}

export const STREAMING_PLATFORMS = [
  { slug: "netflix", name: "Netflix", icon: "" },
  { slug: "amazon-prime", name: "Prime Video", icon: "" },
  { slug: "disney", name: "Disney+", icon: "" },
  { slug: "apple-tv", name: "Apple TV+", icon: "" },
  { slug: "hbo-max", name: "HBO Max", icon: "" },
  { slug: "paramount-plus", name: "Paramount+", icon: "" },
] as const

export const PICKER_LANGS = [
  { code: "it", name: "Italiano" },
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
  { code: "nl", name: "Nederlands" },
] as const
