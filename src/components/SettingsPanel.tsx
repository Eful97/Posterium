"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useP } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { ApiError, http } from "@/lib/http"
import { saveDefaults } from "@/lib/save-defaults"
import { SliderRow } from "@/components/SliderRow"
import { Toggle } from "@/components/Toggle"
import { BadgeStyleSelector, SecretInput, MenuItem } from "@/components/ui"
import { Star, Trophy, Palette, Ruler, Cloud, Minus, Circle, RotateCcw, Save, Check, Upload, Download, Clipboard, Trash2, Key, Sparkles, Tv, Flame } from "lucide-react"
import { BADGE_FONTS } from "@/lib/badge-fonts"

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
  const { t } = useT()
  const ed = usePosterEditor()
  const [editVal, setEditVal] = useState<string | null>(null)
  const [editTxt, setEditTxt] = useState("")
  const [saved, setSaved] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const [clearStatus, setClearStatus] = useState<"idle" | "clearing" | "cleared">("idle")
  const [tmdbKeyError, setTmdbKeyError] = useState<string | undefined>(undefined)
  const [mdblistKeyError, setMdblistKeyError] = useState<string | undefined>(undefined)
  const [cacheCount, setCacheCount] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/cache/status").then(r => r.ok ? r.json() : null).then(data => {
      if (data && typeof data.totalEntries === "number") setCacheCount(data.totalEntries)
    }).catch(() => null)
  }, [])

  useEffect(() => {
    if (!mobile) return
    const panel = settingsRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll<HTMLElement>('button, input, select, [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener("keydown", handleTab)
    first?.focus()
    return () => panel.removeEventListener("keydown", handleTab)
  }, [mobile])

  const clearCache = async () => {
    setClearStatus("clearing")
    try {
      await http<{ ok: boolean }>("/api/cache/clear", { method: "POST", retries: 0 })
      setClearStatus("cleared")
      toast.success(t("ui.cleared"))
      setTimeout(() => setClearStatus("idle"), 1500)
    } catch (error) {
      setClearStatus("idle")
      const message = error instanceof ApiError && error.status === 401
        ? t("ui.clearCacheUnauthorized")
        : t("ui.clearCacheError")
      toast.error(message)
    }
  }

  const content = (
    <>
      <SecretInput label={t("ui.tmdbKey")} icon={<Key />} value={tmdbKeyInput} onChange={setTmdbKeyInput} onBlur={() => { setTmdbKey(tmdbKeyInput); if (tmdbKeyInput.length < 20) { setTmdbKeyError("La chiave deve essere lunga almeno 20 caratteri"); } else { setTmdbKeyError(undefined) } }} onKeyDown={(e) => { if (e.key === "Enter") { setTmdbKey(tmdbKeyInput); setSettingsOpen(false) } }} placeholder={t("ui.tmdbKeyPlaceholder")} error={tmdbKeyError} />
      <SecretInput label={t("ui.mdblistKey")} icon={<Clipboard />} value={mdblistApiKey} onChange={(v) => { setMdblistApiKey(v); try { localStorage.setItem("mdblist_key", v) } catch {} }} onBlur={() => { if (mdblistApiKey.length > 0 && mdblistApiKey.length < 20) { setMdblistKeyError("La chiave deve essere lunga almeno 20 caratteri"); } else { setMdblistKeyError(undefined) } }} placeholder={t("ui.mdblistKeyPlaceholder")} error={mdblistKeyError} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Star className="w-3 h-3" /> {t("ui.genreRatingBadge")}</span>
        <Toggle value={ed.defaultGlobalBadges} onChange={ed.setDefaultGlobalBadges} />
      </div>
      <div className="pl-4 space-y-1 border-l border-zinc-800/60 ml-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">{t("ui.badgeGenre")}</span>
          <Toggle value={ed.defaultBadgeGenre} onChange={ed.setDefaultBadgeGenre} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">{t("ui.badgeYear")}</span>
          <Toggle value={ed.defaultBadgeYear} onChange={ed.setDefaultBadgeYear} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">{t("ui.badgeRating")}</span>
          <Toggle value={ed.defaultBadgeRating} onChange={ed.setDefaultBadgeRating} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Trophy className="w-3 h-3" /> {t("ui.trendBadge")}</span>
        <Toggle value={ed.defaultRankingBadges} onChange={ed.setDefaultRankingBadges} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Tv className="w-3 h-3" /> Logo Network</span>
        <Toggle value={ed.defaultNetworkLogo} onChange={(v) => { ed.setDefaultNetworkLogo(v); ed.setNetworkLogo(v) }} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5 shrink-0"><Flame className="w-3 h-3" /> Posizione badge</span>
        <div className="flex gap-1 flex-1 max-w-[160px]">
          <button
            type="button"
            onClick={() => { ed.setDefaultRibbonSide("left"); ed.setRibbonSide("left") }}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
              ed.defaultRibbonSide === "left"
                ? "bg-white/20 text-white shadow-sm"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >Nuvio</button>
          <button
            type="button"
            onClick={() => { ed.setDefaultRibbonSide("right"); ed.setRibbonSide("right") }}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
              ed.defaultRibbonSide === "right"
                ? "bg-white/20 text-white shadow-sm"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >Stremio</button>
        </div>
      </div>
      <hr className="border-zinc-700 my-1" />
      <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5"><Circle className="w-3 h-3" /> {t("ui.styleRankingDefault")}</label>
      <BadgeStyleSelector value={ed.defaultRankingBadgeStyle} options={["default", "bar", "colored", "pill"]} onChange={ed.setDefaultRankingBadgeStyle} t={t} accentColor={p.accentColor} />
      <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-1"><Palette className="w-3 h-3" /> {t("ui.styleDefault")}</label>
      <BadgeStyleSelector value={ed.defaultBadgeStyle} options={["shadow", "pill", "bar", "colored", "bordo", "vetro"]} onChange={ed.setDefaultBadgeStyle} t={t} />
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="text-xs text-zinc-400 shrink-0"><Palette className="w-3 h-3" /> Font</span>
        <select
          value={ed.defaultBadgeFont}
          onChange={(e) => ed.setDefaultBadgeFont(e.target.value)}
          className="editor-input flex-1 text-right px-1.5 py-1 cursor-pointer"
          aria-label="Default badge font"
        >
          {BADGE_FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>
      <hr className="border-zinc-700 my-1" />
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-zinc-400">{t("ui.blurDefault")}</span>
        <Toggle value={ed.defaultBlurEnabled} onChange={ed.setDefaultBlurEnabled} />
      </div>
      {ed.defaultBlurEnabled && <>
        <SliderRow icon={<Ruler className="w-3.5 h-3.5" />} label={t("ui.height")} value={ed.defaultGradientHeight} min={5} max={100} boundsMin={5} boundsMax={100} onChange={(v) => ed.setDefaultGradientHeight(v)} onDoubleClick={() => ed.setDefaultGradientHeight(30)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="gh" suffix="%" />
        <SliderRow icon={<Cloud className="w-3.5 h-3.5" />} label={t("ui.intensity")} value={ed.defaultBlurIntensity} min={1} max={50} boundsMin={1} boundsMax={50} onChange={(v) => ed.setDefaultBlurIntensity(v)} onDoubleClick={() => ed.setDefaultBlurIntensity(5)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bi" suffix="px" />
        <SliderRow icon={<Minus className="w-3.5 h-3.5" />} label={t("ui.fade")} value={ed.defaultBlurFade} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => ed.setDefaultBlurFade(v)} onDoubleClick={() => ed.setDefaultBlurFade(60)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bf" suffix="%" />
        <SliderRow icon={<Circle className="w-3.5 h-3.5" />} label={t("ui.darkness")} value={ed.defaultBlurDarkness} min={0} max={100} boundsMin={0} boundsMax={100} onChange={(v) => ed.setDefaultBlurDarkness(v)} onDoubleClick={() => ed.setDefaultBlurDarkness(40)} editingValue={editVal} editText={editTxt} setEditingValue={setEditVal} setEditText={setEditTxt} editingKey="bd" suffix="%" />
      </>}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> {t("ui.autoRotateDefault")}</span>
        <Toggle value={ed.defaultAutoRotateClean} onChange={ed.setDefaultAutoRotateClean} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Palette className="w-3 h-3" /> Tinta UI dinamica</span>
        <Toggle value={p.uiAccent} onChange={p.setUiAccent} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> {t("ui.logoFitEnabled")}</span>
        <Toggle value={ed.defaultLogoFitEnabled} onChange={ed.setDefaultLogoFitEnabled} />
      </div>
      <hr className="border-zinc-700 my-1" />

      <button type="button" onClick={() => { saveDefaults(p, ed); setSaved(true); setTimeout(() => setSaved(false), 1500) }} className="w-full text-center text-xs font-semibold py-2 rounded-lg bg-accent-orange/90 text-white hover:bg-accent-orange active:scale-[0.98] transition-all duration-150"><span className="flex items-center gap-1.5 justify-center">{saved ? <><Check className="w-3 h-3" /> {t("ui.saved")}</> : <><Save className="w-3 h-3" /> {t("ui.saveDefaults")}</>}</span></button>
      <hr className="border-zinc-700 my-1" />
      <MenuItem icon={<Download className="w-3 h-3 text-accent-orange" />} label={t("ui.exportJson")} onClick={() => { exportData(); setSettingsOpen(false) }} />
      <MenuItem icon={<Upload className="w-3 h-3 text-blue-400" />} label={t("ui.importJson")} onClick={() => { importData(); setSettingsOpen(false) }} />
      <div className="pt-2 border-t border-zinc-800 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 px-1">
          <span className="flex items-center gap-1.5"><Flame className="w-3 h-3 text-amber-400" /> Diagnostica & Cache</span>
          <span className="text-zinc-500 text-[10px] font-mono">{cacheCount !== null ? `${cacheCount} item` : "1-Click"}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={async () => {
            try {
              toast.info("Ripopolamento cache cataloghi avviato...")
              await http<{ ok: boolean }>("/api/warmup", { method: "POST", retries: 0 })
              toast.success("Cache cataloghi aggiornata con successo!")
            } catch {
              toast.error("Impossibile avviare il warmup")
            }
          }} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-[0.98] transition-all"><Flame className="w-3 h-3" /> Warmup</button>
          <button type="button" onClick={clearCache} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:scale-[0.98] transition-all"><Trash2 className="w-3 h-3" />{clearStatus === "cleared" ? t("ui.cleared") : t("ui.clearCache")}</button>
        </div>
      </div>
    </>
  )

  if (mobile) {
    return <div ref={settingsRef} className="space-y-3">{content}</div>
  }

  return (
    <div className="absolute right-0 top-full mt-2 bg-black/85 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-3 shadow-2xl shadow-black/50 z-50 min-w-56 max-h-[80vh] overflow-y-auto flex flex-col gap-2 animate-fade-scale-in" onClick={(e) => e.stopPropagation()}>
      {content}
    </div>
  )
}
