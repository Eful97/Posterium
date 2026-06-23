"use client"

import { useState } from "react"
import { useP } from "@/lib/context"

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

export function SettingsPanel({ showKey, tmdbKeyInput, setTmdbKeyInput, setTmdbKey, setShowKey, setSettingsOpen, exportData, importData, mdblistApiKey, setMdblistApiKey }: Props) {
  const p = useP()
  const [showMdb, setShowMdb] = useState(false)
  return (
    <div className="absolute right-0 top-full mt-2 bg-black/60 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-3 shadow-2xl shadow-black/50 z-50 min-w-56 flex flex-col gap-2 animate-fade-scale-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400 font-medium">{p.t("ui.tmdbKey")}</label>
        <div className="flex gap-1">
          <input type={showKey ? "text" : "password"} value={tmdbKeyInput} onChange={(e) => setTmdbKeyInput(e.target.value)} onBlur={() => setTmdbKey(tmdbKeyInput)} onKeyDown={(e) => { if (e.key === "Enter") { setTmdbKey(tmdbKeyInput); setSettingsOpen(false) } }} placeholder={p.t("ui.tmdbKeyPlaceholder")} className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500" />
          <button onClick={(e) => { e.stopPropagation(); setShowKey((s) => !s) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{showKey ? "🙈" : "👁️"}</button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400 font-medium">{p.t("ui.mdblistKey")}</label>
        <div className="flex gap-1">
          <input type={showMdb ? "text" : "password"} defaultValue={mdblistApiKey} onChange={(e) => { setMdblistApiKey(e.target.value); localStorage.setItem("mdblist_key", e.target.value) }} placeholder={p.t("ui.mdblistKeyPlaceholder")} className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500" />
          <button onClick={(e) => { e.stopPropagation(); setShowMdb(!showMdb) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{showMdb ? "🙈" : "👁️"}</button>
        </div>
      </div>
      <button onClick={(e) => { exportData(); setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150">{p.t("ui.exportJson")}</button>
      <button onClick={(e) => { importData(); setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150">{p.t("ui.importJson")}</button>
    </div>
  )
}
