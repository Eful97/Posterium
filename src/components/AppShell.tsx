"use client"

import { useState, useRef, useEffect } from "react"
import { useP } from "@/lib/context"
import { LANG_FLAGS, LANG_NAMES } from "@/lib/utils"
import { LangPicker } from "@/components/LangPicker"
import { VersionBadge } from "@/components/VersionBadge"
import { SettingsPanel } from "@/components/SettingsPanel"
import { SearchView } from "@/components/SearchView"
import { MyPostersView } from "@/components/MyPostersView"
import { CataloghiView } from "@/components/CataloghiView"
import EditView from "@/components/EditView"
import { ToastProvider } from "@/components/Toast"
import { ProxyModal } from "@/components/ProxyModal"
import { RefreshCw, Settings, Globe, HeartPulse, Sparkles } from "lucide-react"

export function AppShell() {
  const p = useP()
  const [refreshing, setRefreshing] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [proxyOpen, setProxyOpen] = useState(false)
  const [closingLang, setClosingLang] = useState(false)
  const [closingSettings, setClosingSettings] = useState(false)
  const closingLangRef = useRef<ReturnType<typeof setTimeout>>(null)
  const closingSettingsRef = useRef<ReturnType<typeof setTimeout>>(null)

  const closeLang = () => {
    setClosingLang(true)
    closingLangRef.current = setTimeout(() => { p.setLangOpen(false); setClosingLang(false) }, 150)
  }

  const closeSettings = () => {
    setClosingSettings(true)
    closingSettingsRef.current = setTimeout(() => { p.setSettingsOpen(false); setClosingSettings(false) }, 150)
  }

  useEffect(() => {
    return () => {
      if (closingLangRef.current) clearTimeout(closingLangRef.current)
      if (closingSettingsRef.current) clearTimeout(closingSettingsRef.current)
    }
  }, [])

return (
    <ToastProvider>
    <div className="app-shell text-foreground relative overflow-x-hidden">
      <VersionBadge />
      {p.serviceErrors.tmdb && (
        <div className="mx-auto max-w-lg mt-2 mb-0 px-4 py-2 bg-red-900/40 border border-red-800/50 rounded-xl text-xs text-red-300 text-center">
          TMDB service unavailable — some data may be incomplete
        </div>
      )}
      {p.previewPoster && (
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
          <button aria-label={p.copied ? p.t("ui.copied") : p.t("ui.copyUrl")} onClick={() => { p.copyUrl() }} disabled={!p.urlPattern} className="top-action-button top-action-button-primary px-5 text-sm font-semibold bg-accent-orange text-white border border-accent-orange/50 shadow-lg shadow-accent-orange/25 disabled:opacity-40 press-scale">{p.copied ? p.t("ui.copied") : p.t("ui.copyUrl")}</button>
          <button aria-label={p.t("ui.installCatalog")} onClick={async () => { const url = `https://${window.location.host}/manifest.json`; await navigator.clipboard.writeText(url); setInstalled(true); setTimeout(() => setInstalled(false), 2000) }} disabled={!p.urlPattern} className="top-action-button px-3 text-sm font-semibold bg-white/[0.06] border border-white/10 text-zinc-400 hover:text-zinc-200 press-scale">{installed ? p.t("ui.copied") : <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>{p.t("ui.installCatalog")}</span>}</button>
          <button aria-label="Addon Proxy" onClick={() => setProxyOpen(true)} className="top-action-button px-3 text-sm font-semibold flex items-center gap-1.5 bg-white/[0.06] border border-white/10 text-accent-orange hover:bg-accent-orange/15 hover:border-accent-orange/40 press-scale"><Sparkles className="w-3.5 h-3.5" />Proxy</button>
          <button aria-label={p.t("ui.myPostersBtn")} onClick={() => { if (p.view === "myposters") { window.history.back() } else { window.history.replaceState({ view: "myposters" }, ""); p.setView("myposters") } }} className="top-action-button px-3 text-sm font-semibold bg-white/[0.06] border border-white/10 text-zinc-200 press-scale">{p.t("ui.myPostersBtn")} ({p.mappings.length})</button>
          <div className="relative" ref={p.settingsRef}>
            <button aria-label={p.t("ui.settings")} onClick={(e) => { e.stopPropagation(); p.setSettingsOpen((o) => !o) }} className="top-action-button px-3 text-sm font-semibold flex items-center gap-2 bg-white/[0.06] border border-white/10 text-zinc-200 press-scale">{p.t("ui.settings")}</button>
            <div className="hidden md:block">{p.settingsOpen && <SettingsPanel tmdbKeyInput={p.tmdbKeyInput} setTmdbKeyInput={p.setTmdbKeyInput} setTmdbKey={p.setTmdbKey} setSettingsOpen={p.setSettingsOpen} exportData={p.exportData} importData={p.importData} mdblistApiKey={p.mdblistApiKey} setMdblistApiKey={p.setMdblistApiKey} />}</div>
          </div>
        </div>
        <div className="flex flex-col items-center pb-4 animate-fade-scale-in relative">
          <>
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG asset */}
          <img onClick={p.goHome} src="/posterium.png" alt="Posterium" decoding="async" className="header-logo h-16 md:h-20 w-auto mb-6 md:mb-5 cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150" />
          <div className="flex md:hidden items-center gap-2 flex-wrap justify-center">
            <button aria-label={p.t("ui.copyUrl")} onClick={() => { p.copyUrl() }} disabled={!p.urlPattern} className="top-action-button top-action-button-primary h-11 px-4 text-xs font-semibold bg-accent-orange text-white border border-accent-orange/50 shadow-lg shadow-accent-orange/25 disabled:opacity-40">{p.copied ? p.t("ui.copied") : p.t("ui.copyUrl")}</button>
            <button aria-label={p.t("ui.installCatalog")} onClick={async () => { const url = `https://${window.location.host}/manifest.json`; await navigator.clipboard.writeText(url); setInstalled(true); setTimeout(() => setInstalled(false), 2000) }} disabled={!p.urlPattern} className="top-action-button h-11 px-3 text-[11px] font-semibold bg-white/[0.06] border border-white/10 text-zinc-400 hover:text-zinc-200">{installed ? p.t("ui.copied") : <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>{p.t("ui.installCatalog")}</span>}</button>
            <button aria-label="Addon Proxy" onClick={() => setProxyOpen(true)} className="top-action-button h-11 px-3 text-[11px] font-semibold bg-white/[0.06] border border-white/10 text-accent-orange flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />Proxy</button>
            <button aria-label={p.t("ui.myPostersBtn")} onClick={() => { if (p.view === "myposters") { window.history.back() } else { window.history.replaceState({ view: "myposters" }, ""); p.setView("myposters") } }} className="top-action-button h-11 px-3 text-xs font-semibold bg-white/[0.06] border border-white/10 text-zinc-200">{p.t("ui.myPostersBtn")} ({p.mappings.length})</button>
            <button aria-label={p.t("ui.settings")} onClick={() => p.setSettingsOpen(true)} className="top-action-button h-11 w-11 flex items-center justify-center text-sm bg-white/[0.06] border border-white/10 text-zinc-200 press-scale"><Settings className="w-5 h-5" /></button>
          </div>
          </>
        </div>

        <ProxyModal isOpen={proxyOpen} onClose={() => setProxyOpen(false)} />
        <div key={p.view} className="animate-fade-scale-in">
          {p.view === "search" ? <SearchView /> : p.view === "myposters" ? <MyPostersView /> : p.view === "cataloghi" ? <CataloghiView /> : <EditView />}
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 floating-group">
        <button
          aria-label={p.t("ui.refreshLists")}
          onClick={async () => { setRefreshing(true); await p.refreshLists(); setRefreshing(false) }}
          disabled={refreshing}
          title={p.t("ui.refreshLists")}
          className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm hover:bg-white/[0.08] press-scale"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <a href="/status" aria-label={p.t("ui.statusTitle")} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm hover:bg-white/[0.08] press-scale"><HeartPulse className="w-4 h-4" /></a>
        <div ref={p.langRef} className="relative">
          <button aria-label={p.t("ui.chooseLanguage")} onClick={() => p.setLangOpen((o) => !o)} className={`h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm press-scale ${p.langOpen ? "dropdown-open" : "hover:bg-white/[0.08]"}`} title={LANG_NAMES[p.lang]}>{LANG_FLAGS[p.lang] || <Globe className="w-4 h-4" />}</button>
          {(p.langOpen || closingLang) && (
            <div className={`absolute right-0 bottom-full mb-3 bg-black/60 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 min-w-40 ${closingLang ? "animate-fade-scale-out" : "animate-fade-scale-in"} dropdown-open`}>
              {Object.entries(LANG_NAMES).filter(([k]) => k !== "xx").map(([code, name]) => (
                <button key={code} onClick={() => { p.pickLang(code); closeLang() }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs transition-all duration-150 text-left hover:bg-zinc-700/50 active:scale-[0.98] ${code === p.lang ? "bg-accent/10 text-accent font-medium" : "text-zinc-300"}`}>
                  <span>{LANG_FLAGS[code] || <Globe className="w-4 h-4" />}</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {(p.settingsOpen || closingSettings) && (
        <div className={`fixed inset-0 z-[70] bg-background md:hidden overflow-y-auto ${closingSettings ? "animate-fade-out" : "animate-fade-scale-in"}`}>
          <div className="fixed inset-0 z-[-1]" onClick={() => closeSettings()} />
          <div className="flex items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-b border-zinc-800">
            <button aria-label={p.t("ui.back")} onClick={() => closeSettings()} className="text-sm text-zinc-300 hover:text-white active:scale-90 transition-all duration-150 press-scale">{p.t("ui.back")}</button>
            <h2 className="text-sm font-semibold text-zinc-200">{p.t("ui.settingsTitle")}</h2>
          </div>
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SettingsPanel mobile tmdbKeyInput={p.tmdbKeyInput} setTmdbKeyInput={p.setTmdbKeyInput} setTmdbKey={p.setTmdbKey} setSettingsOpen={p.setSettingsOpen} exportData={p.exportData} importData={p.importData} mdblistApiKey={p.mdblistApiKey} setMdblistApiKey={p.setMdblistApiKey} />
          </div>
        </div>
      )}
    </div>
    </ToastProvider>
  )
}
