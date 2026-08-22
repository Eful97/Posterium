import { NextRequest } from "next/server"
import { APP_VERSION } from "@/generated/app-version"
import { POSTERIUM_CATALOGS } from "@/lib/catalog-definitions"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { decodeConfig, type PosteriumUserConfig } from "@/lib/config-token"
import { getServerDefaults } from "@/lib/server-defaults"

function safeSuffix(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.length > 64) return null
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  return value
}

export async function buildManifestResponse(req: NextRequest, user?: string | null, config?: string | null): Promise<Response> {
  const domain = getOriginFromRequest(req)

  let userConfig: Partial<PosteriumUserConfig> | null = null
  if (config) {
    userConfig = decodeConfig(config)
  }
  if (!userConfig) {
    const serverDefaults = getServerDefaults()
    userConfig = {
      disabledCatalogIds: serverDefaults.disabledCatalogIds,
      homeDisabledCatalogIds: serverDefaults.homeDisabledCatalogIds,
      customCatalogs: serverDefaults.customCatalogs,
      catalogRenames: serverDefaults.catalogRenames,
      catalogOrder: serverDefaults.catalogOrder,
    }
  }

  let catalogs: Array<{ id: string; name: string; type: "movie" | "series"; customBaseId?: string }> = [...POSTERIUM_CATALOGS]
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
            customBaseId: cc.id,
          })
          catalogs.push({
            id: `posterium-custom-series-${cc.id}`,
            name: `${cc.name} — Serie TV`,
            type: "series",
            customBaseId: cc.id,
          })
        } else {
          catalogs.push({
            id: `posterium-custom-${cc.type}-${cc.id}`,
            name: cc.name,
            type: cc.type,
            customBaseId: cc.id,
          })
        }
      }
    }
  }

  // Applica rinomine personalizzate dei cataloghi
  if (userConfig?.catalogRenames && Object.keys(userConfig.catalogRenames).length > 0) {
    catalogs = catalogs.map((cat) => {
      const customName = userConfig?.catalogRenames?.[cat.id]
      if (customName && customName.trim()) {
        return { ...cat, name: customName.trim() }
      }
      return cat
    })
  }

  // Applica ordinamento / priorità personalizzata
  if (userConfig?.catalogOrder && userConfig.catalogOrder.length > 0) {
    const orderMap = new Map<string, number>()
    userConfig.catalogOrder.forEach((id: string, idx: number) => orderMap.set(id, idx))
    catalogs.sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999
      return orderA - orderB
    })
  }

  const rawMode = req.nextUrl.searchParams.get("mode")
  const hubMode: "all" | "catalogs" | "search" = (rawMode === "search" || rawMode === "catalogs" || rawMode === "all")
    ? rawMode
    : (userConfig?.hubMode || "all")

  const safeConfig = safeSuffix(config)
  const suffix = safeConfig ? `.${safeConfig.slice(0, 8)}` : ""
  const modeSuffix = hubMode === "all" ? "" : `.${hubMode}`
  const addonId = `org.posterium${suffix}${modeSuffix}`

  const homeDisabledSet = new Set(userConfig?.homeDisabledCatalogIds || [])

  const contentCatalogs = catalogs.map((c) => {
    const isHomeHidden = homeDisabledSet.has(c.id) || (c.customBaseId ? homeDisabledSet.has(c.customBaseId) : false)
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      extra: isHomeHidden
        ? [{ name: "genre", isRequired: true, options: ["Tutti"] }, { name: "skip", isRequired: false }]
        : [{ name: "skip", isRequired: false }],
    }
  })

  const searchCatalogs = [
    {
      id: "posterium-search-movies",
      name: "🔍 Posterium — Cerca Film",
      type: "movie" as const,
      extra: [{ name: "search", isRequired: true }, { name: "skip", isRequired: false }],
    },
    {
      id: "posterium-search-series",
      name: "🔍 Posterium — Cerca Serie TV",
      type: "series" as const,
      extra: [{ name: "search", isRequired: true }, { name: "skip", isRequired: false }],
    },
  ]

  let manifestCatalogs: typeof contentCatalogs = []
  if (hubMode === "search") {
    manifestCatalogs = searchCatalogs
  } else if (hubMode === "catalogs") {
    manifestCatalogs = contentCatalogs
  } else {
    manifestCatalogs = [...contentCatalogs, ...searchCatalogs]
  }

  const ID_PREFIXES = [
    "tmdb:",
    "tt",
    "tvdb:",
    "mal:",
    "tvmaze:",
    "kitsu:",
    "anidb:",
    "anilist:",
    "tvdbc:",
    "upnext_",
    "unwatched_",
    "mdblist_upnext_",
    "pmdb_resume_",
    "simkl_upnext_",
  ]

  const TYPES = ["movie", "series", "anime.movie", "anime.series", "anime", "Trakt", "collection"]

  let manifestName = safeConfig ? `Posterium (${safeConfig.slice(0, 8)})` : "Posterium"
  if (hubMode === "search") {
    manifestName += " (Ricerca)"
  } else if (hubMode === "catalogs") {
    manifestName += " (Cataloghi)"
  }

  return Response.json({
    id: addonId,
    version: APP_VERSION,
    name: manifestName,
    description: "Custom poster manager for Stremio — loghi, badge trend, premi e rating",
    resources: [
      "catalog",
      "poster",
      {
        name: "meta",
        types: TYPES,
        idPrefixes: ID_PREFIXES,
      },
    ],
    types: TYPES,
    idPrefixes: ID_PREFIXES,
    logo: `${domain}/App.png`,
    addonCatalogs: [],
    manifestVersion: 1,
    behaviorHints: {
      adult: false,
      configurable: true,
      configurationRequired: false,
      configurationUrl: user ? `${domain}/u/${encodeURIComponent(user)}/configure` : (config ? `${domain}/c/${encodeURIComponent(config)}/configure` : `${domain}/configure`),
    },
    catalogs: manifestCatalogs,
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
    },
  })
}
