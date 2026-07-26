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

export function rewriteMetasPosters(metas: StremioItemMeta[], domain: string, user?: string | null): StremioItemMeta[] {
  return metas.map((item) => {
    if (!item || !item.id) return item
    const mediaType = (item.type === "series" || item.type === "tv" || item.type === "show") ? "series" : "movie"
    const userParam = user ? `&u=${encodeURIComponent(user)}` : ""
    const posterUrl = `${domain}/api/poster/${mediaType}/${item.id}?rv=${RENDER_VERSION}${userParam}`
    return {
      ...item,
      poster: posterUrl,
    }
  })
}

export function rewriteSingleMetaPoster(meta: StremioItemMeta, domain: string, user?: string | null): StremioItemMeta {
  if (!meta || !meta.id) return meta
  const mediaType = (meta.type === "series" || meta.type === "tv" || meta.type === "show") ? "series" : "movie"
  const userParam = user ? `&u=${encodeURIComponent(user)}` : ""
  const posterUrl = `${domain}/api/poster/${mediaType}/${meta.id}?rv=${RENDER_VERSION}${userParam}`
  return {
    ...meta,
    poster: posterUrl,
  }
}
