"use client"

import { Search, ArrowLeftRight, ArrowUpDown } from "lucide-react"
import { useP } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { SliderRow } from "@/components/SliderRow"

export function TransformControls() {
  const p = useP()
  const { t } = useT()
  const ed = usePosterEditor()

  const defaultLogoScale = () => {
    const l = p.selectedLogo
    if (!l || !l.width || !l.height) { ed.setLogoScale(75); return }
    const lw = l.width
    const lh = l.height
    const maxH = Math.round(1500 * 0.25)
    const effW = Math.round(maxH * lw / lh)
    ed.setLogoScale(Math.min(Math.round(effW / 1000 * 100), 75))
  }

  return (
    <>
      <div className="control-row flex items-center justify-between mb-2 px-1">
        <h4 className="control-label">{t("ui.transform")}</h4>
        <button aria-label={t("ui.reset")}
                onClick={() => { defaultLogoScale(); ed.setLogoOffsetX(0); ed.setLogoOffsetY(0) }}
                className="text-xs text-zinc-400 hover:text-accent transition-colors px-2 py-0.5 rounded-md border border-zinc-700/50 hover:border-accent/30">
          {t("ui.reset")}
        </button>
      </div>
      <div className="space-y-2">
        <SliderRow icon={<Search className="w-3.5 h-3.5" />} label={t("ui.scale")} value={ed.logoScale} min={10} max={100} boundsMin={10} boundsMax={100} onChange={ed.setLogoScale} onDoubleClick={defaultLogoScale} editingValue={ed.editingValue} editText={ed.editText} setEditingValue={ed.setEditingValue} setEditText={ed.setEditText} editingKey="scale" />
        <SliderRow icon={<ArrowLeftRight className="w-3.5 h-3.5" />} label="X" value={ed.logoOffsetX} min={p.logoBounds.minX} max={p.logoBounds.maxX} boundsMin={p.logoBounds.minX} boundsMax={p.logoBounds.maxX} onChange={ed.setLogoOffsetX} onDoubleClick={() => ed.setLogoOffsetX(0)} editingValue={ed.editingValue} editText={ed.editText} setEditingValue={ed.setEditingValue} setEditText={ed.setEditText} editingKey="ox" />
        <SliderRow icon={<ArrowUpDown className="w-3.5 h-3.5" />} label="Y" value={ed.logoOffsetY} min={p.logoBounds.minY} max={p.logoBounds.maxY} boundsMin={p.logoBounds.minY} boundsMax={p.logoBounds.maxY} onChange={ed.setLogoOffsetY} onDoubleClick={() => ed.setLogoOffsetY(0)} editingValue={ed.editingValue} editText={ed.editText} setEditingValue={ed.setEditingValue} setEditText={ed.setEditText} editingKey="oy" />
      </div>
    </>
  )
}