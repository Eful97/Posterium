import type { Mapping } from "@/lib/types"

export interface EffectiveRotationState {
  readonly availablePosters: readonly string[]
  readonly isRotating: boolean
}

export function getEffectiveRotationState(mapping: Mapping | null): EffectiveRotationState {
  if (!mapping?.autoRotateClean || !mapping.cleanPosters || mapping.cleanPosters.length < 2) {
    return { availablePosters: [], isRotating: false }
  }

  const excludedSet = new Set(mapping.excludedPosters || [])
  const availablePosters = mapping.cleanPosters.filter((path) => !excludedSet.has(path))
  return {
    availablePosters,
    isRotating: availablePosters.length >= 2,
  }
}
