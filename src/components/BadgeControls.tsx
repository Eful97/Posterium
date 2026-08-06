"use client"

import { useState } from "react"
import { Check, XCircle, Ruler, Cloud, Minus, Circle } from "lucide-react"
import { useP } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { Toggle } from "@/components/Toggle"
import { SliderRow } from "@/components/SliderRow"
import { BadgeStyleSelector } from "@/components/ui"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "@/lib/awards"
import { getSubGenreLabel } from "@/lib/subgenres"
import { getUpcomingReleaseLabel } from "@/lib/release-badge"
import { isPrefixedKey, badgeKey } from "@/lib/i18n"
import { getAllBadgeOptions } from "@/lib/badge-priority"
import { defaultGradientHeightForPoster } from "@/lib/gradient-defaults"

export function BadgeControls() {
  const p = useP()
  const { t, lang } = useT()
  const ed = usePosterEditor()
  const [now] = useState(() => Date.now())
  const selected = p.selected
  const metaInfo = p.metaInfo

  return (
    <div className="space-y-2.5">
      <div className="control-row flex items-center justify-between px-1">
        <span className="control-label">{t("ui.trendBadge")}</span>
        <Toggle value={ed.rankingBadges} onChange={(v) => ed.setRankingBadges(v)} />
      </div>

      <div className="mt-2 pt-2 border-t border-zinc-800/60">
        <label className="text-xs text-zinc-400 font-medium block mb-2 px-1">{t("ui.styleRankingExtra")}</label>
        <div className="px-1">
          <BadgeStyleSelector value={ed.rankingBadgeStyle} options={["default","colored","pill"]} onChange={ed.setRankingBadgeStyle} t={t} accentColor={p.accentColor} />
        </div>
        {!p.accentColor && (
          <div className="text-[10px] text-zinc-500 text-center mt-1.5 px-1">{t("ui.noDominantColor")}</div>
        )}
        {p.accentColor && (
          <div className="text-[10px] text-zinc-500 text-center mt-1.5 px-1">{t("ui.accentSharedBadge")}</div>
        )}
      </div>

      <div className="control-row flex items-center justify-between px-1">
        <span className="control-label">{t("ui.genreRatingBadge")}</span>
        <Toggle value={ed.globalBadges} onChange={(v) => ed.setGlobalBadges(v)} />
      </div>

      <div className="pl-4 space-y-2.5 border-l border-zinc-800/60 ml-1.5">
        <div className="control-row flex items-center justify-between px-1">
          <span className="control-label">{t("ui.badgeGenre")}</span>
          <Toggle value={ed.badgeGenre} onChange={(v) => ed.setBadgeGenre(v)} />
        </div>
        <div className="control-row flex items-center justify-between px-1">
          <span className="control-label">{t("ui.badgeYear")}</span>
          <Toggle value={ed.badgeYear} onChange={(v) => ed.setBadgeYear(v)} />
        </div>
        <div className="control-row flex items-center justify-between px-1">
          <span className="control-label">{t("ui.badgeRating")}</span>
          <Toggle value={ed.badgeRating} onChange={(v) => ed.setBadgeRating(v)} />
        </div>
      </div>

      <div className="control-row flex items-center justify-between px-1">
        <span className="control-label">{t("ui.networkLogo")}</span>
        <Toggle value={ed.networkLogo} onChange={(v) => ed.setNetworkLogo(v)} />
      </div>

      <div className="control-row flex items-center justify-between px-1">
        <span className="control-label">{t("ui.customBadge")}</span>
        {ed.editingValue === "customBadge" ? (
          <input autoFocus value={ed.editText} onChange={(e) => ed.setEditText(e.target.value)}
                 onFocus={(e) => e.target.select()}
                 onBlur={() => { const v = ed.editText.trim(); ed.setCustomBadge(v || null); ed.setEditingValue(null) }}
                 onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur() } }}
                 className="editor-input w-28 text-right px-1.5 py-1"
                 placeholder={t("ui.customBadgePlaceholder")} />
        ) : (
          <select value={ed.customBadge ?? "__auto__"} onChange={(e) => {
            const v = e.target.value
            if (v === "__custom__") { ed.setEditText(""); ed.setEditingValue("customBadge") }
            else if (v === "__auto__") ed.setCustomBadge(null)
            else ed.setCustomBadge(v)
          }} className="editor-input w-28 text-right px-1.5 py-1 cursor-pointer">
            <option value="__auto__">{t("ui.auto")}</option>
            {(() => {
              if (!selected) return null
              const twoWeeks = 14 * 24 * 60 * 60 * 1000
              const isNewMovie = selected.media_type === "movie" && metaInfo.release_date ? (now - new Date(metaInfo.release_date).getTime()) < twoWeeks : false
              const isNewSeries = selected.media_type === "tv" && metaInfo.first_air_date ? (now - new Date(metaInfo.first_air_date).getTime()) < twoWeeks : false
              const award = metaInfo.awards?.length ? getAwardBadgeLabel(metaInfo.awards, t) : null
              const nomination = !award && metaInfo.nominations?.length ? getNominationBadgeLabel(metaInfo.nominations, t) : null
              const animeRankData = p.mdblistAnimeList?.find((a) => a.id === selected.id)
              const animeRank = animeRankData ? animeRankData.rank : null
              const studio = metaInfo.studios?.length ? metaInfo.studios[0] : null
              const tvType = selected.media_type === "tv" ? metaInfo.type : null
              const tvStatus = selected.media_type === "tv" ? metaInfo.status : null
              const extra = selected.media_type === "tv" ? (tvType?.toLowerCase() === "miniseries" || tvType?.toLowerCase() === "miniserie" ? t("badge.miniseries") : tvStatus?.toLowerCase() === "returning series" || tvStatus?.toLowerCase() === "in corso" ? t("badge.returning") : null) : null
              const upcomingRelease = getUpcomingReleaseLabel({
                mediaType: selected.media_type === "tv" ? "tv" : "movie",
                releaseDate: metaInfo.release_date,
                firstAirDate: metaInfo.first_air_date,
                locale: lang,
                t,
              })
              const subGenre = getSubGenreLabel(metaInfo.keywords || [], lang)
              const options = getAllBadgeOptions({
                upcomingRelease, isNewMovie, isNewSeries, animeRank, trendRank: p.trendRank,
                award, nomination, studio,
                director: metaInfo.director || null, subGenre, extra,
                mediaType: selected.media_type === "tv" ? "tv" : "movie",
                voteAverage: metaInfo.voteAverage, tvType, tvStatus,
                imdbTop250: !!p.imdbTop250,
              })
              return options.map((o) => {
                const display = isPrefixedKey(o) ? t(badgeKey(o)) : o
                return <option key={o} value={o}>{display}</option>
              })
            })()}
            <option value="__custom__">{t("ui.customOption")}</option>
          </select>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/60">
        <label className="text-xs text-zinc-400 font-medium block mb-2 px-1">{t("ui.styleGenreBadge")}</label>
        <div className="px-1">
          <BadgeStyleSelector value={ed.badgeStyle} options={["shadow","pill","bar","colored","bordo","vetro"]} onChange={ed.setBadgeStyle} t={t} accentColor={p.accentColor} />
        </div>
        <div className="flex items-center gap-2 justify-center mt-2 px-1">
          <input
            type="color"
            value={!p.accentColor ? "#000000" : p.accentColor}
            onChange={(e) => p.setAccentColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded"
          />
          <input
            type="text"
            value={p.accentColor ?? ""}
            onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{6}$/.test(v)) p.setAccentColor(v) }}
            onBlur={(e) => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) e.target.value = p.accentColor ?? "" }}
            className="editor-input w-20 text-center px-1.5 py-1 font-mono"
            placeholder="#555555"
          />
          {p.accentColor && (
            <button
              onClick={() => p.setAccentColor(null)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-1"
              title="Reset to auto-detect"
            >↺</button>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/60">
        <button aria-label={ed.blurEnabled ? t("ui.blurDisabled") : t("ui.blurEnabled")}
                onClick={() => ed.setBlurEnabled(!ed.blurEnabled)}
                className={`w-full mb-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 ${ed.blurEnabled ? "bg-white/10 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
          <span className="flex items-center gap-1.5 justify-center">
            {ed.blurEnabled ? <><Check className="w-3 h-3" /> {t("ui.blurEnabled")}</> : <><XCircle className="w-3 h-3" /> {t("ui.blurDisabled")}</>}
          </span>
        </button>
        {ed.blurEnabled && <div className="space-y-1 px-1">
          <SliderRow icon={<Ruler className="w-3.5 h-3.5" />} label={t("ui.height")} value={ed.gradientHeight} min={5} max={100} boundsMin={5} boundsMax={100} onChange={(v) => ed.setGradientHeight(v)} onDoubleClick={() => ed.setGradientHeight(defaultGradientHeightForPoster(p.previewPoster))} editingValue={ed.editingValue} editText={ed.editText} setEditingValue={ed.setEditingValue} setEditText={ed.setEditText} editingKey="gradHeight" suffix="%" />
          <SliderRow icon={<Cloud className="w-3.5 h-3.5" />} label={t("ui.intensity")} value={ed.blurIntensity} min={1} max={50} boundsMin={1} boundsMax={50} onChange={(v) => ed.setBlurIntensity(v)} onDoubleClick={() => ed.setBlurIntensity(5)} editingValue={ed.editingValue} editText={ed.editText} setEditingValue={ed.setEditingValue} setEditText={ed.setEditText} editingKey="blurIntensity" suffix="px" />
          <SliderRow icon={<Minus className="w-3.5 h-3.5" />} label={t("ui.fade")} value={ed.blurFade} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => ed.setBlurFade(v)} onDoubleClick={() => ed.setBlurFade(60)} editingValue={ed.editingValue} editText={ed.editText} setEditingValue={ed.setEditingValue} setEditText={ed.setEditText} editingKey="blurFade" suffix="%" />
          <SliderRow icon={<Circle className="w-3.5 h-3.5" />} label={t("ui.darkness")} value={ed.blurDarkness} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => ed.setBlurDarkness(v)} onDoubleClick={() => ed.setBlurDarkness(40)} editingValue={ed.editingValue} editText={ed.editText} setEditingValue={ed.setEditingValue} setEditText={ed.setEditText} editingKey="blurDarkness" suffix="%" />
        </div>}
      </div>
    </div>
  )
}