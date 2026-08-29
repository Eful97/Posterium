import type { TMDBPerson } from "@/lib/tmdb"

export const PERSON_SEARCH_THRESHOLDS = {
  MAX_PERSON_CANDIDATES: 5,
  MIN_QUALITY_WORK_VOTES: 4000,
  MIN_RECOGNIZED_WORK_VOTES: 100,
  MIN_POPULARITY_WITH_QUALITY_WORK: 1.5,
  MIN_POPULARITY_PRIMARY_NAME: 2.5,
} as const

const SUFFIX_PATTERN = /^(jr|sr|ii|iii|iv|v)$/i
const INVALID_NAME_PATTERN = /[:()[\]?!$#@&]|\b\d+\b/

export function isPersonQuery(query: string): boolean {
  if (!query || typeof query !== "string") return false
  return !INVALID_NAME_PATTERN.test(query)
}

export function normalizeNameForMatching(name: string): string {
  if (!name) return ""
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function isPersonMatch(
  queryNorm: string,
  personNorm: string,
  popularity: number,
  highestVote: number,
): boolean {
  if (!queryNorm || !personNorm) return false
  const queryWords = queryNorm.split(" ").filter(Boolean)
  const personWords = personNorm.split(" ").filter(Boolean)
  const hasHighQualityWork = highestVote >= PERSON_SEARCH_THRESHOLDS.MIN_QUALITY_WORK_VOTES

  const isExactMatch = queryNorm === personNorm
  const isMiddleNameMatch =
    personWords.length === 3 &&
    queryWords.length === 2 &&
    queryWords[0] === personWords[0] &&
    queryWords[1] === personWords[2] &&
    personWords[1].length === 1
  const isSuffixMatch =
    personWords.length >= 3 &&
    queryWords.length === personWords.length - 1 &&
    SUFFIX_PATTERN.test(personWords[personWords.length - 1]!) &&
    queryWords.every((word, idx) => word === personWords[idx])
  const isSingleWordMatch =
    queryWords.length === 1 &&
    personWords.length === 1 &&
    queryWords[0] === personWords[0] &&
    hasHighQualityWork &&
    popularity >= PERSON_SEARCH_THRESHOLDS.MIN_POPULARITY_WITH_QUALITY_WORK

  return isExactMatch || isMiddleNameMatch || isSuffixMatch || isSingleWordMatch
}

export function pickTopPerson(candidates: TMDBPerson[], query: string): TMDBPerson | null {
  if (!candidates || candidates.length === 0) return null
  const queryNorm = normalizeNameForMatching(query)
  if (!queryNorm) return null

  const sorted = [...candidates]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, PERSON_SEARCH_THRESHOLDS.MAX_PERSON_CANDIDATES)

  for (const candidate of sorted) {
    const popularity = candidate.popularity || 0
    const knownFor = candidate.known_for || []
    const highestVote = Math.max(0, ...knownFor.map((w) => w.vote_count || 0))
    const personNorm = normalizeNameForMatching(candidate.name)
    if (!personNorm) continue

    // AIOMetadata performTmdbPeopleSearch: skip only if BOTH low popularity and no recognized work
    if (popularity < PERSON_SEARCH_THRESHOLDS.MIN_POPULARITY_WITH_QUALITY_WORK && highestVote < PERSON_SEARCH_THRESHOLDS.MIN_RECOGNIZED_WORK_VOTES) continue
    // performTmdbSearch additionally requires profile_path; for people catalog we keep it permissive
    // (mock has profile_path, real TMDB usually does)

    if (!isPersonMatch(queryNorm, personNorm, popularity, highestVote)) continue

    const hasHighQualityWork = highestVote >= PERSON_SEARCH_THRESHOLDS.MIN_QUALITY_WORK_VOTES
    const passesQualityCheck = hasHighQualityWork && popularity >= PERSON_SEARCH_THRESHOLDS.MIN_POPULARITY_WITH_QUALITY_WORK
    const passesPopularityCheck = popularity >= PERSON_SEARCH_THRESHOLDS.MIN_POPULARITY_PRIMARY_NAME
    if (!passesQualityCheck && !passesPopularityCheck) continue

    return candidate
  }
  return null
}
