/**
 * API endpoint: check if an IMDb ID is in the Top 250.
 * Used by the client preview to resolve the "Absolute Cinema" badge.
 *
 * GET /api/imdb-top250?imdbId=tt0111161
 * → { inTop250: true }
 */
import { NextRequest } from "next/server"
import { isImdbTop250 } from "@/lib/imdb-top250"

export async function GET(req: NextRequest) {
  const imdbId = req.nextUrl.searchParams.get("imdbId") || ""
  try {
    const inTop250 = await isImdbTop250(imdbId)
    return Response.json({ inTop250 })
  } catch {
    return Response.json({ inTop250: false })
  }
}
