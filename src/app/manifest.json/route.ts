import { NextRequest } from "next/server"
import { APP_VERSION } from "@/generated/app-version"
import { POSTERIUM_CATALOGS } from "@/lib/catalog-definitions"

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.origin
  return Response.json({
    id: "org.posterium",
    version: APP_VERSION,
    name: "Posterium",
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
  })
}
