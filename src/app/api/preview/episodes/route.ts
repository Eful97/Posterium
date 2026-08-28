import { NextRequest } from "next/server"
import crypto from "node:crypto"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import {
  getFullDetails,
  getTVEpisodeGroup,
  getTVSeason,
  type TMDBEpisodeGroupDetails,
  posterUrl,
  resolveRequestApiKey,
} from "@/lib/tmdb"
import { enrichVideosWithTvdb } from "@/lib/tvdb"

interface PreviewVideo {
  id: string
  name: string
  season: number
  episode: number
  overview?: string
  thumbnail?: string
  released?: string
  rating?: string
}

function hashFragment(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 8)
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const tmdbIdRaw = req.nextUrl.searchParams.get("tmdbId") || req.nextUrl.searchParams.get("id")
  const tmdbId = tmdbIdRaw ? parseInt(tmdbIdRaw, 10) : NaN
  if (!tmdbId || Number.isNaN(tmdbId) || tmdbId <= 0) {
    return Response.json({ error: "tmdbId mancante o non valido" }, { status: 400 })
  }

  const rawGroupId = req.nextUrl.searchParams.get("episodeGroupId")
  // normalize: empty string -> null (standard)
  const episodeGroupId = rawGroupId && rawGroupId !== "" ? rawGroupId : null
  const language = req.nextUrl.searchParams.get("lang") || "it-IT"
  const apiKey = resolveRequestApiKey(req)
  const tvdbKeyParam = req.nextUrl.searchParams.get("tvdb_key") || undefined
  const tvdbApiKey = tvdbKeyParam || process.env.POSTERIUM_TVDB_API_KEY || process.env.TVDB_API_KEY
  const episodeMetadataSource = req.nextUrl.searchParams.get("source") || (tvdbApiKey ? "tvdb" : "tmdb")

  const cacheKey = `preview:episodes:tv:${tmdbId}:eg${episodeGroupId ?? "standard"}:lang${language}:ak${apiKey ? hashFragment(apiKey) : "none"}:es${episodeMetadataSource}:tk${tvdbApiKey ? hashFragment(tvdbApiKey) : "none"}`
  const cached = cacheGet<{ videos: PreviewVideo[]; seasons: { season: number; name: string; overview?: string; episodes: PreviewVideo[] }[] }>(cacheKey)
  if (cached) {
    return Response.json(cached, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }

  try {
    const details = await getFullDetails("tv", tmdbId, language, apiKey)
    if (!details || !details.id) {
      return Response.json({ videos: [], seasons: [] }, { status: 200 })
    }

    // tenta di risolvere imdbId per primaryId (per id video stremio)
    let imdbId: string | null = details.external_ids?.imdb_id ?? null
    if (!imdbId) {
      try {
        const { getExternalIds } = await import("@/lib/tmdb")
        const ext = await getExternalIds("tv", tmdbId, apiKey)
        imdbId = ext.imdb_id ?? null
      } catch {
        imdbId = null
      }
    }
    const primaryId = imdbId || `tmdb:${tmdbId}`

    const videos: PreviewVideo[] = []
    let groupDetails: TMDBEpisodeGroupDetails | null = null

    if (episodeGroupId && episodeGroupId !== "standard") {
      groupDetails = await getTVEpisodeGroup(episodeGroupId, language, apiKey)
    }

    if (groupDetails?.groups && groupDetails.groups.length > 0) {
      const nonEmptyGroups = groupDetails.groups.filter((g) => g.episodes && g.episodes.length > 0)
      const groupsForMeta = nonEmptyGroups.length > 0 ? nonEmptyGroups : groupDetails.groups
      const sortedGroups = [...groupsForMeta].sort((a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0))
      const hasZeroGroupOrder = sortedGroups.some((g) => g.order === 0)
      const hasSpecialsGroup = sortedGroups.some((g) => g.name?.toLowerCase().includes("special"))
      for (let gIdx = 0; gIdx < sortedGroups.length; gIdx++) {
        const grp = sortedGroups[gIdx]
        let seasonNumber: number
        if (typeof grp.order === "number") {
          if (hasSpecialsGroup && grp.name?.toLowerCase().includes("special") && grp.order === 0) {
            seasonNumber = 0
          } else if (hasZeroGroupOrder) {
            seasonNumber = hasSpecialsGroup ? grp.order : grp.order + 1
          } else {
            seasonNumber = grp.order
          }
        } else {
          seasonNumber = gIdx + 1
        }
        const sortedEpisodes = [...(grp.episodes || [])].sort((a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0))
        for (let epIdx = 0; epIdx < sortedEpisodes.length; epIdx++) {
          const ep = sortedEpisodes[epIdx]
          const episodeNumber = typeof ep.order === "number" ? ep.order + 1 : epIdx + 1
          videos.push({
            id: `${primaryId}:${seasonNumber}:${episodeNumber}`,
            name: ep.name || `Episodio ${episodeNumber}`,
            season: seasonNumber,
            episode: episodeNumber,
            overview: ep.overview || undefined,
            thumbnail: ep.still_path ? posterUrl(ep.still_path, "w500") : undefined,
            released: ep.air_date ? `${ep.air_date}T00:00:00.000Z` : undefined,
            rating: ep.vote_average ? ep.vote_average.toFixed(1) : undefined,
          })
        }
      }
    }

    // Fallback standard
    if (videos.length === 0 && details.seasons && details.seasons.length > 0) {
      const regularSeasons = details.seasons.filter((s) => s.season_number > 0)
      const seasonsData = await Promise.all(
        regularSeasons.map(async (s) => getTVSeason(tmdbId, s.season_number!, language, apiKey))
      )
      for (const sData of seasonsData) {
        if (!sData || !sData.episodes) continue
        for (const ep of sData.episodes) {
          videos.push({
            id: `${primaryId}:${ep.season_number}:${ep.episode_number}`,
            name: ep.name || `Episodio ${ep.episode_number}`,
            season: ep.season_number,
            episode: ep.episode_number,
            overview: ep.overview || undefined,
            thumbnail: ep.still_path ? posterUrl(ep.still_path, "w500") : undefined,
            released: ep.air_date ? `${ep.air_date}T00:00:00.000Z` : undefined,
            rating: ep.vote_average ? ep.vote_average.toFixed(1) : undefined,
          })
        }
      }
    }

    if (videos.length > 0 && episodeMetadataSource === "tvdb" && tvdbApiKey) {
      await enrichVideosWithTvdb(videos as unknown as import("@/lib/meta-handler").StremioVideo[], imdbId, tmdbId, tvdbApiKey, "ita")
    }

    // Raggruppa per stagione per l'anteprima
    const seasonMap = new Map<number, PreviewVideo[]>()
    for (const v of videos) {
      if (!seasonMap.has(v.season)) seasonMap.set(v.season, [])
      seasonMap.get(v.season)!.push(v)
    }
    const seasonMetaMap = new Map<number, { name: string; overview?: string }>()
    if (details.seasons) {
      for (const s of details.seasons) {
        if (typeof s.season_number === "number") {
          const so = (s as unknown as { overview?: string }).overview
          seasonMetaMap.set(s.season_number, { name: s.name || `Stagione ${s.season_number}`, overview: so || undefined })
        }
      }
    }
    // per groupDetails usa il nome del gruppo
    if (groupDetails?.groups) {
      for (const g of groupDetails.groups) {
        const derivedSeason = (() => {
          const sortedGroups = [...groupDetails!.groups].sort((a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0))
          const hasZero = sortedGroups.some((x) => x.order === 0)
          const hasSpecial = sortedGroups.some((x) => x.name?.toLowerCase().includes("special"))
          let sn: number
          if (typeof g.order === "number") {
            if (hasSpecial && g.name?.toLowerCase().includes("special") && g.order === 0) sn = 0
            else if (hasZero) sn = hasSpecial ? g.order : g.order + 1
            else sn = g.order
          } else {
            sn = sortedGroups.indexOf(g) + 1
          }
          return sn
        })()
        if (!seasonMetaMap.has(derivedSeason)) {
          seasonMetaMap.set(derivedSeason, { name: g.name || `Stagione ${derivedSeason}` })
        }
      }
    }

    const seasons = Array.from(seasonMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([season, episodes]) => ({
        season,
        name: seasonMetaMap.get(season)?.name || (season === 0 ? "Specials" : `Stagione ${season}`),
        overview: seasonMetaMap.get(season)?.overview,
        episodes: episodes.sort((a, b) => a.episode - b.episode),
      }))

    const payload = { videos, seasons, totalEpisodes: videos.length, totalSeasons: seasons.length, tmdbId, episodeGroupId: episodeGroupId ?? "standard", language }
    cacheSet(cacheKey, payload, ["preview"], 5 * 60 * 1000)
    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (e) {
    return Response.json({ videos: [], seasons: [], totalEpisodes: 0, totalSeasons: 0, error: e instanceof Error ? e.message : String(e) }, { status: 200 })
  }
}
