"use client"

import { useState } from "react"
import { useP } from "@/lib/context"
import { LANG_FLAGS, LANG_NAMES } from "@/lib/utils"
import { LangPicker } from "@/components/LangPicker"
import { VersionBadge } from "@/components/VersionBadge"
import { SettingsPanel } from "@/components/SettingsPanel"
import { SliderRow } from "@/components/SliderRow"
import { SearchView } from "@/components/SearchView"
import { MyPostersView } from "@/components/MyPostersView"
import EditView from "@/components/EditView"
import type { SearchResult } from "@/lib/types"

export function AppShell() {
  const p = useP()
  const [refreshing, setRefreshing] = useState(false)
  const [showMdb, setShowMdb] = useState(false)
  const [installed, setInstalled] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <VersionBadge />{p.previewPoster && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${p.posterUrl(p.previewPoster.file_path, "w342")})`,
            filter: "blur(80px)",
            opacity: 0.15,
          }}
        />
      )}
      {p.showLangPicker && <LangPicker onPick={p.pickLang} />}
      <div className="max-w-full px-4 pt-5 md:pt-3 pb-20 md:pb-3">
        <div className="hidden md:flex justify-end items-center gap-2 mb-4">
          <button onClick={() => { p.copyUrl() }} disabled={!p.urlPattern} className="h-10 px-4 btn-primary">{p.copied ? p.t("ui.copied") : p.t("ui.copyUrl")}</button>
          <button onClick={async () => { const url = `https://${window.location.host}/manifest.json`; await navigator.clipboard.writeText(url); setInstalled(true); setTimeout(() => setInstalled(false), 2000) }} disabled={!p.urlPattern} className="h-10 px-3 bg-accent-orange/15 border border-accent-orange/30 hover:bg-accent-orange/25 hover:border-accent-orange/50 active:scale-95 transition-all duration-150 text-sm font-medium rounded-xl text-accent-orange">{installed ? p.t("ui.copied") : p.t("ui.installCatalog")}</button>
          <button onClick={() => { if (p.view === "myposters") { window.history.back() } else { window.history.replaceState({ view: "myposters" }, ""); p.setView("myposters") } }} className="h-10 px-3 bg-transparent border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 text-sm font-medium rounded-xl text-zinc-300">{p.t("ui.myPostersBtn")} ({p.mappings.length})</button>
          <div className="relative" ref={p.settingsRef}>
            <button onClick={(e) => { e.stopPropagation(); p.setSettingsOpen((o) => !o) }} className="h-10 px-3 bg-transparent border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 text-sm flex items-center gap-2 rounded-xl text-zinc-300">{p.t("ui.settings")}</button>
            <div className="hidden md:block">{p.settingsOpen && <SettingsPanel showKey={p.showKey} tmdbKeyInput={p.tmdbKeyInput} setTmdbKeyInput={p.setTmdbKeyInput} setTmdbKey={p.setTmdbKey} setShowKey={p.setShowKey} setSettingsOpen={p.setSettingsOpen} exportData={p.exportData} importData={p.importData} mdblistApiKey={p.mdblistApiKey} setMdblistApiKey={p.setMdblistApiKey} />}</div>
          </div>
        </div>
        <div className="flex flex-col items-center pb-4 animate-fade-scale-in relative">
          <img onClick={p.goHome} src="/posterium.svg" alt="Posterium" decoding="async" className="h-16 md:h-20 w-auto mb-5 md:mb-4 cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150" />
          <div className="flex md:hidden items-center gap-2 flex-wrap justify-center">
            <button onClick={() => { p.copyUrl() }} disabled={!p.urlPattern} className="h-9 px-3 btn-primary text-xs">{p.copied ? p.t("ui.copied") : p.t("ui.copyUrl")}</button>
            <button onClick={async () => { const url = `https://${window.location.host}/manifest.json`; await navigator.clipboard.writeText(url); setInstalled(true); setTimeout(() => setInstalled(false), 2000) }} disabled={!p.urlPattern} className="h-9 px-3 bg-accent-orange/15 border border-accent-orange/30 hover:bg-accent-orange/25 hover:border-accent-orange/50 active:scale-95 transition-all duration-150 text-[11px] font-medium rounded-xl text-accent-orange">{installed ? p.t("ui.copied") : p.t("ui.installCatalog")}</button>
            <button onClick={() => { if (p.view === "myposters") { window.history.back() } else { window.history.replaceState({ view: "myposters" }, ""); p.setView("myposters") } }} className="h-9 px-3 bg-transparent border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 text-xs font-medium rounded-xl text-zinc-300">{p.t("ui.myPostersBtn")} ({p.mappings.length})</button>
            <button onClick={() => p.setSettingsOpen(true)} className="h-8 w-8 flex items-center justify-center bg-transparent border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 text-sm rounded-xl text-zinc-300">⚙️</button>
          </div>
        </div>
        <div key={p.view} className="animate-fade-scale-in">
          {p.view === "search" ? <SearchView /> : p.view === "myposters" ? <MyPostersView /> : <EditView />}
        </div>
      </div>

      <button
        onClick={async () => { setRefreshing(true); await p.refreshLists(); setRefreshing(false) }}
        disabled={refreshing}
        title={p.t("ui.refreshLists")}
        className="fixed bottom-5 right-[7rem] z-50 h-8 w-8 flex items-center justify-center bg-surface rounded-xl hover:bg-surface2 active:scale-90 transition-all duration-150 text-sm shadow-lg shadow-black/30"
      >
        <span className={refreshing ? "animate-spin" : ""}>↻</span>
      </button>
      <a href="/status" className="fixed bottom-5 right-[4rem] z-50 h-8 w-8 flex items-center justify-center bg-surface rounded-xl hover:bg-surface2 active:scale-90 transition-all duration-150 text-sm shadow-lg shadow-black/30">🏥</a>
      <div className="fixed bottom-5 right-5 z-50" ref={p.langRef}>
        <button onClick={() => p.setLangOpen((o) => !o)} className="h-8 w-8 flex items-center justify-center bg-surface rounded-xl hover:bg-surface2 active:scale-90 transition-all duration-150 text-sm shadow-lg shadow-black/30" title={LANG_NAMES[p.lang]}>{LANG_FLAGS[p.lang] || "🌐"}</button>
        {p.langOpen && (
          <div className="absolute right-0 bottom-full mb-2 bg-black/60 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-1.5 shadow-2xl shadow-black/50 z-50 min-w-40 animate-fade-scale-in">
            {Object.entries(LANG_NAMES).filter(([k]) => k !== "xx").map(([code, name]) => (
              <button key={code} onClick={() => { p.pickLang(code); p.setLangOpen(false) }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-150 text-left hover:bg-zinc-700/50 active:scale-[0.98] ${code === p.lang ? "bg-accent/10 text-accent font-medium" : "text-zinc-300"}`}>
                <span>{LANG_FLAGS[code]}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div ref={p.toastRef} className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-accent-orange text-white px-4 py-2 rounded-lg text-sm font-medium z-[60] shadow-lg shadow-accent-orange/30 transition-all duration-300 opacity-0 scale-95 pointer-events-none"></div>

      {p.settingsOpen && (
        <div className="fixed inset-0 z-[70] bg-background md:hidden animate-fade-scale-in overflow-y-auto">
          <div className="fixed inset-0 z-[-1]" onClick={() => p.setSettingsOpen(false)} />
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
            <button onClick={() => p.setSettingsOpen(false)} className="text-sm text-zinc-300 hover:text-white active:scale-90 transition-all duration-150">{p.t("ui.back")}</button>
            <h2 className="text-sm font-semibold text-zinc-200">{p.t("ui.settingsTitle")}</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400 font-medium">{p.t("ui.tmdbKey")}</label>
              <div className="flex gap-1">
                <input type={p.showKey ? "text" : "password"} value={p.tmdbKeyInput} onChange={(e) => p.setTmdbKeyInput(e.target.value)} onBlur={() => p.setTmdbKey(p.tmdbKeyInput)} onKeyDown={(e) => { if (e.key === "Enter") { p.setTmdbKey(p.tmdbKeyInput); p.setSettingsOpen(false) } }} placeholder={p.t("ui.tmdbKeyPlaceholder")} className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500" />
                <button onClick={(e) => { e.stopPropagation(); p.setShowKey((s) => !s) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{p.showKey ? "🙈" : "👁️"}</button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400 font-medium">{p.t("ui.mdblistKey")}</label>
              <div className="flex gap-1">
                <input type={showMdb ? "text" : "password"} defaultValue={p.mdblistApiKey} onChange={(e) => { p.setMdblistApiKey(e.target.value); localStorage.setItem("mdblist_key", e.target.value) }} placeholder={p.t("ui.mdblistKeyPlaceholder")} className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500" />
                <button onClick={(e) => { e.stopPropagation(); setShowMdb(!showMdb) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{showMdb ? "🙈" : "👁️"}</button>
              </div>
            </div>
            <button onClick={() => { p.exportData(); p.setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150">{p.t("ui.exportJson")}</button>
            <button onClick={() => { p.importData(); p.setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150">{p.t("ui.importJson")}</button>
            <hr className="border-zinc-700 my-2" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">⭐ Badge genere/rating</span>
              <button onClick={() => { p.setDefaultGlobalBadges(!p.defaultGlobalBadges); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), globalBadges: !p.defaultGlobalBadges })) }} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultGlobalBadges ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultGlobalBadges ? "ON" : "OFF"}</button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">🏆 Badge ranking/extra</span>
              <button onClick={() => { p.setDefaultRankingBadges(!p.defaultRankingBadges); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), rankingBadges: !p.defaultRankingBadges })) }} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultRankingBadges ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultRankingBadges ? "ON" : "OFF"}</button>
            </div>
            <hr className="border-zinc-700 my-2" />
            <label className="text-xs text-zinc-400 font-medium block mb-2">Stile badge predefinito</label>
            <div className="flex gap-1 mb-2">
              {(["shadow","pill","outline","bar"] as const).map(s => (
                <button key={s} onClick={() => { p.setDefaultBadgeStyle(s); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), badgeStyle: s })) }} className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 ${p.defaultBadgeStyle === s ? "bg-white/20 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}>{s === "shadow" ? "Ombra" : s === "pill" ? "Pill" : s === "outline" ? "Outline" : "Barra"}</button>
              ))}
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">Sfocatura predefinita</span>
              <button onClick={() => { p.setDefaultBlurEnabled(!p.defaultBlurEnabled); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), blurEnabled: !p.defaultBlurEnabled })) }} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultBlurEnabled ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultBlurEnabled ? "Attiva" : "Disattivata"}</button>
            </div>
            {p.defaultBlurEnabled && <>
              <SliderRow icon="📏" label="Altezza" value={p.defaultGradientHeight} min={5} max={100} boundsMin={5} boundsMax={100} onChange={(v) => { p.setDefaultGradientHeight(v); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), gradientHeight: v })) }} onDoubleClick={() => { p.setDefaultGradientHeight(30); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), gradientHeight: 30 })) }} editingValue={null} editText="" setEditingValue={() => {}} setEditText={() => {}} editingKey="" suffix="%" />
              <SliderRow icon="🌫️" label="Intensità" value={p.defaultBlurIntensity} min={1} max={50} boundsMin={1} boundsMax={50} onChange={(v) => { p.setDefaultBlurIntensity(v); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), blurIntensity: v })) }} onDoubleClick={() => { p.setDefaultBlurIntensity(5); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), blurIntensity: 5 })) }} editingValue={null} editText="" setEditingValue={() => {}} setEditText={() => {}} editingKey="" suffix="px" />
              <SliderRow icon="〰️" label="Fade" value={p.defaultBlurFade} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => { p.setDefaultBlurFade(v); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), blurFade: v })) }} onDoubleClick={() => { p.setDefaultBlurFade(60); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), blurFade: 60 })) }} editingValue={null} editText="" setEditingValue={() => {}} setEditText={() => {}} editingKey="" suffix="%" />
              <SliderRow icon="🌑" label="Velatura" value={p.defaultBlurDarkness} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => { p.setDefaultBlurDarkness(v); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), blurDarkness: v })) }} onDoubleClick={() => { p.setDefaultBlurDarkness(40); localStorage.setItem("badgeDefaults", JSON.stringify({ ...JSON.parse(localStorage.getItem("badgeDefaults") || "{}"), blurDarkness: 40 })) }} editingValue={null} editText="" setEditingValue={() => {}} setEditText={() => {}} editingKey="" suffix="%" />
            </>}
          </div>
        </div>
      )}
    </div>
  )
}
