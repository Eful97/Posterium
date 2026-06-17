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

const CACHE = new Map<string, { data: WikidataResult; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000
const CACHE_MAX = 500

export interface WikidataResult {
  awards: string[]
  nominations: string[]
  studios: string[]
  franchise: string | null
  basedOn: string | null
  director: string | null
}

async function sparqlQuery(query: string): Promise<any[]> {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { "User-Agent": "Posterium/1.0" }, signal: AbortSignal.timeout(30000) })
  if (!res.ok) return []
  const json = await res.json()
  return json?.results?.bindings || []
}

function matchRules(labels: string[]): string[] {
  const found = new Set<string>()
  for (const label of labels) {
    for (const rule of RULES) {
      if (rule.keywords.some((kw) => label.toLowerCase().includes(kw.toLowerCase()))) {
        found.add(rule.label)
      }
    }
  }
  return [...found]
}

const NETWORKS = [
  "Netflix", "Amazon Prime Video", "Apple TV+", "Disney+", "HBO", "Max",
  "Paramount+", "Crunchyroll",
  "Rai", "Mediaset", "Sky", "Cartoon Network", "Nickelodeon", "Adult Swim",
  "Universal Pictures", "Warner Bros.", "Paramount Pictures", "Columbia Pictures",
  "20th Century Studios", "Walt Disney Pictures", "Marvel Studios", "Pixar",
  "Studio Ghibli", "Sony Pictures",
]

export function matchTMDBStudios(names: string[]): string[] {
  const found = new Set<string>()
  for (const name of names) {
    const lower = name.toLowerCase().trim()
    for (const net of NETWORKS) {
      const nLower = net.toLowerCase()
      if (lower === nLower || lower.includes(nLower) || nLower.includes(lower)) {
        found.add(net)
        break
      }
    }
  }
  return [...found]
}

const FRANCHISES = [
  "MCU", "DC Extended Universe",
  "Star Wars", "Star Trek",
  "Harry Potter", "Wizarding World", "The Lord of the Rings", "Middle-earth",
  "James Bond", "Jurassic Park", "Jurassic World",
  "Fast & Furious", "Mission: Impossible", "John Wick",
  "The Hunger Games", "Twilight",
  "Pirates of the Caribbean", "Indiana Jones",
  "The Conjuring Universe",
  "Godzilla", "King Kong", "MonsterVerse",
  "Toy Story", "Shrek", "How to Train Your Dragon",
  "Despicable Me", "Minions", "Ice Age", "Madagascar",
  "The Matrix", "Terminator", "Die Hard", "Rocky", "Rambo",
  "Alien", "Predator",
  "X-Men", "The Avengers", "Spider-Man", "Batman", "Superman",
  "The Witcher", "Game of Thrones", "Breaking Bad", "The Walking Dead",
  "Scream", "Halloween", "Ghostbusters", "Back to the Future",
  "Jaws", "Mad Max", "Planet of the Apes",
]

function matchFranchise(labels: string[]): string | null {
  for (const fr of FRANCHISES) {
    const fLower = fr.toLowerCase()
    for (const label of labels) {
      const lower = label.toLowerCase().trim()
      if (lower === fLower || lower.includes(fLower) || fLower.includes(lower)) {
        return fr
      }
      if (fr === "MCU" && lower.includes("marvel cinematic")) return "MCU"
    }
  }
  return null
}

function matchStudios(labels: string[]): string[] {
  const unique = [...new Set(labels.map((l) => l.trim()))].filter(Boolean)
  const found = new Set<string>()
  for (const label of unique) {
    const lower = label.toLowerCase()
    for (const net of NETWORKS) {
      const nLower = net.toLowerCase()
      if (lower === nLower || lower.includes(nLower) || nLower.includes(lower)) {
        found.add(net)
        break
      }
    }
  }
  return [...found]
}

function categorizeBasedOn(label: string): string | null {
  const lower = label.toLowerCase()
  if (/novel|book|romanzo|novella/.test(lower)) return "Dal romanzo"
  if (/comic|graphic novel|manga|fumetto|graphic/.test(lower)) return "Dal fumetto"
  if (/video game|videogame|videogioco/.test(lower)) return "Dal videogioco"
  if (/true story|memoir|biography|autobiography|based on actual events|real life/.test(lower)) return "Tratto da una storia vera"
  if (/short story|tale|fairy tale|fiaba|folklore|legend|myth/.test(lower)) return "Da un racconto"
  if (/play|theatre|theater|musical|opera/.test(lower)) return "Dal teatro"
  if (/poem|poetry|poesia/.test(lower)) return "Dalla poesia"
  return "Tratto da"
}

export async function fetchAllWikidata(tmdbId: number, mediaType: "movie" | "tv"): Promise<WikidataResult> {
  const cacheKey = `${mediaType}:${tmdbId}`
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data

  const tmdbProp = mediaType === "movie" ? "P4947" : "P4983"
  const networkQuery = mediaType === "tv" ? `OPTIONAL { ?item wdt:P449 ?network . ?network rdfs:label ?networkLabel . FILTER(LANG(?networkLabel) = "en") }` : ""
  const query = `SELECT ?awardLabel ?nominationLabel ?networkLabel ?franchiseLabel ?basedOnLabel ?directorLabel WHERE {
    ?item wdt:${tmdbProp} "${tmdbId}" .
    OPTIONAL { ?item wdt:P166 ?award . ?award rdfs:label ?awardLabel . FILTER(LANG(?awardLabel) = "en") }
    OPTIONAL { ?item wdt:P1411 ?nomination . ?nomination rdfs:label ?nominationLabel . FILTER(LANG(?nominationLabel) = "en") }
    ${networkQuery}
    OPTIONAL { ?item wdt:P179 ?franchise . ?franchise rdfs:label ?franchiseLabel . FILTER(LANG(?franchiseLabel) = "en") }
    OPTIONAL { ?item wdt:P144 ?basedOn . ?basedOn rdfs:label ?basedOnLabel . FILTER(LANG(?basedOnLabel) = "en") }
    OPTIONAL { ?item wdt:P57 ?director . ?director rdfs:label ?directorLabel . FILTER(LANG(?directorLabel) = "en") }
  }`

  try {
    const bindings = await sparqlQuery(query)

    const awardLabels = new Set<string>()
    const nominationLabels = new Set<string>()
    const networkLabels = new Set<string>()
    const franchiseLabels = new Set<string>()
    const basedOnLabels = new Set<string>()
    const directorLabels = new Set<string>()

    for (const b of bindings) {
      if (b.awardLabel?.value) awardLabels.add(b.awardLabel.value)
      if (b.nominationLabel?.value) nominationLabels.add(b.nominationLabel.value)
      if (b.networkLabel?.value) networkLabels.add(b.networkLabel.value)
      if (b.franchiseLabel?.value) franchiseLabels.add(b.franchiseLabel.value)
      if (b.basedOnLabel?.value) basedOnLabels.add(b.basedOnLabel.value)
      if (b.directorLabel?.value) directorLabels.add(b.directorLabel.value)
    }

    const franchise = matchFranchise([...franchiseLabels])
    const rawBasedOn = [...basedOnLabels][0]
    const basedOn = rawBasedOn ? categorizeBasedOn(rawBasedOn) : null

    const director = [...directorLabels][0] || null
    const directorBadge = director ? `Di ${director}` : null

    const result: WikidataResult = {
      awards: matchRules([...awardLabels]),
      nominations: matchRules([...nominationLabels]),
      studios: matchStudios([...networkLabels]),
      franchise,
      basedOn,
      director: directorBadge,
    }

    if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value!)
    CACHE.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch {
    return { awards: [], nominations: [], studios: [], franchise: null, basedOn: null, director: null }
  }
}

export async function fetchAwards(tmdbId: number, mediaType: "movie" | "tv"): Promise<string[]> {
  const data = await fetchAllWikidata(tmdbId, mediaType)
  return data.awards
}

export function getAwardBadgeLabel(awards: string[]): string | null {
  const priority = ["Oscar", "Cannes", "Venezia", "BAFTA", "Golden Globe", "Emmy", "David"]
  for (const a of priority) {
    if (awards.includes(a)) return `Vincitore ${a}`
  }
  return null
}

export function getNominationBadgeLabel(nominations: string[]): string | null {
  const priority = ["Oscar", "Cannes", "Venezia", "BAFTA", "Golden Globe", "Emmy", "David"]
  for (const a of priority) {
    if (nominations.includes(a)) return `Candidato ${a}`
  }
  return null
}
