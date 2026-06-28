"use client"

import type { SearchResult, TMDBImage } from "@/lib/types"
import { LANG_NAMES, groupBy, limitBest, titleOf } from "@/lib/utils"
import { PosterBtn } from "@/components/PosterBtn"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import { useP } from "@/lib/context"
import { RotateCcw, Plus, Check, Clock } from "lucide-react"

interface Props {
  posters: TMDBImage[]
  posterActivePath: string | null
  selected: SearchResult | null
  lang: string
  openSections: Record<string, boolean>
  posterScrollRef: React.RefObject<HTMLDivElement | null>
  toggleSection: (key: string) => void
  selectPoster: (img: TMDBImage) => void
}

export function PosterOptions({ posters, posterActivePath, selected, lang, openSections, posterScrollRef, toggleSection, selectPoster }: Props) {
  const p = useP()
  const cleanPosters = posters.filter((img) => img.iso_639_1 === null)
  const hasClean = cleanPosters.length > 0
  const langGroups = Object.entries(groupBy(posters.filter((img) => img.iso_639_1 !== null), (img) => img.iso_639_1 || "other")).sort(([a], [b]) => {
    if (a === lang) return -1; if (b === lang) return 1
    if (a === "en") return -1; if (b === "en") return 1
    return a.localeCompare(b)
  })
  const primaryLang = !hasClean && langGroups.length > 0 ? (langGroups.find(([l]) => l === lang)?.[0] || langGroups.find(([l]) => l === "en")?.[0] || langGroups[0][0]) : null
  let idx = 0

  const toggleRotation = (filePath: string) => {
    p.setRotationPosters((prev) => {
      if (prev.includes(filePath)) return prev.filter((f) => f !== filePath)
      return [...prev, filePath]
    })
  }

  return (
    <div className="relative">
      <div ref={posterScrollRef} className="max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-none">
      {hasClean && (() => {
        const isOpen = openSections["clean"] !== false
        return (
          <CollapsibleSection isOpen={isOpen} onToggle={() => toggleSection("clean")} label={p.t("ui.clean")} count={cleanPosters.length}>
            {p.rotationPosters.length > 1 && (
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" />{p.t("ui.autoRotate")}</span>
                <button
                  onClick={() => p.setAutoRotateClean(!p.autoRotateClean)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${p.autoRotateClean ? "bg-accent-orange/20 text-accent-orange animate-pulse-ring" : "bg-white/5 text-zinc-400"}`}
                >
                  {p.autoRotateClean ? <><Check className="w-3 h-3 inline mr-1" />ON</> : "OFF"}
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1.5">
              {cleanPosters.map((img) => {
                const stagger = idx++
                const inRotation = p.rotationPosters.includes(img.file_path)
                return (
                  <div key={img.file_path} className="relative group">
                    <PosterBtn staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleRotation(img.file_path) }}
                      className={`absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] transition-all duration-150 ${inRotation ? "bg-accent-orange text-white shadow-sm shadow-accent-orange/40" : "opacity-0 group-hover:opacity-100 bg-black/70 text-zinc-300 hover:bg-black/90 hover:text-white backdrop-blur-sm"}`}
                      title={inRotation ? p.t("ui.removeFromRotation") : p.t("ui.addToRotation")}
                    >
                      {inRotation ? <RotateCcw className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </button>
                  </div>
                )
              })}
            </div>
            {p.rotationPosters.length > 0 && (
              <p className="text-[11px] text-zinc-500 mt-1.5 px-1">{p.rotationPosters.length} {p.t("ui.selectedCount", { count: p.rotationPosters.length })}</p>
            )}
          </CollapsibleSection>
        )
      })()}

      {langGroups.map(([language, imgs]) => {
        if (imgs.length === 0) return null
        const isOpen = language === primaryLang ? openSections[language] !== false : openSections[language]
        return (
          <CollapsibleSection key={language} isOpen={isOpen} onToggle={() => toggleSection(language)} label={LANG_NAMES[language] || language} count={imgs.length}>
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1.5">
              {imgs.map((img) => {
                const stagger = idx++
                return <PosterBtn key={img.file_path} staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} />
              })}
            </div>
          </CollapsibleSection>
        )
      })}

      {posters.length === 0 && <p className="text-center py-12 text-zinc-400">{p.t("ui.loading")}</p>}
    </div>
  </div>
  )
}
