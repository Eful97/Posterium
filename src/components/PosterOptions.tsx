"use client"

import type { SearchResult, TMDBImage } from "@/lib/types"
import { LANG_NAMES, groupBy, limitBest, titleOf } from "@/lib/utils"
import { PosterBtn } from "@/components/PosterBtn"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import { useP } from "@/lib/context"

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
  return (
    <div className="relative">
      <div ref={posterScrollRef} className="max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-none">
      {hasClean && (() => {
        const isOpen = openSections["clean"] !== false
        return (
          <CollapsibleSection isOpen={isOpen} onToggle={() => toggleSection("clean")} label={p.t("ui.clean")} count={cleanPosters.length}>
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1.5">
              {cleanPosters.map((img) => {
                const stagger = idx++
                return <PosterBtn key={img.file_path} staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} />
              })}
            </div>
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
