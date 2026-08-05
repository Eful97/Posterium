export const CLEAN_GRADIENT_HEIGHT = 30
export const NON_CLEAN_GRADIENT_HEIGHT = 10

export function defaultGradientHeightForPoster(poster: { iso_639_1?: string | null } | null | undefined): number {
  return poster?.iso_639_1 === null ? CLEAN_GRADIENT_HEIGHT : NON_CLEAN_GRADIENT_HEIGHT
}
