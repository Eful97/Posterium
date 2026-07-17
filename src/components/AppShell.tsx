"use client"

import { useState } from "react"
import { useP } from "@/lib/context"
import { LANG_FLAGS, LANG_NAMES } from "@/lib/utils"
import { LangPicker } from "@/components/LangPicker"
import { VersionBadge } from "@/components/VersionBadge"
import { SettingsPanel } from "@/components/SettingsPanel"
import { SearchView } from "@/components/SearchView"
import { MyPostersView } from "@/components/MyPostersView"
import EditView from "@/components/EditView"
import { RefreshCw, Settings, Globe, HeartPulse } from "lucide-react"

export function AppShell() {
  const p = useP()
  const [refreshing, setRefreshing] = useState(false)
  const [installed, setInstalled] = useState(false)

  return (
    <div className="app-shell text-foreground relative overflow-x-hidden">
      <VersionBadge />{p.previewPoster && (
        <div
          className="poster-ambient-image fixed inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${p.posterUrl(p.previewPoster.file_path, "w342")})`,
            filter: "blur(92px) saturate(1.25)",
            opacity: 0.17,
          }}
        />
      )}
      {p.showLangPicker && <LangPicker onPick={p.pickLang} />}
      <div className="relative z-10 max-w-[1680px] mx-auto px-4 pt-5 md:pt-3 pb-20 md:pb-6 pb-[max(5rem,env(safe-area-inset-bottom)+4rem)]">
        <div className="hidden md:flex justify-end items-center gap-2 mb-4">
          <button onClick={() => { p.copyUrl() }} disabled={!p.urlPattern} className="top-action-button top-action-button-primary px-4 text-sm font-semibold bg-accent-orange text-white border border-accent-orange/50 shadow-lg shadow-accent-orange/25 disabled:opacity-40">{p.copied ? p.t("ui.copied") : p.t("ui.copyUrl")}</button>
          <button onClick={async () => { const url = `https://${window.location.host}/manifest.json`; await navigator.clipboard.writeText(url); setInstalled(true); setTimeout(() => setInstalled(false), 2000) }} disabled={!p.urlPattern} className="top-action-button top-action-button-accent px-3 text-sm font-semibold bg-accent-orange/15 text-accent-orange border border-accent-orange/30 disabled:opacity-40">{installed ? p.t("ui.copied") : p.t("ui.installCatalog")}</button>
          <button onClick={() => { if (p.view === "myposters") { window.history.back() } else { window.history.replaceState({ view: "myposters" }, ""); p.setView("myposters") } }} className="top-action-button px-3 text-sm font-semibold bg-white/[0.06] border border-white/10 text-zinc-200">{p.t("ui.myPostersBtn")} ({p.mappings.length})</button>
          <div className="relative" ref={p.settingsRef}>
            <button onClick={(e) => { e.stopPropagation(); p.setSettingsOpen((o) => !o) }} className="top-action-button px-3 text-sm font-semibold flex items-center gap-2 bg-white/[0.06] border border-white/10 text-zinc-200">{p.t("ui.settings")}</button>
            <div className="hidden md:block">{p.settingsOpen && <SettingsPanel tmdbKeyInput={p.tmdbKeyInput} setTmdbKeyInput={p.setTmdbKeyInput} setTmdbKey={p.setTmdbKey} setSettingsOpen={p.setSettingsOpen} exportData={p.exportData} importData={p.importData} mdblistApiKey={p.mdblistApiKey} setMdblistApiKey={p.setMdblistApiKey} />}</div>
          </div>
        </div>
        <div className="flex flex-col items-center pb-4 animate-fade-scale-in relative">
          <>
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG asset */}
          <img onClick={p.goHome} src="/posterium.svg" alt="Posterium" decoding="async" className="h-16 md:h-20 w-auto mb-5 md:mb-4 cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150" />
          <div className="flex md:hidden items-center gap-2 flex-wrap justify-center">
            <button onClick={() => { p.copyUrl() }} disabled={!p.urlPattern} className="top-action-button top-action-button-primary h-11 px-3 text-xs font-semibold bg-accent-orange text-white border border-accent-orange/50 shadow-lg shadow-accent-orange/25 disabled:opacity-40">{p.copied ? p.t("ui.copied") : p.t("ui.copyUrl")}</button>
            <button onClick={async () => { const url = `https://${window.location.host}/manifest.json`; await navigator.clipboard.writeText(url); setInstalled(true); setTimeout(() => setInstalled(false), 2000) }} disabled={!p.urlPattern} className="top-action-button top-action-button-accent h-11 px-3 text-[11px] font-semibold bg-accent-orange/15 text-accent-orange border border-accent-orange/30 disabled:opacity-40">{installed ? p.t("ui.copied") : p.t("ui.installCatalog")}</button>
            <button onClick={() => { if (p.view === "myposters") { window.history.back() } else { window.history.replaceState({ view: "myposters" }, ""); p.setView("myposters") } }} className="top-action-button h-11 px-3 text-xs font-semibold bg-white/[0.06] border border-white/10 text-zinc-200">{p.t("ui.myPostersBtn")} ({p.mappings.length})</button>
            <button onClick={() => p.setSettingsOpen(true)} className="top-action-button h-11 w-11 flex items-center justify-center text-sm bg-white/[0.06] border border-white/10 text-zinc-200"><Settings className="w-5 h-5" /></button>
          </div>
          </>
        </div>
        <div key={p.view} className="animate-fade-scale-in">
          {p.view === "search" ? <SearchView /> : p.view === "myposters" ? <MyPostersView /> : <EditView />}
        </div>
      </div>

      <button
        onClick={async () => { setRefreshing(true); await p.refreshLists(); setRefreshing(false) }}
        disabled={refreshing}
        title={p.t("ui.refreshLists")}
        className="floating-action fixed bottom-5 right-[7rem] z-50 h-11 w-11 flex items-center justify-center rounded-xl active:scale-90 transition-all duration-150 text-sm"
      >
        <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
      </button>
      <a href="/status" className="floating-action fixed bottom-5 right-[4rem] z-50 h-11 w-11 flex items-center justify-center rounded-xl active:scale-90 transition-all duration-150 text-sm"><HeartPulse className="w-5 h-5" /></a>
      <div className="fixed bottom-5 right-5 z-50" ref={p.langRef}>
        <button onClick={() => p.setLangOpen((o) => !o)} className="floating-action h-11 w-11 flex items-center justify-center rounded-xl active:scale-90 transition-all duration-150 text-sm" title={LANG_NAMES[p.lang]}>{LANG_FLAGS[p.lang] || <Globe className="w-5 h-5" />}</button>
        {p.langOpen && (
          <div className="absolute right-0 bottom-full mb-2 bg-black/60 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-1.5 shadow-2xl shadow-black/50 z-50 min-w-40 animate-fade-scale-in">
            {Object.entries(LANG_NAMES).filter(([k]) => k !== "xx").map(([code, name]) => (
              <button key={code} onClick={() => { p.pickLang(code); p.setLangOpen(false) }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs transition-all duration-150 text-left hover:bg-zinc-700/50 active:scale-[0.98] ${code === p.lang ? "bg-accent/10 text-accent font-medium" : "text-zinc-300"}`}>
                <span>{LANG_FLAGS[code] || <Globe className="w-4 h-4" />}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {p.settingsOpen && (
        <div className="fixed inset-0 z-[70] bg-background md:hidden animate-fade-scale-in overflow-y-auto">
          <div className="fixed inset-0 z-[-1]" onClick={() => p.setSettingsOpen(false)} />
          <div className="flex items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-b border-zinc-800">
            <button onClick={() => p.setSettingsOpen(false)} className="text-sm text-zinc-300 hover:text-white active:scale-90 transition-all duration-150">{p.t("ui.back")}</button>
            <h2 className="text-sm font-semibold text-zinc-200">{p.t("ui.settingsTitle")}</h2>
          </div>
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SettingsPanel mobile tmdbKeyInput={p.tmdbKeyInput} setTmdbKeyInput={p.setTmdbKeyInput} setTmdbKey={p.setTmdbKey} setSettingsOpen={p.setSettingsOpen} exportData={p.exportData} importData={p.importData} mdblistApiKey={p.mdblistApiKey} setMdblistApiKey={p.setMdblistApiKey} />
          </div>
        </div>
      )}
    </div>
  )
}
