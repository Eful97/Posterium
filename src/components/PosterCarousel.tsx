"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useP } from "@/lib/context"
import { toSearchResult } from "@/lib/types"

const EXAMPLES = [
  // --- Film ---
  { id: 278, type: "movie" as const, title: "The Shawshank Redemption", params: "?genreName=Dramma&voteAverage=9.3&bs=shadow&gradHeight=25&blur=30&bf=50&bd=40&tl=1&logoFit=0", badge: "Shadow + voto 9.3", desc: "Badge ombra con dramma e voto, gradiente scuro" },
  { id: 155, type: "movie" as const, title: "The Dark Knight", params: "?genreName=Azione&voteAverage=8.5&bs=pill&gradHeight=20&blur=20&bf=55&bd=35&tl=1&logoFit=0", badge: "Pill + Azione", desc: "Badge pill bianco con genere Azione e sfocatura leggera" },
  { id: 27205, type: "movie" as const, title: "Inception", params: "?genreName=Thriller&voteAverage=8.8&bs=bar&tl=0&ac=%23f39c12&gradHeight=30&blur=35&bf=50&bd=45&logoFit=0", badge: "Bar + accent arancione", desc: "Badge a barra con colore accentato arancione, tema scuro" },
  { id: 157336, type: "movie" as const, title: "Interstellar", params: "?genreName=Fantascienza&voteAverage=8.7&bs=colored&be=0&tl=1&gradHeight=15&blur=0&logoFit=0", badge: "Colored + pulito", desc: "Badge colorato senza sfocatura, asciutto e leggibile" },
  { id: 299534, type: "movie" as const, title: "Avengers: Endgame", params: "?genreName=Azione&voteAverage=8.4&bs=shadow&gradHeight=40&blur=50&bf=70&bd=50&tl=0&logoFit=0", badge: "Shadow + blur pesante", desc: "Sfocatura intensa con gradiente scuro molto pronunciato" },
  { id: 238, type: "movie" as const, title: "The Godfather", params: "?genreName=Crime&voteAverage=9.2&bs=pill&gradHeight=10&tl=0&logoFit=0", badge: "Pill + Crime pulito", desc: "Badge pill, tema scuro, pulito senza blur extra" },
  { id: 11, type: "movie" as const, title: "Star Wars", params: "?genreName=Fantascienza&voteAverage=8.5&bs=colored&tl=1&gradHeight=25&blur=25&bf=45&bd=30&logoFit=0", badge: "Colored + Fantascienza", desc: "Badge colorato genere Fantascienza con sfocatura media" },
  { id: 680, type: "movie" as const, title: "Pulp Fiction", params: "?genreName=Crime&voteAverage=8.9&bs=bar&tl=0&ac=%23e74c3c&gradHeight=15&blur=15&bf=40&bd=25&logoFit=0", badge: "Bar + accent rosso", desc: "Badge a barra con accento rosso, tema scuro minimal" },
  { id: 597, type: "movie" as const, title: "Titanic", params: "?genreName=Dramma&voteAverage=8.4&bs=shadow&gradHeight=20&blur=30&bf=60&bd=40&tl=1&logoFit=0", badge: "Shadow + Dramma", desc: "Badge ombra con dramma e gradiente morbido" },
  { id: 122, type: "movie" as const, title: "The Return of the King", params: "?genreName=Avventura&voteAverage=8.5&bs=pill&gradHeight=30&blur=40&bf=65&bd=45&tl=0&ac=%23d4a017&logoFit=0", badge: "Pill + Avventura dark", desc: "Badge pill tema scuro con accento dorato" },
  // --- Serie TV ---
  { id: 1396, type: "tv" as const, title: "Breaking Bad", params: "?genreName=Crime&voteAverage=9.5&bs=bar&tl=1&gradHeight=20&blur=25&bf=50&bd=30&logoFit=0", badge: "Bar + Crime", desc: "Badge a barra con genere Crime e sfocatura media" },
  { id: 66732, type: "tv" as const, title: "Stranger Things", params: "?genreName=Fantascienza&voteAverage=8.6&bs=colored&tl=1&gradHeight=20&blur=20&bf=45&bd=25&logoFit=0", badge: "Colored + Fantascienza", desc: "Badge colorato genere Fantascienza con leggera sfocatura" },
  { id: 1668, type: "tv" as const, title: "Friends", params: "?genreName=Commedia&voteAverage=8.3&bs=pill&tl=1&gradHeight=10&be=0&logoFit=0", badge: "Pill + Commedia clean", desc: "Badge pill pulito, senza sfocatura, tema chiaro" },
  { id: 1399, type: "tv" as const, title: "Game of Thrones", params: "?genreName=Dramma&voteAverage=8.4&bs=bar&tl=0&ac=%233498db&gradHeight=35&blur=45&bf=70&bd=50&logoFit=0", badge: "Bar + accent blu", desc: "Badge a barra con accento blu e sfocatura forte" },
  { id: 456, type: "tv" as const, title: "The Simpsons", params: "?genreName=Commedia&voteAverage=8.0&bs=colored&tl=1&gradHeight=10&blur=10&bf=30&bd=15&logoFit=0", badge: "Colored + Commedia", desc: "Badge colorato genere Commedia, leggero e vivace" },
  { id: 76479, type: "tv" as const, title: "The Boys", params: "?genreName=Azione&voteAverage=8.4&bs=shadow&tl=0&gradHeight=25&blur=30&bf=55&bd=40&logoFit=0", badge: "Shadow + Azione dark", desc: "Badge ombra tema scuro, gradiente marcato" },
  { id: 82883, type: "tv" as const, title: "The Mandalorian", params: "?genreName=Fantascienza&voteAverage=8.2&bs=pill&tl=0&gradHeight=20&blur=20&bf=45&bd=30&logoFit=0", badge: "Pill + Fantascienza", desc: "Badge pill tema scuro genere Fantascienza" },
  { id: 60574, type: "tv" as const, title: "Peaky Blinders", params: "?genreName=Crime&voteAverage=8.5&bs=bar&tl=0&ac=%23555&gradHeight=15&blur=15&bf=40&bd=25&logoFit=0", badge: "Bar + Crime scuro", desc: "Badge a barra tema scuro, essenziale" },
  { id: 71912, type: "tv" as const, title: "The Witcher", params: "?genreName=Azione&voteAverage=8.2&bs=colored&tl=1&gradHeight=30&blur=35&bf=60&bd=40&ac=%239b59b6&logoFit=0", badge: "Colored + Azione + voto", desc: "Badge colorato con accento viola e sfocatura media" },
  { id: 44217, type: "tv" as const, title: "Dark", params: "?genreName=Thriller&voteAverage=8.0&bs=shadow&tl=0&gradHeight=25&blur=30&bf=50&bd=40&ac=%23333&logoFit=0", badge: "Shadow + Thriller", desc: "Badge ombra genere Thriller, palette scura" },
]

const CARD_W = 240
const GAP = 16
const STEP = CARD_W + GAP
const SCROLL_SPEED = 0.5 // px per frame

export function PosterCarousel() {
  const p = useP()
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const posRef = useRef(0)
  const [offset, setOffset] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const hoveringRef = useRef(false)
  const tickRef = useRef<() => void>(() => {})
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(true)

  const totalItems = EXAMPLES.length
  const totalW = totalItems * STEP

  useEffect(() => {
    hoveringRef.current = isHovering
  }, [isHovering])

  useEffect(() => {
    let frameCount = 0
    const tick = () => {
      if (!hoveringRef.current) {
        posRef.current += SCROLL_SPEED
        if (posRef.current >= totalW) {
          posRef.current = 0
        }
        setOffset(-posRef.current)
        frameCount++
        if (frameCount % 12 === 0) {
          const idx = Math.floor(posRef.current / STEP) % totalItems
          setActiveIndex(idx)
          setShowLeft(posRef.current > 0)
          setShowRight(true)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tickRef.current = tick
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [totalW, totalItems])

  const scrollTo = useCallback((dir: number) => {
    const target = Math.max(0, Math.min(totalW, posRef.current + dir * STEP))
    const start = posRef.current
    const duration = 200
    const startTime = performance.now()
    const animate = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      posRef.current = start + (target - start) * ease
      setOffset(-posRef.current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        rafRef.current = requestAnimationFrame(tickRef.current)
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
  }, [totalW])

  return (
    <div className="mt-14 max-w-5xl mx-auto px-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-heading text-xl font-bold">
          {p.t("ui.posterExamples")}
        </h2>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-orange transition-all duration-300"
                style={{ width: `${(activeIndex / Math.max(totalItems - 1, 1)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 tabular-nums">{activeIndex + 1}/{totalItems}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mb-6">
        {p.t("ui.posterExamplesDesc")}
      </p>

      <div
        className="relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {showLeft && (
          <button
            onClick={() => scrollTo(-1)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-xl flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800/80 active:scale-90 transition-all shadow-xl"
            aria-label="Scorri a sinistra"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div ref={containerRef} className="overflow-hidden rounded-2xl px-4">
          <div
            className="flex gap-4 will-change-transform"
            style={{ transform: `translateX(${offset}px)` }}
          >
            {[...EXAMPLES, ...EXAMPLES].map((ex, i) => {
              const posterUrl = `/api/poster/${ex.type}/${ex.id}${ex.params}`
              return (
                <div
                  key={i}
                  className="shrink-0 animate-stagger-in"
                  style={{ width: CARD_W, animationDelay: `${(i % totalItems) * 50}ms` }}
                >
                  <div
                    onClick={() => p.navigateToPoster(toSearchResult({ id: ex.id, media_type: ex.type, title: ex.title, name: ex.title }))}
                    className="relative bg-zinc-900/60 border border-zinc-800/40 rounded-2xl overflow-hidden hover:border-zinc-700/60 hover:border-accent-orange/20 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="aspect-[2/3] relative overflow-hidden bg-zinc-800">
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-transparent z-10" />
                      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic poster URL */}
                      <img
                        src={posterUrl}
                        alt={ex.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute bottom-3 left-3 right-3 z-30">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-[9px] font-semibold text-white/90">
                            {ex.badge}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 relative z-10">
                      <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors duration-200">{ex.title}</h3>
                      <p className="text-[10px] text-zinc-400 group-hover:text-zinc-200 mt-1 leading-relaxed transition-colors duration-200">{ex.desc}</p>
                    </div>
                    <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-6 h-6 rounded-full bg-accent-orange/80 flex items-center justify-center shadow-lg">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {showRight && (
          <button
            onClick={() => scrollTo(1)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-xl flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800/80 active:scale-90 transition-all shadow-xl"
            aria-label="Scorri a destra"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
