import { NextRequest } from "next/server"
import { APP_VERSION } from "@/generated/app-version"
import { POSTERIUM_CATALOGS } from "@/lib/catalog-definitions"
import { getOriginFromRequest } from "@/lib/poster-public-url"

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

export function buildManifestResponse(req: NextRequest, user?: string | null, config?: string | null): Response {
  const domain = getOriginFromRequest(req)

  const safeUser = safeSuffix(user)
  const safeConfig = safeSuffix(config)
  const suffix = safeUser ? `.${safeUser.slice(0, 8)}` : safeConfig ? `.${safeConfig.slice(0, 8)}` : ""
  const addonId = `org.posterium${suffix}`

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
    catalogs: POSTERIUM_CATALOGS,
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
    },
  })
}
