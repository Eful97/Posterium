"use client"

import type { SearchResult, TMDBImage } from "@/lib/types"
import { LANG_NAMES, groupBy, limitBest, titleOf } from "@/lib/utils"
import { PosterBtn } from "@/components/PosterBtn"
import { CollapsibleSection } from "@/components/CollapsibleSection"

interface Props {
  posters: TMDBImage[]
  posterActivePath: string | null
  selected: SearchResult | null
  lang: string
  openSections: Record<string, boolean>
  posterScrollInfo: { top: number; height: number }
  posterScrollRef: React.RefObject<HTMLDivElement | null>
  toggleSection: (key: string) => void
  selectPoster: (img: TMDBImage) => void
  setPosterScrollInfo: (info: { top: number; height: number }) => void
}

export function PosterOptions({ posters, posterActivePath, selected, lang, openSections, posterScrollInfo, posterScrollRef, toggleSection, selectPoster, setPosterScrollInfo }: Props) {
  const cleanPosters = posters.filter((img) => img.iso_639_1 === null)
  const hasClean = cleanPosters.length > 0
  const langGroups = Object.entries(groupBy(posters.filter((img) => img.iso_639_1 !== null), (img) => img.iso_639_1 || "other")).sort(([a], [b]) => {
    if (a === lang) return -1; if (b === lang) return 1
    if (a === "en") return -1; if (b === "en") return 1
    return a.localeCompare(b)
  })
  const primaryLang = !hasClean ? (langGroups.find(([l]) => l === lang)?.[0] || langGroups.find(([l]) => l === "en")?.[0] || langGroups[0]?.[0]) : null
  let idx = 0
  const updateScroll = () => {
    const el = posterScrollRef.current
    if (!el || el.scrollHeight <= el.clientHeight) return
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight)
    const thumbH = Math.max(20, (el.clientHeight / el.scrollHeight) * 100)
    setPosterScrollInfo({ top: pct * (100 - thumbH), height: thumbH })
  }
  return (
    <div className="relative">
      <div ref={posterScrollRef} className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-none pl-2">
      {hasClean && (() => {
        const isOpen = openSections["clean"] !== false
        return (
          <CollapsibleSection isOpen={isOpen} onToggle={() => toggleSection("clean")} label="Clean" count={cleanPosters.length}>
            <div className="grid grid-cols-3 md:grid-cols-2 gap-1.5 md:gap-2">
              {cleanPosters.map((img, i) => {
                const stagger = idx++
                return <PosterBtn key={`clean-${i}`} staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} title={selected ? titleOf(selected) : undefined} />
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
            <div className="grid grid-cols-3 md:grid-cols-2 gap-1.5 md:gap-2">
              {imgs.map((img, i) => {
                const stagger = idx++
                return <PosterBtn key={`${language}-${i}`} staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} title={selected ? titleOf(selected) : undefined} />
              })}
            </div>
          </CollapsibleSection>
        )
      })}

      {posters.length === 0 && <p className="text-center py-12 text-zinc-400">Nessun poster disponibile</p>}
    </div>
  </div>
  )
}
