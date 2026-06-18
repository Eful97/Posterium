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
  genreName: z.string().optional(),
  voteAverage: z.number().min(0).max(10).optional(),
  trendRank: z.number().int().positive().optional(),
  trendPeriod: z.string().optional(),
  tvType: z.string().optional(),
  tvStatus: z.string().optional(),
  accentColor: z.string().optional(),
  badgeExtra: z.string().optional(),
  badgeRank: z.number().int().positive().optional(),
  badgeLabel: z.string().optional(),
  releaseDate: z.string().optional(),
  firstAirDate: z.string().optional(),
  backdropPath: z.string().nullable().optional(),
  backdropScale: z.number().int().optional(),
  backdropOffsetX: z.number().int().optional(),
  backdropOffsetY: z.number().int().optional(),
})

export type MappingInput = z.infer<typeof mappingSchema>

export const mappingUpdateSchema = mappingSchema.partial().omit({ tmdbId: true, mediaType: true })

export type MappingUpdate = z.infer<typeof mappingUpdateSchema>
