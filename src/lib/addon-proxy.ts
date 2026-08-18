import { RENDER_VERSION } from "./render-version"

export interface StremioItemMeta {
  id: string
  type: string
  name?: string
  poster?: string | null
  background?: string | null
  logo?: string | null
  description?: string
  releaseInfo?: string
  [key: string]: unknown
}

/**
 * Id utilizzabile dalla poster route per il rewrite. La route accetta solo
 * numeri TMDB o tt... (fix M7): gli id di terze parti tipo `tmdb:12345`,
 * `kitsu:…`, `anidb:…` producevano poster 400. Per il provider TMDB si
 * estrae la parte numerica; per provider sconosciuti ritorna null e il poster
 * NON viene riscritto (resta quello originale dell'addon, invece di un 400).
 */
export function rewritablePosterId(id: string): string | null {
  if (/^\d+$/.test(id) || /^tt\d+$/i.test(id)) return id
  const m = id.match(/^([a-z0-9-]+):(\d+)$/i)
  if (m && m[1].toLowerCase() === "tmdb") return m[2]
  return null
}

/** Costruisce la poster URL riscritta, aggiungendo `&u=<uuid>` se c'è un profilo. */
function posterUrlFor(domain: string, mediaType: "movie" | "series", id: string, user?: string | null): string {
  const userSuffix = user ? `&u=${encodeURIComponent(user)}` : ""
  return `${domain}/api/poster/${mediaType}/${id}?rv=${RENDER_VERSION}${userSuffix}`
}

export function rewriteMetasPosters(metas: StremioItemMeta[], domain: string, user?: string | null): StremioItemMeta[] {
  return metas.map((item) => {
    if (!item || !item.id) return item
    const posterId = rewritablePosterId(item.id)
    if (!posterId) return item // provider non risolvibile → poster originale
    const mediaType = (item.type === "series" || item.type === "tv" || item.type === "show") ? "series" : "movie"
    return {
      ...item,
      poster: posterUrlFor(domain, mediaType, posterId, user),
    }
  })
}

export function rewriteSingleMetaPoster(meta: StremioItemMeta, domain: string, user?: string | null): StremioItemMeta {
  if (!meta || !meta.id) return meta
  const posterId = rewritablePosterId(meta.id)
  if (!posterId) return meta
  const mediaType = (meta.type === "series" || meta.type === "tv" || meta.type === "show") ? "series" : "movie"
  return {
    ...meta,
    poster: posterUrlFor(domain, mediaType, posterId, user),
  }
}
