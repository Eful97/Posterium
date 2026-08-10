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

/** Costruisce la poster URL riscritta, aggiungendo `&u=<uuid>` se c'è un profilo. */
function posterUrlFor(domain: string, mediaType: "movie" | "series", id: string, user?: string | null): string {
  const userSuffix = user ? `&u=${encodeURIComponent(user)}` : ""
  return `${domain}/api/poster/${mediaType}/${id}?rv=${RENDER_VERSION}${userSuffix}`
}

export function rewriteMetasPosters(metas: StremioItemMeta[], domain: string, user?: string | null): StremioItemMeta[] {
  return metas.map((item) => {
    if (!item || !item.id) return item
    const mediaType = (item.type === "series" || item.type === "tv" || item.type === "show") ? "series" : "movie"
    return {
      ...item,
      poster: posterUrlFor(domain, mediaType, item.id, user),
    }
  })
}

export function rewriteSingleMetaPoster(meta: StremioItemMeta, domain: string, user?: string | null): StremioItemMeta {
  if (!meta || !meta.id) return meta
  const mediaType = (meta.type === "series" || meta.type === "tv" || meta.type === "show") ? "series" : "movie"
  return {
    ...meta,
    poster: posterUrlFor(domain, mediaType, meta.id, user),
  }
}
