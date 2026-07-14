export function getUpcomingReleaseLabel(input: {
  mediaType: "movie" | "tv"
  releaseDate?: string | null
  firstAirDate?: string | null
  locale?: string
}): string | null {
  if (input.mediaType !== "movie") return null

  const date = parseTmdbDate(input.releaseDate)
  if (!date) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (date.getTime() <= today.getTime()) return null

  return `In uscita ${formatReleaseDate(date, input.locale ?? "it")}`
}

function parseTmdbDate(value?: string | null): Date | null {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatReleaseDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}
