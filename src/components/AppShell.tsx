"use client"

import { useP } from "@/lib/context"
import { LANG_FLAGS, LANG_NAMES } from "@/lib/utils"
import { LangPicker } from "@/components/LangPicker"
import { SettingsPanel } from "@/components/SettingsPanel"
import { SearchView } from "@/components/SearchView"
import { MyPostersView } from "@/components/MyPostersView"
import EditView from "@/components/EditView"
import type { SearchResult } from "@/lib/types"

export function AppShell() {
  const p = useP()

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {p.previewPoster && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${p.posterUrl(p.previewPoster.file_path, "original")})`,
            filter: "blur(80px)",
            opacity: 0.15,
          }}
        />
      )}
      {p.showLangPicker && <LangPicker onPick={p.pickLang} />}
      <div className="max-w-full px-4 pt-5 md:pt-3 pb-20 md:pb-3">
        <div className="hidden md:flex justify-end items-center gap-2 mb-4">
          <button onClick={(e) => { p.copyUrl() }} disabled={!p.urlPattern} className="h-10 px-4 bg-accent-orange hover:bg-accent-orange/90 active:scale-95 transition-all duration-150 text-sm font-semibold text-white rounded-xl shadow-lg shadow-accent-orange/25 disabled:opacity-40 disabled:shadow-none">{p.copied ? "✅ Copiato!" : "🔗 AIOmetadata URL"}</button>
          <button onClick={() => { if (p.view === "myposters") { history.back() } else { window.history.pushState({ view: p.view }, ""); p.setView("myposters") } }} className="h-10 px-3 bg-transparent border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 text-sm font-medium rounded-xl text-zinc-300">📋 I miei poster ({p.mappings.length})</button>
          <div className="relative" ref={p.settingsRef}>
            <button onClick={(e) => { e.stopPropagation(); p.setSettingsOpen((o) => !o) }} className="h-10 px-3 bg-transparent border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 text-sm flex items-center gap-1.5 rounded-xl text-zinc-300">⚙️ Impostazioni</button>
            <div className="hidden md:block">{p.settingsOpen && <SettingsPanel showKey={p.showKey} tmdbKeyInput={p.tmdbKeyInput} setTmdbKeyInput={p.setTmdbKeyInput} setTmdbKey={p.setTmdbKey} setShowKey={p.setShowKey} setSettingsOpen={p.setSettingsOpen} exportData={p.exportData} importData={p.importData} />}</div>
          </div>
        </div>
        <div className="flex flex-col items-center pb-4 animate-fade-scale-in relative">
          <img onClick={p.goHome} src="/posterium.svg" alt="Posterium" className="h-16 md:h-20 w-auto mb-5 md:mb-4 cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150" />
          <div className="flex md:hidden items-center gap-2 flex-wrap justify-center">
            <button onClick={(e) => { p.copyUrl() }} disabled={!p.urlPattern} className="h-9 px-3 bg-accent-orange hover:bg-accent-orange/90 active:scale-95 transition-all duration-150 text-[11px] font-semibold text-white rounded-xl shadow-lg shadow-accent-orange/25 disabled:opacity-40 disabled:shadow-none">{p.copied ? "✅ Copiato!" : "🔗 AIOmetadata URL"}</button>
            <button onClick={() => { if (p.view === "myposters") { history.back() } else { window.history.pushState({ view: p.view }, ""); p.setView("myposters") } }} className="h-9 px-3 bg-transparent border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 text-xs font-medium rounded-xl text-zinc-300">📋 I miei poster ({p.mappings.length})</button>
            <button onClick={() => p.setSettingsOpen(true)} className="md:hidden h-8 w-8 flex items-center justify-center bg-transparent border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-150 text-sm rounded-xl text-zinc-300">⚙️</button>
          </div>
        </div>
        <div key={p.view} className="animate-fade-scale-in">
          {p.view === "search" ? <SearchView /> : p.view === "myposters" ? <MyPostersView /> : <EditView />}
        </div>
      </div>

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
      <div ref={p.toastRef} className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-accent-orange text-white px-4 py-2 rounded-lg text-sm font-medium z-[60] shadow-lg shadow-accent-orange/30 transition-all duration-300 opacity-0 pointer-events-none"></div>

      {p.settingsOpen && (
        <div className="fixed inset-0 z-[70] bg-background md:hidden animate-fade-scale-in overflow-y-auto">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
            <button onClick={() => p.setSettingsOpen(false)} className="text-sm text-zinc-300 hover:text-white active:scale-90 transition-all duration-150">← Indietro</button>
            <h2 className="text-sm font-semibold text-zinc-200">⚙️ Impostazioni</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 font-medium">Chiave TMDB personale</label>
              <div className="flex gap-1">
                <input type={p.showKey ? "text" : "password"} value={p.tmdbKeyInput} onChange={(e) => p.setTmdbKeyInput(e.target.value)} onBlur={() => p.setTmdbKey(p.tmdbKeyInput)} onKeyDown={(e) => { if (e.key === "Enter") { p.setTmdbKey(p.tmdbKeyInput); p.setSettingsOpen(false) } }} placeholder="Inserisci la tua chiave" className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-600" />
                <button onClick={(e) => { e.stopPropagation(); p.setShowKey((s) => !s) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{p.showKey ? "🙈" : "👁️"}</button>
              </div>
            </div>
            <button onClick={() => { p.exportData(); p.setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150">Esporta JSON</button>
            <button onClick={() => { p.importData(); p.setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150">Importa JSON</button>
          </div>
        </div>
      )}
    </div>
  )
}
