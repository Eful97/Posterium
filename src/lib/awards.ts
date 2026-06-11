interface AwardRule {
  keywords: string[]
  label: string
}

const RULES: AwardRule[] = [
  { keywords: ["Oscar", "Academy Award", "Premio Oscar"], label: "Oscar" },
  { keywords: ["BAFTA", "British Academy"], label: "BAFTA" },
  { keywords: ["Golden Globe"], label: "Golden Globe" },
  { keywords: ["Primetime Emmy", "Emmy Award", "Premio Emmy"], label: "Emmy" },
  { keywords: ["David di Donatello"], label: "David" },
  { keywords: ["Venice", "Golden Lion", "Leone d'Oro", "Mostra", "Venezia"], label: "Venezia" },
  { keywords: ["Cannes", "Palme d'Or", "Palma d'Oro", "Festival di Cannes"], label: "Cannes" },
]

const CACHE = new Map<string, { awards: string[]; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000

async function sparqlQuery(query: string): Promise<any[]> {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { "User-Agent": "Posterium/1.0" }, signal: AbortSignal.timeout(10000) })
  if (!res.ok) return []
  const json = await res.json()
  return json?.results?.bindings || []
}

export async function fetchAwards(tmdbId: number, mediaType: "movie" | "tv"): Promise<string[]> {
  const cacheKey = `${mediaType}:${tmdbId}`
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.awards

  const tmdbProp = mediaType === "movie" ? "P4947" : "P4983"
  const query = `SELECT ?awardLabel WHERE {
    ?item wdt:${tmdbProp} "${tmdbId}" .
    ?item wdt:P166 ?award .
    ?award rdfs:label ?awardLabel .
    FILTER(LANG(?awardLabel) = "en")
  }`

  try {
    const bindings = await sparqlQuery(query)
    const awardLabels = [...new Set(bindings.map((b: any) => b.awardLabel?.value || "").filter(Boolean))]
    const found = new Set<string>()

    for (const label of awardLabels) {
      for (const rule of RULES) {
        if (rule.keywords.some((kw) => label.toLowerCase().includes(kw.toLowerCase()))) {
          found.add(rule.label)
        }
      }
    }

    const awards = [...found]
    CACHE.set(cacheKey, { awards, timestamp: Date.now() })
    return awards
  } catch {
    return []
  }
}

export function getAwardBadgeLabel(awards: string[]): string | null {
  const priority = ["Oscar", "Cannes", "Venezia", "BAFTA", "Golden Globe", "Emmy", "David"]
  for (const a of priority) {
    if (awards.includes(a)) return `Vincitore ${a}`
  }
  return null
}
