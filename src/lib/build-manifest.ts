import { NextRequest } from "next/server"
import { APP_VERSION } from "@/generated/app-version"
import { POSTERIUM_CATALOGS } from "@/lib/catalog-definitions"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { getFullProfileData } from "@/lib/profile-store"
import { decodeConfig } from "@/lib/config-token"

/**
 * Costruisce il manifest Stremio. `user`/`config` arrivano dal query string
 * (URL classico `manifest.json?u=...`) oppure dal path (`/u/<uuid>/manifest.json`)
 * per gli import AIOMetadata, che rifiutano/rompono le URL con query string.
 */
/**
 * Fix L13: i frammenti user/config entrano in addonId/name — prima stringhe
 * arbitrarie (caratteri non URL-safe, lunghezze enormi) finivano verbatim.
 * Solo [A-Za-z0-9_-] e lunghezza ≤ 64: qualunque altra cosa → nessun suffisso
 * (comportamento pulito invece di un id/name sporco).
 */
function safeSuffix(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.length > 64) return null
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  return value
}

export async function buildManifestResponse(req: NextRequest, user?: string | null, config?: string | null): Promise<Response> {
  const domain = getOriginFromRequest(req)

  const safeUser = safeSuffix(user)
  const safeConfig = safeSuffix(config)
  const suffix = safeUser ? `.${safeUser.slice(0, 8)}` : safeConfig ? `.${safeConfig.slice(0, 8)}` : ""
  const addonId = `org.posterium${suffix}`

  let userConfig = null
  if (user) {
    const profile = await getFullProfileData(user).catch(() => null)
    if (profile?.config) userConfig = profile.config
  }
  if (!userConfig && config) {
    userConfig = decodeConfig(config)
  }

  let catalogs: Array<{ id: string; name: string; type: "movie" | "series" }> = [...POSTERIUM_CATALOGS]
  if (userConfig?.disabledCatalogIds && userConfig.disabledCatalogIds.length > 0) {
    const disabledSet = new Set(userConfig.disabledCatalogIds)
    catalogs = catalogs.filter(c => !disabledSet.has(c.id))
  }
  if (userConfig?.customCatalogs && userConfig.customCatalogs.length > 0) {
    for (const cc of userConfig.customCatalogs) {
      if (cc.enabled !== false) {
        if (cc.type === "mixed") {
          catalogs.push({
            id: `posterium-custom-movie-${cc.id}`,
            name: `${cc.name} — Film`,
            type: "movie",
          })
          catalogs.push({
            id: `posterium-custom-series-${cc.id}`,
            name: `${cc.name} — Serie TV`,
            type: "series",
          })
        } else {
          catalogs.push({
            id: `posterium-custom-${cc.type}-${cc.id}`,
            name: cc.name,
            type: cc.type,
          })
        }
      }
    }
  }

  return Response.json({
    id: addonId,
    version: APP_VERSION,
    name: safeUser ? `Posterium (${safeUser.slice(0, 8)})` : "Posterium",
    description: "Custom poster manager for Stremio — loghi, badge trend, premi e rating",
    resources: ["catalog", "poster"],
    types: ["movie", "series"],
    logo: `${domain}/App.png`,
    addonCatalogs: [],
    manifestVersion: 1,
    behaviorHints: { adult: false },
    catalogs,
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
    },
  })
}
