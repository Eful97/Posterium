"use client"

import { useP } from "@/lib/context"
import { toSearchResult } from "@/lib/types"
import { RankRow } from "@/components/RankRow"
import { ScrollReveal } from "@/components/ScrollReveal"

export function CataloghiView() {
  const p = useP()
  const movieTrending = p.trending.filter((r) => r.media_type === "movie").slice(0, 20)
  const tvTrending = p.trending.filter((r) => r.media_type === "tv").slice(0, 20)

  return (
    <div className="max-w-6xl mx-auto animate-fade-scale-in">
      <ScrollReveal animation="fade-up-fast">
        <div className="mb-8">
          <button
            onClick={() => { window.history.pushState({ view: "edit" }, ""); p.setView("edit") }}
            className="text-xs text-zinc-400 hover:text-white transition-colors mb-4 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {p.t("ui.homeBtn")}
          </button>
          <h1 className="text-2xl font-bold text-zinc-50">{p.t("ui.catalogsTitle")}</h1>
          <p className="text-sm text-zinc-400 mt-1">{p.t("ui.catalogsSubtitle")}</p>
        </div>
      </ScrollReveal>

      {/* JustWatch Top 20 */}
      {p.trending.length > 0 && (
        <ScrollReveal animation="fade-up" threshold={0.05}>
          <div className="mb-12">
            <h2 className="section-heading text-xl font-bold mb-6">{p.t("ui.justwatchTop20")}</h2>
            <div className="space-y-6">
              {movieTrending.length > 0 && (
                <RankRow label={p.t("ui.movieLabel")} items={movieTrending} onItemClick={(item) => p.navigateToPoster(toSearchResult(item))} />
              )}
              {tvTrending.length > 0 && (
                <RankRow label={p.t("ui.tvLabel")} items={tvTrending} onItemClick={(item) => p.navigateToPoster(toSearchResult(item))} />
              )}
            </div>
          </div>
        </ScrollReveal>
      )}

      <div className="section-divider" />

      {/* Piattaforme streaming */}
      <ScrollReveal animation="fade-up" threshold={0.05}>
        <div className="mb-12">
          <h2 className="section-heading text-xl font-bold mb-6">{p.t("ui.streamingPlatforms")}</h2>
          {p.STREAMING_PLATFORMS.map((sp, idx) => {
            const chart = p.streamingCharts[sp.slug]
            if (!chart || (chart.movies.length === 0 && chart.tv.length === 0)) return null
            return (
              <ScrollReveal key={sp.slug} animation="fade-up-fast" delay={idx * 80} threshold={0.05}>
                <div className="mb-8 group/platform">
                  <h3 className="text-base font-semibold text-zinc-300 mb-3 group-hover/platform:text-zinc-100 transition-colors duration-300">{sp.icon} {p.t("ui.top10", { name: sp.name })}</h3>
                  <div className="space-y-5">
                    {([["movie", chart.movies], ["tv", chart.tv]] as const).map(([mediaType, items]) => {
                      if (items.length === 0) return null
                      return (
                        <RankRow
                          key={mediaType}
                          label={mediaType === "movie" ? p.t("ui.movieLabel") : p.t("ui.tvLabel")}
                          items={items.map((i) => ({ ...i, poster_path: i.posterPath, name: i.title }))}
                          onItemClick={(item) => {
                            if (item.tmdbId) p.navigateToPoster(
                              toSearchResult({ id: item.tmdbId, media_type: mediaType as string, title: item.title ?? "", name: item.title ?? "", poster_path: item.posterPath })
                            )
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </ScrollReveal>

      <div className="section-divider" />

      {/* Anime trending */}
      {p.mdblistAnimeList.length > 0 && (
        <ScrollReveal animation="fade-up" threshold={0.05}>
          <div className="mb-12">
            <h2 className="section-heading text-xl font-bold mb-6">{p.t("ui.trendingAnime")}</h2>
            <RankRow label={p.t("ui.anime")} items={p.mdblistAnimeList} onItemClick={(item) => p.navigateToPoster(toSearchResult(item))} />
          </div>
        </ScrollReveal>
      )}

      {p.trending.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-accent-orange animate-spin mb-4" />
          <p className="text-sm text-zinc-400">{p.t("ui.loading")}</p>
        </div>
      )}
    </div>
  )
}
