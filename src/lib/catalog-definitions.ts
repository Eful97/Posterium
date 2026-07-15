export type PosteriumCatalogType = "movie" | "series"

export type PosteriumCatalogDefinition = {
  readonly id: string
  readonly name: string
  readonly type: PosteriumCatalogType
}

export const POSTERIUM_CATALOGS = [
  { id: "posterium-jw-movies", name: "Top 20 Italia — Film", type: "movie" },
  { id: "posterium-jw-series", name: "Top 20 Italia — Serie TV", type: "series" },
  { id: "posterium-netflix-movies", name: "Netflix — Film", type: "movie" },
  { id: "posterium-netflix-series", name: "Netflix — Serie TV", type: "series" },
  { id: "posterium-prime-movies", name: "Prime Video — Film", type: "movie" },
  { id: "posterium-prime-series", name: "Prime Video — Serie TV", type: "series" },
  { id: "posterium-disney-movies", name: "Disney+ — Film", type: "movie" },
  { id: "posterium-disney-series", name: "Disney+ — Serie TV", type: "series" },
  { id: "posterium-apple-movies", name: "Apple TV+ — Film", type: "movie" },
  { id: "posterium-apple-series", name: "Apple TV+ — Serie TV", type: "series" },
  { id: "posterium-hbo-movies", name: "HBO Max — Film", type: "movie" },
  { id: "posterium-hbo-series", name: "HBO Max — Serie TV", type: "series" },
  { id: "posterium-paramount-movies", name: "Paramount+ — Film", type: "movie" },
  { id: "posterium-paramount-series", name: "Paramount+ — Serie TV", type: "series" },
  { id: "posterium-anime", name: "Top 20 Anime", type: "series" },
] as const satisfies readonly PosteriumCatalogDefinition[]

export const WARMUP_CATALOG_IDS = [
  "posterium-jw-movies",
  "posterium-jw-series",
  "posterium-anime",
] as const

const WARMUP_CATALOG_ID_SET: ReadonlySet<string> = new Set(WARMUP_CATALOG_IDS)

export function getWarmupCatalogs(): readonly PosteriumCatalogDefinition[] {
  return POSTERIUM_CATALOGS.filter((catalog) => WARMUP_CATALOG_ID_SET.has(catalog.id))
}
