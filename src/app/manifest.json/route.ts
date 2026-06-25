import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.origin
  return Response.json({
    id: "org.posterium",
    version: "0.2.9",
    name: "Posterium",
    description: "Custom poster manager for Stremio — loghi, badge trend, premi e rating",
    resources: ["catalog", "poster"],
    types: ["movie", "series"],
    logo: `${domain}/App.png`,
    addonCatalogs: [],
    manifestVersion: 1,
    behaviorHints: { adult: false },
    catalogs: [
      { id: "posterium-jw-movies", name: "Top 20 Italia — Film", type: "movie", extra: [{ name: "skip" }] },
      { id: "posterium-jw-series", name: "Top 20 Italia — Serie TV", type: "series", extra: [{ name: "skip" }] },
      { id: "posterium-netflix-movies", name: "Netflix — Film", type: "movie", extra: [{ name: "skip" }] },
      { id: "posterium-netflix-series", name: "Netflix — Serie TV", type: "series", extra: [{ name: "skip" }] },
      { id: "posterium-prime-movies", name: "Prime Video — Film", type: "movie", extra: [{ name: "skip" }] },
      { id: "posterium-prime-series", name: "Prime Video — Serie TV", type: "series", extra: [{ name: "skip" }] },
      { id: "posterium-disney-movies", name: "Disney+ — Film", type: "movie", extra: [{ name: "skip" }] },
      { id: "posterium-disney-series", name: "Disney+ — Serie TV", type: "series", extra: [{ name: "skip" }] },
      { id: "posterium-apple-movies", name: "Apple TV+ — Film", type: "movie", extra: [{ name: "skip" }] },
      { id: "posterium-apple-series", name: "Apple TV+ — Serie TV", type: "series", extra: [{ name: "skip" }] },
      { id: "posterium-hbo-movies", name: "HBO Max — Film", type: "movie", extra: [{ name: "skip" }] },
      { id: "posterium-hbo-series", name: "HBO Max — Serie TV", type: "series", extra: [{ name: "skip" }] },
      { id: "posterium-paramount-movies", name: "Paramount+ — Film", type: "movie", extra: [{ name: "skip" }] },
      { id: "posterium-paramount-series", name: "Paramount+ — Serie TV", type: "series", extra: [{ name: "skip" }] },
      { id: "posterium-anime", name: "Top 20 Anime", type: "series", extra: [{ name: "skip" }] },
    ],
  })
}
