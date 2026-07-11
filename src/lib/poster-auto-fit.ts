import sharp from "sharp"
import { rankPostersByFit } from "@/lib/poster-fit-score"

interface PosterCandidate {
  readonly file_path: string
  readonly iso_639_1: string | null
}

interface PosterBufferEntry {
  readonly posterPath: string
  readonly posterBuffer: Buffer
}

interface SelectBestLogoFitPosterInput {
  readonly posters: readonly PosterCandidate[]
  readonly logoPath: string
  readonly fetchImage: (path: string) => Promise<Buffer>
  readonly logoScale?: number | null
  readonly logoOffsetX?: number | null
  readonly logoOffsetY?: number | null
  readonly hasBadges: boolean
}

const MAX_AUTO_FIT_POSTERS = 20

function defaultLogoScale(logoBuffer: Buffer): Promise<number> {
  return sharp(logoBuffer).metadata().then((meta) => {
    const logoW = meta.width || 200
    const logoH = meta.height || 100
    return Math.min(Math.round(37.5 * logoW / logoH), 75)
  })
}

export async function selectBestLogoFitPosterPath(input: SelectBestLogoFitPosterInput): Promise<string | null> {
  const candidates = input.posters
    .filter((poster) => poster.iso_639_1 === null)
    .slice(0, MAX_AUTO_FIT_POSTERS)

  const firstCandidate = candidates[0]?.file_path ?? null
  if (candidates.length < 2) return firstCandidate

  let logoBuffer: Buffer
  try {
    logoBuffer = await input.fetchImage(input.logoPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[poster-fit] Logo fetch failed for auto fit: ${message}`)
    return firstCandidate
  }

  const posterBuffers = await Promise.all(
    candidates.map(async (poster): Promise<PosterBufferEntry | null> => {
      try {
        return {
          posterPath: poster.file_path,
          posterBuffer: await input.fetchImage(poster.file_path),
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[poster-fit] Poster fetch failed for auto fit ${poster.file_path}: ${message}`)
        return null
      }
    }),
  )

  const usablePosters = posterBuffers.filter((entry): entry is PosterBufferEntry => entry !== null)
  if (usablePosters.length === 0) return firstCandidate

  const logoScale = input.logoScale ?? await defaultLogoScale(logoBuffer)
  const ranked = await rankPostersByFit(
    usablePosters,
    logoBuffer,
    logoScale,
    input.logoOffsetX ?? 0,
    input.logoOffsetY ?? 0,
    input.hasBadges,
  )

  return ranked[0]?.posterPath ?? firstCandidate
}
