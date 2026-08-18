"use client"

import { useState, useRef, useEffect, type CSSProperties } from "react"
import dynamic from "next/dynamic"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { LANG_FLAGS, LANG_NAMES } from "@/lib/utils"
import { LangPicker } from "@/components/LangPicker"
import { ToastProvider } from "@/components/Toast"
import { ProfileUnlock } from "@/components/ProfileUnlock"
import { HomeStatusStrip } from "@/components/HomeStatusStrip"
import { RefreshCw, Settings, Globe, HeartPulse, Sparkles, Copy, Download, User } from "lucide-react"

// Code-splitting: viste/modali pesanti caricate on-demand per ridurre il JS iniziale.
const SettingsPanel = dynamic(() => import("@/components/SettingsPanel").then((m) => m.SettingsPanel), { ssr: false })
const SearchView = dynamic(() => import("@/components/SearchView").then((m) => m.SearchView), { ssr: false })
const MyPostersView = dynamic(() => import("@/components/MyPostersView").then((m) => m.MyPostersView), { ssr: false })
const CataloghiView = dynamic(() => import("@/components/CataloghiView").then((m) => m.CataloghiView), { ssr: false })
const EditView = dynamic(() => import("@/components/EditView"), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-xs text-zinc-500 animate-pulse">…</div> })
const ProxyModal = dynamic(() => import("@/components/ProxyModal").then((m) => m.ProxyModal), { ssr: false })
const ProfileModal = dynamic(() => import("@/components/ProfileModal").then((m) => m.ProfileModal), { ssr: false })
const OnboardingTour = dynamic(() => import("@/components/OnboardingTour").then((m) => m.OnboardingTour), { ssr: false })

export function AppShell() {
  const setLangOpen = usePSelector((v) => v.setLangOpen)
  const setSettingsOpen = usePSelector((v) => v.setSettingsOpen)
  const accentColor = usePSelector((v) => v.accentColor)
  const profileId = usePSelector((v) => v.profileId)
  const settingsOpen = usePSelector((v) => v.settingsOpen)
  const serviceErrors = usePSelector((v) => v.serviceErrors)

  const showLangPicker = usePSelector((v) => v.showLangPicker)
  const copied = usePSelector((v) => v.copied)
  const copyUrl = usePSelector((v) => v.copyUrl)
  const urlPattern = usePSelector((v) => v.urlPattern)
  const view = usePSelector((v) => v.view)
  const router = usePSelector((v) => v.router)
  const profileLocked = usePSelector((v) => v.profileLocked)
  const profileModalSuppressed = usePSelector((v) => v.profileModalSuppressed)
  const mappings = usePSelector((v) => v.mappings)
  const selected = usePSelector((v) => v.selected)
  const tmdbKeyInput = usePSelector((v) => v.tmdbKeyInput)
  const setTmdbKeyInput = usePSelector((v) => v.setTmdbKeyInput)
  const setTmdbKey = usePSelector((v) => v.setTmdbKey)
  const exportData = usePSelector((v) => v.exportData)
  const importData = usePSelector((v) => v.importData)
  const mdblistApiKey = usePSelector((v) => v.mdblistApiKey)
  const setMdblistApiKey = usePSelector((v) => v.setMdblistApiKey)
  const goHome = usePSelector((v) => v.goHome)
  const refreshLists = usePSelector((v) => v.refreshLists)
  const langRef = usePSelector((v) => v.langRef)
  const langOpen = usePSelector((v) => v.langOpen)
  const { t, lang, pickLang } = useT()
  const [refreshing, setRefreshing] = useState(false)
  const [proxyOpen, setProxyOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
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

  useEffect(() => {
    const t = setTimeout(() => {
      // Con un profilo salvato (profileLocked) l'overlay di sblocco prende il
      // posto del modale di benvenuto. profileModalSuppressed: profilo stale o
      // rifiutato in questa sessione → niente "crea un profilo".
      if (!profileId && !profileLocked && !profileModalSuppressed) {
        setProfileModalOpen(true)
      }
    }, 100)
    return () => clearTimeout(t)
  }, [profileId, profileLocked, profileModalSuppressed])

  // Blocca lo scroll del body quando le impostazioni mobili sono aperte
  useEffect(() => {
    if (!settingsOpen) return
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    if (!isMobile) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [settingsOpen])

  // Toolbar mobile (azioni rapide): riga centrata sotto il logo nella home,
  // in testa all'editor — identica in entrambi i casi (invariata alla home)
  const mobileToolbar = (
    <div className="flex md:hidden items-center gap-2 flex-wrap justify-center">
      <button type="button" suppressHydrationWarning aria-label={copied ? t("ui.copied") : t("ui.copyUrl")} onClick={() => { copyUrl() }} disabled={!urlPattern} className="top-action-button top-action-button-primary h-9 w-9 flex items-center justify-center bg-accent-orange text-white border border-accent-orange/50 shadow-lg shadow-accent-orange/25 disabled:opacity-40"><Copy className="w-4 h-4" /></button>
      <button type="button" suppressHydrationWarning aria-label={t("ui.installCatalog")} onClick={async () => { const base = `${window.location.origin}/manifest.json`; const url = profileId ? `${window.location.origin}/u/${profileId}/manifest.json` : base; await navigator.clipboard.writeText(url) }} disabled={!urlPattern && !profileId} className="top-action-button h-9 w-9 flex items-center justify-center bg-white/[0.06] border border-white/10 text-muted hover:text-zinc-200"><Download className="w-4 h-4" /></button>
      <button type="button" aria-label={t("ui.saveProfile")} onClick={() => setProfileModalOpen(true)} className="top-action-button h-9 w-9 flex items-center justify-center bg-white/[0.06] border border-white/10 text-muted hover:text-zinc-200"><User className="w-4 h-4" /></button>
      <button type="button" aria-label={t("ui.addonProxy")} onClick={() => setProxyOpen(true)} className="top-action-button h-9 w-9 flex items-center justify-center bg-white/[0.06] border border-white/10 text-accent-orange"><Sparkles className="w-4 h-4" /></button>
      <button type="button" aria-label={t("ui.myPostersBtn")} onClick={() => { if (view === "myposters") { router.back() } else { router.replace("myposters") } }} className="top-action-button h-9 px-2 text-xs font-semibold bg-white/[0.06] border border-white/10 text-zinc-200">{mappings.length}</button>
      <button type="button" aria-label={t("ui.settings")} onClick={() => setSettingsOpen(true)} className="top-action-button h-9 w-9 flex items-center justify-center bg-white/[0.06] border border-white/10 text-zinc-200 press-scale"><Settings className="w-4 h-4" /></button>
    </div>
  )

  return (
    <>
    <ToastProvider>
    {profileLocked && <ProfileUnlock />}
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
        <div className="floating-group relative z-50">
          <button type="button" suppressHydrationWarning aria-label={copied ? t("ui.copied") : t("ui.copyUrl")} onClick={() => { copyUrl() }} disabled={!urlPattern} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 disabled:opacity-30 text-accent-orange hover:bg-white/[0.08] press-scale"><Copy className="w-4 h-4" /></button>
          <button type="button" suppressHydrationWarning aria-label={t("ui.installCatalog")} onClick={async () => { const base = `${window.location.origin}/manifest.json`; const url = profileId ? `${window.location.origin}/u/${profileId}/manifest.json` : base; await navigator.clipboard.writeText(url) }} disabled={!urlPattern && !profileId} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 disabled:opacity-30 text-zinc-300 hover:bg-white/[0.08] press-scale"><Download className="w-4 h-4" /></button>
          <button type="button" aria-label={t("ui.saveProfile")} onClick={() => setProfileModalOpen(true)} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-zinc-300 hover:bg-white/[0.08] press-scale"><User className="w-4 h-4" /></button>
          <button type="button" aria-label={t("ui.addonProxy")} onClick={() => setProxyOpen(true)} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-accent-orange hover:bg-white/[0.08] press-scale"><Sparkles className="w-4 h-4" /></button>
          <div className="h-5 w-px bg-white/10 self-center" />
          <button type="button" aria-label={t("ui.myPostersBtn")} onClick={() => { if (view === "myposters") { router.back() } else { router.replace("myposters") } }} className="h-9 w-9 flex items-center justify-center rounded-lg text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] active:scale-[0.93] transition-all duration-150 press-scale">{mappings.length}</button>
          <div className="relative">
            <button type="button" aria-label={t("ui.settings")} onClick={(e) => { e.stopPropagation(); setSettingsOpen((o) => !o) }} className={`h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-zinc-300 hover:bg-white/[0.08] press-scale ${settingsOpen ? "dropdown-open" : ""}`}><Settings className="w-4 h-4" /></button>
            <div className="hidden md:block">{settingsOpen && <SettingsPanel tmdbKeyInput={tmdbKeyInput} setTmdbKeyInput={setTmdbKeyInput} setTmdbKey={setTmdbKey} setSettingsOpen={setSettingsOpen} exportData={exportData} importData={importData} mdblistApiKey={mdblistApiKey} setMdblistApiKey={setMdblistApiKey} />}</div>
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
        <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
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
            <SettingsPanel mobile tmdbKeyInput={tmdbKeyInput} setTmdbKeyInput={setTmdbKeyInput} setTmdbKey={setTmdbKey} setSettingsOpen={setSettingsOpen} exportData={exportData} importData={importData} mdblistApiKey={mdblistApiKey} setMdblistApiKey={setMdblistApiKey} />
          </div>
        </div>
      )}
    </div>
    </ToastProvider>
    <OnboardingTour />
    </>
  )
}
