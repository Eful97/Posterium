"use client"

import type { TMDBImage } from "@/lib/types"
import { LANG_NAMES, groupBy, limitBest, posterUrl } from "@/lib/utils"
import { useP } from "@/lib/context"
import { Plus, Check, Trash2 } from "lucide-react"

interface Props {
  logos: TMDBImage[]
  selectedLogo: TMDBImage | null
  lang: string
  selectLogo: (img: TMDBImage) => void
  removeLogo: () => void
  disabled?: boolean
}

export function LogoOptions({ logos, selectedLogo, lang, selectLogo, removeLogo, disabled }: Props) {
  const p = useP()
  if (logos.length === 0) return (
    <div className="grid grid-cols-2 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 flex items-center justify-center">
          <Plus className="w-4 h-4 text-zinc-600" />
        </div>
      ))}
    </div>
  )
  return (
    <div>
      {Object.entries(groupBy(logos, (img) => img.iso_639_1 || "xx")).sort(([a], [b]) => {
        if (a === lang) return -1; if (b === lang) return 1
        if (a === "en") return -1; if (b === "en") return 1
        return a.localeCompare(b)
      }).map(([language, imgs]) => {
        const best = limitBest(imgs)
        if (best.length === 0) return null
        return (
          <div key={language} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-zinc-700/40" />
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider shrink-0">{LANG_NAMES[language] || language} {best.length < imgs.length ? `• ${best.length}` : ""}</h4>
              <div className="h-px flex-1 bg-zinc-700/40" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {best.map((img, i) => {
                const isActive = selectedLogo?.file_path === img.file_path
                return (
                  <button key={img.file_path} disabled={disabled} onClick={() => selectLogo(img)} className={`group relative p-2 bg-black/40 backdrop-blur-sm rounded-xl border-2 transition-all duration-200 ease-out flex items-center justify-center h-20 shadow-md ${disabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-accent/20 hover:scale-[1.02]"} ${isActive ? "border-accent-orange border-[3px] bg-accent-orange/15 shadow-[0_0_15px_var(--color-accent-orange)] ring-2 ring-accent-orange/25" : "border-zinc-700 hover:border-accent/50 hover:shadow-lg"}`} title={isActive ? p.t("ui.logoSelected") : undefined}>
                    <img src={posterUrl(img.file_path, "w154")} alt="" loading="lazy" decoding="async" className="max-h-14 max-w-full object-contain transition-transform duration-200 group-hover:scale-110" />
                    {isActive && <div className="absolute top-1 right-1 w-5 h-5 bg-accent-orange rounded-full flex items-center justify-center shadow-lg shadow-accent-orange/30"><Check className="w-3 h-3 text-white" /></div>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      {selectedLogo && <button disabled={disabled} onClick={removeLogo} className={`w-full mt-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 border ${disabled ? "bg-zinc-800/30 text-zinc-600 cursor-not-allowed border-zinc-800" : "bg-zinc-800/40 text-zinc-400 hover:text-red-400 hover:bg-red-900/15 hover:border-red-900/30 active:scale-[0.98] border-zinc-700/50 hover:border-red-900/30"}`}><span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />{p.t("ui.removeLogo")}</span></button>}
    </div>
  )
}
