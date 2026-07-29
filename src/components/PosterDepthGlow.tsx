"use client"

import React from "react"

/* ── Edge highlight ─────────────────────────────────── */

export interface PosterDepthEdgeProps {
  /** Intensità del bordo superiore 0–100 (default 28) */
  edgeStrength?: number
  /** Quanto il bordo scende lungo la card 0–99 (default 0 = solo una linea sottile in cima) */
  edgeCoverage?: number
}

/**
 * Bordo superiore con gradiente verticale — effetto "edge" da NuvioDesktop.
 *
 * Da posizionare come primo figlio **all'interno** della card target,
 * sopra il background ma sotto il contenuto (usa z-index 0).
 *
 * @example
 * ```tsx
 * <button className="surface-card relative overflow-hidden rounded-xl">
 *   <PosterDepthEdge edgeStrength={28} />
 *   <img className="relative z-[1]" src={...} />
 * </button>
 * ```
 */
export function PosterDepthEdge({
  edgeStrength = 40,
  edgeCoverage = 10,
}: PosterDepthEdgeProps) {
  const edgeAlpha = edgeStrength / 100
  const safeCoverage = Math.min(edgeCoverage, 99)

  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-[inherit]"
      style={{
        zIndex: 0,
        background: `linear-gradient(to bottom,
          rgba(255,255,255,${edgeAlpha}) 0%,
          rgba(255,255,255,${edgeAlpha * 0.15}) ${safeCoverage}%,
          transparent calc(${safeCoverage}% + 0.1%))`,
      }}
      aria-hidden="true"
    />
  )
}

/* ── Sheen / gloss ──────────────────────────────────── */

export interface PosterDepthSheenProps {
  /** Intensità del riflesso glass 0–100 (default 10) */
  sheenStrength?: number
}

/**
 * Riflesso glass/gloss nel top 22% della card — effetto "sheen" da NuvioDesktop.
 *
 * Da posizionare come ultimo figlio **all'interno** della card target,
 * sopra tutto il contenuto (usa z-index 2).
 *
 * @example
 * ```tsx
 * <button className="surface-card relative overflow-hidden rounded-xl">
 *   <img className="relative z-[1]" src={...} />
 *   <PosterDepthSheen sheenStrength={10} />
 * </button>
 * ```
 */
export function PosterDepthSheen({
  sheenStrength = 10,
}: PosterDepthSheenProps) {
  const sheenAlpha = sheenStrength / 100

  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-[inherit]"
      style={{
        zIndex: 2,
        background: `linear-gradient(to bottom,
          rgba(255,255,255,${sheenAlpha * 0.6}) 0%,
          rgba(255,255,255,${sheenAlpha * 0.06}) 22%,
          transparent 22.1%)`,
      }}
      aria-hidden="true"
    />
  )
}
