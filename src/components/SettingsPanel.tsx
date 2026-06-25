"use client"

import { useState } from "react"
import { useP } from "@/lib/context"
import { SliderRow } from "@/components/SliderRow"

interface Props {
  showKey: boolean
  tmdbKeyInput: string
  setTmdbKeyInput: (v: string) => void
  setTmdbKey: (v: string) => void
  setShowKey: (v: (prev: boolean) => boolean) => void
  setSettingsOpen: (v: boolean) => void
  exportData: () => void
  importData: () => void
  mdblistApiKey: string
  setMdblistApiKey: (v: string) => void
}

function saveDefaults(p: ReturnType<typeof useP>) {
  localStorage.setItem("badgeDefaults", JSON.stringify({
    globalBadges: p.defaultGlobalBadges,
    rankingBadges: p.defaultRankingBadges,
    badgeStyle: p.defaultBadgeStyle,
    blurEnabled: p.defaultBlurEnabled,
    blurIntensity: p.defaultBlurIntensity,
    blurFade: p.defaultBlurFade,
    blurDarkness: p.defaultBlurDarkness,
    gradientHeight: p.defaultGradientHeight,
  }))
}

export function SettingsPanel({ showKey, tmdbKeyInput, setTmdbKeyInput, setTmdbKey, setShowKey, setSettingsOpen, exportData, importData, mdblistApiKey, setMdblistApiKey }: Props) {
  const p = useP()
  const [showMdb, setShowMdb] = useState(false)
  return (
    <div className="absolute right-0 top-full mt-2 bg-black/60 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-3 shadow-2xl shadow-black/50 z-50 min-w-56 flex flex-col gap-2 animate-fade-scale-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400 font-medium">🔑 {p.t("ui.tmdbKey")}</label>
        <div className="flex gap-1">
          <input type={showKey ? "text" : "password"} value={tmdbKeyInput} onChange={(e) => setTmdbKeyInput(e.target.value)} onBlur={() => setTmdbKey(tmdbKeyInput)} onKeyDown={(e) => { if (e.key === "Enter") { setTmdbKey(tmdbKeyInput); setSettingsOpen(false) } }} placeholder={p.t("ui.tmdbKeyPlaceholder")} className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500" />
          <button onClick={(e) => { e.stopPropagation(); setShowKey((s) => !s) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{showKey ? "🙈" : "👁️"}</button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400 font-medium">📋 {p.t("ui.mdblistKey")}</label>
        <div className="flex gap-1">
          <input type={showMdb ? "text" : "password"} defaultValue={mdblistApiKey} onChange={(e) => { setMdblistApiKey(e.target.value); localStorage.setItem("mdblist_key", e.target.value) }} placeholder={p.t("ui.mdblistKeyPlaceholder")} className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500" />
          <button onClick={(e) => { e.stopPropagation(); setShowMdb(!showMdb) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{showMdb ? "🙈" : "👁️"}</button>
        </div>
      </div>
      <hr className="border-zinc-700 my-1" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">⭐ Badge genere/rating</span>
        <button onClick={() => { p.setDefaultGlobalBadges(!p.defaultGlobalBadges); saveDefaults(p) }} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultGlobalBadges ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultGlobalBadges ? "ON" : "OFF"}</button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">🏆 Badge ranking/extra</span>
        <button onClick={() => { p.setDefaultRankingBadges(!p.defaultRankingBadges); saveDefaults(p) }} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultRankingBadges ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultRankingBadges ? "ON" : "OFF"}</button>
      </div>
      <hr className="border-zinc-700 my-1" />
      <label className="text-xs text-zinc-400 font-medium">Stile badge predefinito</label>
      <div className="flex gap-1">
        {(["shadow","pill","outline","bar"] as const).map(s => (
          <button key={s} onClick={() => { p.setDefaultBadgeStyle(s); saveDefaults(p) }} className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 ${p.defaultBadgeStyle === s ? "bg-white/20 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}>{s === "shadow" ? "Ombra" : s === "pill" ? "Pill" : s === "outline" ? "Outline" : "Barra"}</button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-zinc-400">Sfocatura predefinita</span>
        <button onClick={() => { p.setDefaultBlurEnabled(!p.defaultBlurEnabled); saveDefaults(p) }} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultBlurEnabled ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultBlurEnabled ? "Attiva" : "Disattivata"}</button>
      </div>
      {p.defaultBlurEnabled && <>
        <SliderRow icon="📏" label="Altezza" value={p.defaultGradientHeight} min={5} max={100} boundsMin={5} boundsMax={100} onChange={(v) => { p.setDefaultGradientHeight(v); saveDefaults(p) }} onDoubleClick={() => { p.setDefaultGradientHeight(30); saveDefaults(p) }} editingValue={null} editText="" setEditingValue={() => {}} setEditText={() => {}} editingKey="" suffix="%" />
        <SliderRow icon="🌫️" label="Intensità" value={p.defaultBlurIntensity} min={1} max={50} boundsMin={1} boundsMax={50} onChange={(v) => { p.setDefaultBlurIntensity(v); saveDefaults(p) }} onDoubleClick={() => { p.setDefaultBlurIntensity(5); saveDefaults(p) }} editingValue={null} editText="" setEditingValue={() => {}} setEditText={() => {}} editingKey="" suffix="px" />
        <SliderRow icon="〰️" label="Fade" value={p.defaultBlurFade} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => { p.setDefaultBlurFade(v); saveDefaults(p) }} onDoubleClick={() => { p.setDefaultBlurFade(60); saveDefaults(p) }} editingValue={null} editText="" setEditingValue={() => {}} setEditText={() => {}} editingKey="" suffix="%" />
        <SliderRow icon="🌑" label="Velatura" value={p.defaultBlurDarkness} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => { p.setDefaultBlurDarkness(v); saveDefaults(p) }} onDoubleClick={() => { p.setDefaultBlurDarkness(40); saveDefaults(p) }} editingValue={null} editText="" setEditingValue={() => {}} setEditText={() => {}} editingKey="" suffix="%" />
      </>}
      <hr className="border-zinc-700 my-1" />
      <button onClick={(e) => { exportData(); setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150">{p.t("ui.exportJson")}</button>
      <button onClick={(e) => { importData(); setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150">{p.t("ui.importJson")}</button>
    </div>
  )
}
