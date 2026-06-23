import { z } from "zod"

export const mappingSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  title: z.string().min(1),
  posterPath: z.string().min(1),
  logoPath: z.string().nullable().optional(),
  originalPosterPath: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  logoScale: z.number().int().min(10).max(200).optional(),
  logoOffsetX: z.number().int().optional(),
  logoOffsetY: z.number().int().optional(),
  showBadges: z.boolean().optional(),
  genreName: z.string().nullable().optional(),
  voteAverage: z.number().min(0).max(10).nullable().optional(),
  trendRank: z.number().int().positive().nullable().optional(),
  trendPeriod: z.string().nullable().optional(),
  tvType: z.string().nullable().optional(),
  tvStatus: z.string().nullable().optional(),
  accentColor: z.string().nullable().optional(),
  badgeExtra: z.string().nullable().optional(),
  badgeRank: z.number().int().positive().nullable().optional(),
  badgeLabel: z.string().nullable().optional(),
  customBadge: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  firstAirDate: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  backdropScale: z.number().int().optional(),
  backdropOffsetX: z.number().int().optional(),
  backdropOffsetY: z.number().int().optional(),
})

export type MappingInput = z.infer<typeof mappingSchema>

export const mappingUpdateSchema = mappingSchema.partial().omit({ tmdbId: true, mediaType: true })

export type MappingUpdate = z.infer<typeof mappingUpdateSchema>

// FlixPatrol catalog entry from scraper
export const flixpatrolEntrySchema = z.object({
  rank: z.number().int().positive(),
  title: z.string(),
  tmdb: z.object({
    id: z.number().int().positive(),
    media_type: z.string(),
    release_date: z.string().optional(),
  }).nullable(),
})

export type FlixPatrolEntry = z.infer<typeof flixpatrolEntrySchema>

// MDBList anime list item
export const mdblistAnimeSchema = z.object({
  tmdb: z.number().int().positive().nullable().optional(),
  id: z.number().int().positive().nullable().optional(),
  imdb: z.string().nullable().optional(),
  title: z.string().optional(),
})

export type MDBListAnimeItem = z.infer<typeof mdblistAnimeSchema>

// Enriched anime item returned by /api/mdblist/anime
export interface EnrichedAnimeItem {
  id: number
  title: string
  poster_path: string
  rank: number
  media_type: string
}

// TMDB search result (partial - what we use)
export const tmdbSearchResultSchema = z.object({
  id: z.number().int().positive(),
  media_type: z.enum(["movie", "tv"]),
  title: z.string().optional(),
  name: z.string().optional(),
  poster_path: z.string().nullable(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  imdb_id: z.string().nullable().optional(),
})

export type TMDBSearchResult = z.infer<typeof tmdbSearchResultSchema>

// TMDB details (partial)
export const tmdbDetailsSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
  vote_average: z.number(),
  type: z.string().optional(),
  status: z.string().optional(),
  release_date: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  networks: z.array(z.object({ id: z.number(), name: z.string(), logo_path: z.string().nullable(), origin_country: z.string() })).optional(),
  production_companies: z.array(z.object({ id: z.number(), name: z.string(), logo_path: z.string().nullable(), origin_country: z.string() })).optional(),
  original_language: z.string().optional(),
})
