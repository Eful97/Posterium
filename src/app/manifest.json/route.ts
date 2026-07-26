import { NextRequest } from "next/server"
import { APP_VERSION } from "@/generated/app-version"
import { POSTERIUM_CATALOGS } from "@/lib/catalog-definitions"
import { getOriginFromRequest } from "@/lib/poster-public-url"

export async function GET(req: NextRequest) {
  const domain = getOriginFromRequest(req)
  const user = req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("user")
  const config = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")

  const suffix = user ? `.${user.slice(0, 8)}` : config ? `.${config.slice(0, 8)}` : ""
  const addonId = `org.posterium${suffix}`

  return Response.json({
    id: addonId,
    version: APP_VERSION,
    name: user ? `Posterium (${user.slice(0, 8)})` : "Posterium",
    description: "Custom poster manager for Stremio — loghi, badge trend, premi e rating",
    resources: ["catalog", "poster"],
    types: ["movie", "series"],
    logo: `${domain}/App.png`,
    addonCatalogs: [],
    manifestVersion: 1,
    behaviorHints: { adult: false },
    catalogs: POSTERIUM_CATALOGS.map((catalog) => ({
      ...catalog,
      extra: [{ name: "skip" }],
    })),
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
    },
  })
}
