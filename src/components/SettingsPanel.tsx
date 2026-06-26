"use client"

import { useState } from "react"
import { useP } from "@/lib/context"
import { SliderRow } from "@/components/SliderRow"
import { Star, Trophy, Palette, Moon, Pill, Square, BarChart3, Ruler, Cloud, Minus, Circle, Save, Check, XCircle, Upload, Download, Eye, EyeOff, Key, Clipboard } from "lucide-react"

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
    rankingBadgeStyle: p.defaultRankingBadgeStyle,
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
  const [editVal, setEditVal] = useState<string | null>(null)
  const [editTxt, setEditTxt] = useState("")
  const [saved, setSaved] = useState(false)
  return (
    <div className="absolute right-0 top-full mt-2 bg-black/60 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-3 shadow-2xl shadow-black/50 z-50 min-w-56 flex flex-col gap-2 animate-fade-scale-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Key className="w-3 h-3" />{p.t("ui.tmdbKey")}</label>
        <div className="flex gap-1">
          <input type={showKey ? "text" : "password"} value={tmdbKeyInput} onChange={(e) => setTmdbKeyInput(e.target.value)} onBlur={() => setTmdbKey(tmdbKeyInput)} onKeyDown={(e) => { if (e.key === "Enter") { setTmdbKey(tmdbKeyInput); setSettingsOpen(false) } }} placeholder={p.t("ui.tmdbKeyPlaceholder")} className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500" />
          <button onClick={(e) => { e.stopPropagation(); setShowKey((s) => !s) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Clipboard className="w-3 h-3" />{p.t("ui.mdblistKey")}</label>
        <div className="flex gap-1">
          <input type={showMdb ? "text" : "password"} value={mdblistApiKey} onChange={(e) => { setMdblistApiKey(e.target.value); localStorage.setItem("mdblist_key", e.target.value) }} placeholder={p.t("ui.mdblistKeyPlaceholder")} className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500" />
          <button onClick={(e) => { e.stopPropagation(); setShowMdb(!showMdb) }} className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150">{showMdb ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
      </div>
      <hr className="border-zinc-700 my-1" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Star className="w-3 h-3" /> Badge genere/rating</span>
        <button onClick={() => p.setDefaultGlobalBadges(!p.defaultGlobalBadges)} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultGlobalBadges ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultGlobalBadges ? <><Check className="w-3 h-3" /> ON</> : <><XCircle className="w-3 h-3" /> OFF</>}</button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Trophy className="w-3 h-3" /> Badge ranking/extra</span>
        <button onClick={() => p.setDefaultRankingBadges(!p.defaultRankingBadges)} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultRankingBadges ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultRankingBadges ? <><Check className="w-3 h-3" /> ON</> : <><XCircle className="w-3 h-3" /> OFF</>}</button>
      </div>
      <hr className="border-zinc-700 my-1" />
      <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Palette className="w-3 h-3" /> Stile badge predefinito</label>
      <div className="flex gap-1">
        {(["shadow","pill","outline","bar","colored","glass"] as const).map(s => (
          <button key={s} onClick={() => p.setDefaultBadgeStyle(s)} className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 ${p.defaultBadgeStyle === s ? "bg-white/20 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}><span className="flex items-center gap-1 justify-center">{s === "shadow" ? <><Moon className="w-3 h-3" /> Ombra</> : s === "pill" ? <><Pill className="w-3 h-3" /> Pill</> : s === "outline" ? <><Square className="w-3 h-3" /> Outline</> : s === "bar" ? <><BarChart3 className="w-3 h-3" /> Barra</> : s === "colored" ? <><Circle className="w-3 h-3" /> Colore</> : <><Minus className="w-3 h-3" /> Vetro</>}</span></button>
        ))}
      </div>
      <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-1"><BarChart3 className="w-3 h-3" /> Stile badge ranking predefinito</label>
      <div className="flex gap-1">
        {(["default","bar","glass","colored"] as const).map(s => (
          <button key={s} onClick={() => p.setDefaultRankingBadgeStyle(s)} className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 ${p.defaultRankingBadgeStyle === s ? "bg-white/20 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"}`}><span className="flex items-center gap-1 justify-center">{s === "default" ? <><Circle className="w-3 h-3" /> Default</> : s === "bar" ? <><BarChart3 className="w-3 h-3" /> Barra</> : s === "glass" ? <><Minus className="w-3 h-3" /> Vetro</> : <><Circle className="w-3 h-3" /> Colore</>}</span></button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-zinc-400">Sfocatura predefinita</span>
        <button onClick={() => p.setDefaultBlurEnabled(!p.defaultBlurEnabled)} className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.defaultBlurEnabled ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400"}`}>{p.defaultBlurEnabled ? <><Check className="w-3 h-3" /> Attiva</> : <><XCircle className="w-3 h-3" /> Disattivata</>}</button>
      </div>
      {p.defaultBlurEnabled && <>
        <SliderRow icon={<Ruler className="w-3.5 h-3.5" />} label="Altezza" value={p.defaultGradientHeight} min={5} max={100} boundsMin={5} boundsMax={100} onChange={(v) => p.setDefaultGradientHeight(v)} onDoubleClick={() => p.setDefaultGradientHeight(30)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="gh" suffix="%" />
        <SliderRow icon={<Cloud className="w-3.5 h-3.5" />} label="Intensità" value={p.defaultBlurIntensity} min={1} max={50} boundsMin={1} boundsMax={50} onChange={(v) => p.setDefaultBlurIntensity(v)} onDoubleClick={() => p.setDefaultBlurIntensity(5)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bi" suffix="px" />
        <SliderRow icon={<Minus className="w-3.5 h-3.5" />} label="Fade" value={p.defaultBlurFade} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => p.setDefaultBlurFade(v)} onDoubleClick={() => p.setDefaultBlurFade(60)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bf" suffix="%" />
        <SliderRow icon={<Circle className="w-3.5 h-3.5" />} label="Velatura" value={p.defaultBlurDarkness} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => p.setDefaultBlurDarkness(v)} onDoubleClick={() => p.setDefaultBlurDarkness(40)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bd" suffix="%" />
      </>}
      <hr className="border-zinc-700 my-1" />
      <button onClick={() => { saveDefaults(p); setSaved(true); setTimeout(() => setSaved(false), 1500) }} className="w-full text-center text-xs font-semibold py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 active:scale-[0.98] transition-all duration-150"><span className="flex items-center gap-1.5 justify-center">{saved ? <><Check className="w-3 h-3" /> Salvato!</> : <><Save className="w-3 h-3" /> Salva come predefiniti</>}</span></button>
      <hr className="border-zinc-700 my-1" />
      <button onClick={(e) => { exportData(); setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150"><span className="flex items-center gap-1.5"><Upload className="w-3 h-3" />{p.t("ui.exportJson")}</span></button>
      <button onClick={(e) => { importData(); setSettingsOpen(false) }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150"><span className="flex items-center gap-1.5"><Download className="w-3 h-3" />{p.t("ui.importJson")}</span></button>
    </div>
  )
}
