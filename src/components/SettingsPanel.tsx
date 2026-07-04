"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useP } from "@/lib/context"
import { ApiError, http } from "@/lib/http"
import { saveDefaults } from "@/lib/save-defaults"
import { SliderRow } from "@/components/SliderRow"
import { BadgeStyleSelector, SecretInput, MenuItem } from "@/components/ui"
import { Star, Trophy, Palette, Ruler, Cloud, Minus, Circle, RotateCcw, Save, Check, Upload, Download, Clipboard, Trash2, Key } from "lucide-react"

interface Props {
  tmdbKeyInput: string
  setTmdbKeyInput: (v: string) => void
  setTmdbKey: (v: string) => void
  setSettingsOpen: (v: boolean) => void
  exportData: () => void
  importData: () => void
  mdblistApiKey: string
  setMdblistApiKey: (v: string) => void
  mobile?: boolean
}

export function SettingsPanel({ tmdbKeyInput, setTmdbKeyInput, setTmdbKey, setSettingsOpen, exportData, importData, mdblistApiKey, setMdblistApiKey, mobile }: Props) {
  const p = useP()
  const [editVal, setEditVal] = useState<string | null>(null)
  const [editTxt, setEditTxt] = useState("")
  const [saved, setSaved] = useState(false)
  const [clearStatus, setClearStatus] = useState<"idle" | "clearing" | "cleared">("idle")

  const clearCache = async () => {
    setClearStatus("clearing")
    try {
      await http<{ ok: boolean }>("/api/cache/clear", { method: "POST", retries: 0 })
      setClearStatus("cleared")
      toast.success(p.t("ui.cleared"))
      setTimeout(() => setClearStatus("idle"), 1500)
    } catch (error) {
      setClearStatus("idle")
      const message = error instanceof ApiError && error.status === 401
        ? p.t("ui.clearCacheUnauthorized")
        : p.t("ui.clearCacheError")
      toast.error(message)
    }
  }

  const content = (
    <>
      <SecretInput label={p.t("ui.tmdbKey")} icon={<Key />} value={tmdbKeyInput} onChange={setTmdbKeyInput} onBlur={() => setTmdbKey(tmdbKeyInput)} onKeyDown={(e) => { if (e.key === "Enter") { setTmdbKey(tmdbKeyInput); setSettingsOpen(false) } }} placeholder={p.t("ui.tmdbKeyPlaceholder")} />
      <SecretInput label={p.t("ui.mdblistKey")} icon={<Clipboard />} value={mdblistApiKey} onChange={(v) => { setMdblistApiKey(v); localStorage.setItem("mdblist_key", v) }} placeholder={p.t("ui.mdblistKeyPlaceholder")} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Star className="w-3 h-3" /> {p.t("ui.genreRatingBadge")}</span>
        <button type="button" onClick={() => p.setDefaultGlobalBadges(!p.defaultGlobalBadges)} role="switch" aria-checked={p.defaultGlobalBadges} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${p.defaultGlobalBadges ? "bg-accent-orange" : "bg-zinc-600"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${p.defaultGlobalBadges ? "translate-x-5" : "translate-x-0"}`} /></button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Trophy className="w-3 h-3" /> {p.t("ui.trendBadge")}</span>
        <button type="button" onClick={() => p.setDefaultRankingBadges(!p.defaultRankingBadges)} role="switch" aria-checked={p.defaultRankingBadges} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${p.defaultRankingBadges ? "bg-accent-orange" : "bg-zinc-600"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${p.defaultRankingBadges ? "translate-x-5" : "translate-x-0"}`} /></button>
      </div>
      <hr className="border-zinc-700 my-1" />
      <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Palette className="w-3 h-3" /> {p.t("ui.styleDefault")}</label>
      <BadgeStyleSelector value={p.defaultBadgeStyle} options={["shadow", "pill", "bar", "colored"]} onChange={p.setDefaultBadgeStyle} t={p.t} />
      <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-1"><Circle className="w-3 h-3" /> {p.t("ui.styleRankingDefault")}</label>
      <BadgeStyleSelector value={p.defaultRankingBadgeStyle} options={["default", "bar", "colored"]} onChange={p.setDefaultRankingBadgeStyle} t={p.t} accentColor={p.accentColor} />
      <hr className="border-zinc-700 my-1" />
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-zinc-400">{p.t("ui.blurDefault")}</span>
        <button type="button" onClick={() => p.setDefaultBlurEnabled(!p.defaultBlurEnabled)} role="switch" aria-checked={p.defaultBlurEnabled} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${p.defaultBlurEnabled ? "bg-accent-orange" : "bg-zinc-600"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${p.defaultBlurEnabled ? "translate-x-5" : "translate-x-0"}`} /></button>
      </div>
      {p.defaultBlurEnabled && <>
        <SliderRow icon={<Ruler className="w-3.5 h-3.5" />} label={p.t("ui.height")} value={p.defaultGradientHeight} min={5} max={100} boundsMin={5} boundsMax={100} onChange={(v) => p.setDefaultGradientHeight(v)} onDoubleClick={() => p.setDefaultGradientHeight(30)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="gh" suffix="%" />
        <SliderRow icon={<Cloud className="w-3.5 h-3.5" />} label={p.t("ui.intensity")} value={p.defaultBlurIntensity} min={1} max={50} boundsMin={1} boundsMax={50} onChange={(v) => p.setDefaultBlurIntensity(v)} onDoubleClick={() => p.setDefaultBlurIntensity(5)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bi" suffix="px" />
        <SliderRow icon={<Minus className="w-3.5 h-3.5" />} label={p.t("ui.fade")} value={p.defaultBlurFade} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => p.setDefaultBlurFade(v)} onDoubleClick={() => p.setDefaultBlurFade(60)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bf" suffix="%" />
        <SliderRow icon={<Circle className="w-3.5 h-3.5" />} label={p.t("ui.darkness")} value={p.defaultBlurDarkness} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => p.setDefaultBlurDarkness(v)} onDoubleClick={() => p.setDefaultBlurDarkness(40)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bd" suffix="%" />
      </>}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> {p.t("ui.autoRotateDefault")}</span>
        <button type="button" onClick={() => p.setDefaultAutoRotateClean(!p.defaultAutoRotateClean)} role="switch" aria-checked={p.defaultAutoRotateClean} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${p.defaultAutoRotateClean ? "bg-accent-orange" : "bg-zinc-600"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${p.defaultAutoRotateClean ? "translate-x-5" : "translate-x-0"}`} /></button>
      </div>
      <hr className="border-zinc-700 my-1" />
      <button type="button" onClick={() => { saveDefaults(p); setSaved(true); setTimeout(() => setSaved(false), 1500) }} className="w-full text-center text-xs font-semibold py-2 rounded-lg bg-accent-orange/90 text-white hover:bg-accent-orange active:scale-[0.98] transition-all duration-150"><span className="flex items-center gap-1.5 justify-center">{saved ? <><Check className="w-3 h-3" /> {p.t("ui.saved")}</> : <><Save className="w-3 h-3" /> {p.t("ui.saveDefaults")}</>}</span></button>
      <hr className="border-zinc-700 my-1" />
      <MenuItem icon={<Upload className="w-3 h-3" />} label={p.t("ui.exportJson")} onClick={() => { exportData(); setSettingsOpen(false) }} />
      <MenuItem icon={<Download className="w-3 h-3" />} label={p.t("ui.importJson")} onClick={() => { importData(); setSettingsOpen(false) }} />
      <MenuItem icon={<Trash2 className="w-3 h-3" />} label={clearStatus === "cleared" ? p.t("ui.cleared") : p.t("ui.clearCache")} onClick={clearCache} danger />
    </>
  )

  if (mobile) {
    return <div className="space-y-3">{content}</div>
  }

  return (
    <div className="absolute right-0 top-full mt-2 bg-black/60 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-3 shadow-2xl shadow-black/50 z-50 min-w-56 max-h-[80vh] overflow-y-auto flex flex-col gap-2 animate-fade-scale-in" onClick={(e) => e.stopPropagation()}>
      {content}
    </div>
  )
}
