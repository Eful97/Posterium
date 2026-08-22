"use client"

import { useState, useRef, useEffect, type CSSProperties } from "react"
import dynamic from "next/dynamic"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { LANG_FLAGS, LANG_NAMES } from "@/lib/utils"
import { LangPicker } from "@/components/LangPicker"
import { ToastProvider } from "@/components/Toast"
import { HomeStatusStrip } from "@/components/HomeStatusStrip"
import { RefreshCw, Settings, Globe, HeartPulse, Sparkles, Copy, Check, QrCode, Palette } from "lucide-react"

// Code-splitting: viste/modali pesanti caricate on-demand per ridurre il JS iniziale.
const SettingsPanel = dynamic(() => import("@/components/SettingsPanel").then((m) => m.SettingsPanel), { ssr: false })
const SearchView = dynamic(() => import("@/components/SearchView").then((m) => m.SearchView), { ssr: false })
const MyPostersView = dynamic(() => import("@/components/MyPostersView").then((m) => m.MyPostersView), { ssr: false })
const CataloghiView = dynamic(() => import("@/components/CataloghiView").then((m) => m.CataloghiView), { ssr: false })
const EditView = dynamic(() => import("@/components/EditView"), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-xs text-zinc-500 animate-pulse">…</div> })
const ProxyModal = dynamic(() => import("@/components/ProxyModal").then((m) => m.ProxyModal), { ssr: false })
const InstallModal = dynamic(() => import("@/components/InstallModal").then((m) => m.InstallModal), { ssr: false })
const OnboardingTour = dynamic(() => import("@/components/OnboardingTour").then((m) => m.OnboardingTour), { ssr: false })

export function AppShell() {
  const setLangOpen = usePSelector((v) => v.setLangOpen)
  const setSettingsOpen = usePSelector((v) => v.setSettingsOpen)
  const accentColor = usePSelector((v) => v.accentColor)
  const settingsOpen = usePSelector((v) => v.settingsOpen)
  const serviceErrors = usePSelector((v) => v.serviceErrors)

  const showLangPicker = usePSelector((v) => v.showLangPicker)
  const copied = usePSelector((v) => v.copied)
  const copyUrl = usePSelector((v) => v.copyUrl)
  const urlPattern = usePSelector((v) => v.urlPattern)
  const view = usePSelector((v) => v.view)
  const router = usePSelector((v) => v.router)
  const mappings = usePSelector((v) => v.mappings)
  const selected = usePSelector((v) => v.selected)
  const exportData = usePSelector((v) => v.exportData)
  const importData = usePSelector((v) => v.importData)
  const goHome = usePSelector((v) => v.goHome)
  const refreshLists = usePSelector((v) => v.refreshLists)
  const langRef = usePSelector((v) => v.langRef)
  const langOpen = usePSelector((v) => v.langOpen)
  const { t, lang, pickLang } = useT()
  const [refreshing, setRefreshing] = useState(false)
  const [proxyOpen, setProxyOpen] = useState(false)
  const [closingLang, setClosingLang] = useState(false)
  const [closingSettings, setClosingSettings] = useState(false)
  const closingLangRef = useRef<ReturnType<typeof setTimeout>>(null)
  const closingSettingsRef = useRef<ReturnType<typeof setTimeout>>(null)

  const closeLang = () => {
    setClosingLang(true)
    closingLangRef.current = setTimeout(() => { setLangOpen(false); setClosingLang(false) }, 150)
  }

  const closeSettings = () => {
    setClosingSettings(true)
    closingSettingsRef.current = setTimeout(() => { setSettingsOpen(false); setClosingSettings(false) }, 150)
  }

  // Il pannello impostazioni completo si chiude con Esc
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setSettingsOpen(false) }
    addEventListener("keydown", fn)
    return () => removeEventListener("keydown", fn)
  }, [setSettingsOpen])

  useEffect(() => {
    return () => {
      if (closingLangRef.current) clearTimeout(closingLangRef.current)
      if (closingSettingsRef.current) clearTimeout(closingSettingsRef.current)
    }
  }, [])

  // Blocca lo scroll del body quando le impostazioni mobili sono aperte
  useEffect(() => {
    if (!settingsOpen) return
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    if (!isMobile) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [settingsOpen])

  const [installOpen, setInstallOpen] = useState(false)

  const handleInstallCatalog = () => {
    setInstallOpen(true)
  }

  // Toolbar mobile (azioni rapide): riga centrata sotto il logo nella home,
  // Toolbar mobile (azioni rapide): riga centrata sotto il logo nella home,
  // in testa all'editor — identica in entrambi i casi (invariata alla home)
  const mobileToolbar = (
    <div className="flex md:hidden items-center gap-1.5 flex-wrap justify-center p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-xl">
      <button
        type="button"
        onClick={handleInstallCatalog}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-accent-orange to-amber-500 text-white font-semibold text-xs shadow-md shadow-accent-orange/20 active:scale-95 transition-all"
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>Installa Hub</span>
      </button>
      <button
        type="button"
        aria-label={t("ui.myPostersBtn")}
        onClick={() => { if (view === "myposters") { router.back() } else { router.replace("myposters") } }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-200 bg-white/[0.06] border border-white/10 active:scale-95 transition-all"
      >
        <Palette className="w-3.5 h-3.5 text-accent-orange" />
        <span>{mappings.length}</span>
      </button>
      <button
        type="button"
        suppressHydrationWarning
        aria-label={copied ? t("ui.copied") : t("ui.copyUrl")}
        onClick={() => { copyUrl() }}
        disabled={!urlPattern}
        className={`p-2 rounded-xl border transition-all duration-150 active:scale-90 ${
          copied
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm"
            : "bg-white/[0.06] border-white/10 text-zinc-300 hover:text-white"
        } disabled:opacity-40`}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <button type="button" aria-label={t("ui.addonProxy")} onClick={() => setProxyOpen(true)} className="p-2 rounded-xl bg-white/[0.06] border border-white/10 text-accent-orange active:scale-90 transition-all"><Sparkles className="w-3.5 h-3.5" /></button>
      <button type="button" aria-label={t("ui.settings")} onClick={() => setSettingsOpen(true)} className="p-2 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-200 active:scale-90 transition-all"><Settings className="w-3.5 h-3.5" /></button>
    </div>
  )

  return (
    <>
    <ToastProvider>
    <div className="app-shell text-foreground relative overflow-x-hidden" style={{ "--bg-accent": accentColor ?? undefined } as CSSProperties}>
      {/* Home: la versione è già nella strip di stato in basso → badge in alto rimosso */}
      {serviceErrors.tmdb && (
        <div className="mx-auto max-w-lg mt-2 mb-0 px-4 py-2 bg-red-900/40 border border-red-800/50 rounded-xl text-xs text-red-300 text-center">
          {t("ui.statusTmdbUnavailable")}
        </div>
      )}
      {showLangPicker && <LangPicker onPick={pickLang} />}
      {/* desktop toolbar — floating island (sempre visibile, anche nell'editor: come la home) */}
      <div className="hidden md:flex absolute top-4 right-4 z-20">
        {settingsOpen && <div className="hidden md:block fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 relative z-50">
          {/* Installa Posterium Hub Pill Button */}
          <button
            type="button"
            onClick={handleInstallCatalog}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-accent-orange to-amber-500 hover:from-accent-orange/90 hover:to-amber-500/90 text-white font-semibold text-xs shadow-md shadow-accent-orange/20 hover:shadow-accent-orange/35 hover:scale-[1.02] active:scale-[0.97] transition-all duration-150 border border-white/20 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-white" />
            <span>Installa Hub</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* I Miei Poster Badge */}
          <button
            type="button"
            aria-label={t("ui.myPostersBtn")}
            title={t("ui.myPostersBtn")}
            onClick={() => { if (view === "myposters") { router.back() } else { router.replace("myposters") } }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.95] cursor-pointer ${
              view === "myposters"
                ? "bg-white/15 text-white font-semibold border border-white/20"
                : "text-zinc-300 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-accent-orange" />
            <span>{mappings.length}</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Copy URL */}
          <button
            type="button"
            suppressHydrationWarning
            aria-label={copied ? t("ui.copied") : t("ui.copyUrl")}
            title={t("ui.copyUrl")}
            onClick={() => { copyUrl() }}
            disabled={!urlPattern}
            className={`p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] active:scale-90 transition-all duration-150 disabled:opacity-30 cursor-pointer ${
              copied ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : ""
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Proxy Modal */}
          <button
            type="button"
            aria-label={t("ui.addonProxy")}
            title={t("ui.addonProxy")}
            onClick={() => setProxyOpen(true)}
            className="p-2 rounded-xl text-zinc-400 hover:text-accent-orange hover:bg-white/[0.08] active:scale-90 transition-all duration-150 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Settings Button & Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-label={t("ui.settings")}
              title={t("ui.settings")}
              onClick={(e) => { e.stopPropagation(); setSettingsOpen((o) => !o) }}
              className={`p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all duration-150 cursor-pointer ${
                settingsOpen ? "bg-white/10 text-white" : ""
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="hidden md:block">
              {settingsOpen && <SettingsPanel setSettingsOpen={setSettingsOpen} exportData={exportData} importData={importData} />}
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 max-w-[1680px] mx-auto px-4 pt-5 md:pt-[68px] pb-20 md:pb-6 pb-[max(5rem,env(safe-area-inset-bottom)+4rem)]">
        {/* Header globale (logo + tagline + toolbar mobile): nell'editor logo e
            tagline sono nascosti (li sostituisce l'header dell'editor) ma la
            toolbar mobile resta identica alla home */}
        {!(view === "edit" && selected) && (
        <div className="flex flex-col items-center pb-4 animate-fade-scale-in relative">
          <>
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG asset */}
          <img onClick={goHome} src="/posterium.png" alt="Posterium" decoding="async" className="header-logo h-16 md:h-20 w-auto cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150 mb-1 md:mb-2" />
          <p className="header-tagline mb-5 md:mb-6">{t("ui.homeTagline")}</p>
          {mobileToolbar}
          </>
        </div>
        )}
        {view === "edit" && selected && (
          <div className="pb-3">{mobileToolbar}</div>
        )}

        <ProxyModal isOpen={proxyOpen} onClose={() => setProxyOpen(false)} />
        <InstallModal isOpen={installOpen} onClose={() => setInstallOpen(false)} />
        <div key={view} className="animate-view-enter">
          {view === "search" ? <SearchView /> : view === "myposters" ? <MyPostersView /> : view === "cataloghi" ? <CataloghiView /> : <EditView />}
        </div>
        {/* Strip di stato: presente in tutte le viste */}
        <HomeStatusStrip />
      </div>

      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 floating-group">
        <button type="button"
          aria-label={t("ui.refreshLists")}
          onClick={async () => { setRefreshing(true); await refreshLists(); setRefreshing(false) }}
          disabled={refreshing}
          title={t("ui.refreshLists")}
          className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm hover:bg-white/[0.08] press-scale"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <a href="/status" aria-label={t("ui.statusTitle")} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm hover:bg-white/[0.08] press-scale"><HeartPulse className="w-4 h-4" /></a>
        <div ref={langRef} className="relative">
          <button type="button" aria-label={t("ui.chooseLanguage")} onClick={() => setLangOpen((o) => !o)} className={`h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm press-scale ${langOpen ? "dropdown-open" : "hover:bg-white/[0.08]"}`} title={LANG_NAMES[lang]}>{LANG_FLAGS[lang] || <Globe className="w-4 h-4" />}</button>
          {(langOpen || closingLang) && (
            <div className={`absolute right-0 bottom-full mb-3 bg-black/60 backdrop-blur-xl border border-border/50 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 min-w-40 ${closingLang ? "animate-fade-scale-out" : "animate-fade-scale-in"} dropdown-open`}>
              {Object.entries(LANG_NAMES).filter(([k]) => k !== "xx").map(([code, name]) => (
                <button type="button" key={code} onClick={() => { pickLang(code); closeLang() }} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs transition-all duration-150 text-left hover:bg-zinc-700/50 active:scale-[0.98] ${code === lang ? "bg-accent/10 text-accent font-medium" : "text-zinc-300"}`}>
                  <span>{LANG_FLAGS[code] || <Globe className="w-4 h-4" />}</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {(settingsOpen || closingSettings) && (
        <div role="dialog" aria-modal="true" aria-label={t("ui.settingsTitle")} className={`fixed inset-0 z-[70] bg-background md:hidden overflow-y-auto ${closingSettings ? "animate-fade-out" : "animate-fade-scale-in"}`}>
          <div className="fixed inset-0 z-[-1]" onClick={() => closeSettings()} />
          <div className="flex items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-b border-surface2">
            <button type="button" autoFocus aria-label={t("ui.back")} onClick={() => closeSettings()} className="text-sm text-zinc-300 hover:text-white active:scale-90 transition-all duration-150 press-scale">{t("ui.back")}</button>
            <h2 className="text-sm font-semibold text-zinc-200">{t("ui.settingsTitle")}</h2>
          </div>
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SettingsPanel mobile setSettingsOpen={setSettingsOpen} exportData={exportData} importData={importData} />
          </div>
        </div>
      )}
    </div>
    </ToastProvider>
    <OnboardingTour />
    </>
  )
}
