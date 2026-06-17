import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.origin
  return Response.json({
    id: "org.posterium",
    version: "0.1.0",
    name: "Posterium",
    description: "Custom poster manager for Stremio via AIOmetadata",
    resources: ["poster"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    logo: `${domain}/posterium.svg`,
    addonCatalogs: [],
    manifestVersion: 1,
    behaviorHints: {
      adult: false,
    },
    catalogs: [],
  })
}
