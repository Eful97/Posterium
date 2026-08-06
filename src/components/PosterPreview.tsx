"use client"

import { useRef } from "react"
import { ImageOff, RefreshCw } from "lucide-react"
import { useP } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { useToast } from "@/components/Toast"

interface PosterPreviewProps {
  previewLoading: boolean
  loadProgress: number
  imageError: boolean
  setImageError: (error: boolean) => void
  imgSrc: string
}

export function PosterPreview({
  previewLoading,
  loadProgress,
  imageError,
  setImageError,
  imgSrc
}: PosterPreviewProps) {
  const p = useP()
  const { t } = useT()
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  return (
    <div role="img" aria-label={`Preview of ${p.selected?.title || p.selected?.name || ""} poster with ${p.selectedLogo ? "logo" : "no logo"}`}
         className={`preview-frame w-full rounded-[1.35rem] overflow-hidden relative ${p.previewPoster ? "preview-frame-active" : ""}`}>
      <div className="relative aspect-[2/3] select-none pointer-events-none bg-zinc-950/70 overflow-hidden rounded-[1.2rem]">
        {p.previewUrl ? (
          <>
            <div className="loading-bar-overlay" style={{ opacity: previewLoading ? 1 : 0, pointerEvents: "none" }} />
            <div className="loading-bar-container" style={{ opacity: previewLoading ? 1 : 0, transition: "opacity 0.3s ease" }}>
              <div className="loading-bar-track" style={{ transform: `scaleX(${loadProgress / 100})`, transformOrigin: "left" }} />
              <span className="loading-bar-text">{loadProgress}%</span>
            </div>
            {imgSrc && (
              /* eslint-disable-next-line @next/next/no-img-element -- server-rendered poster */
              <img
                src={imgSrc}
                alt={p.selected?.title || p.selected?.name || ""}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </>
        ) : p.selected ? (
          <div className="absolute inset-0 bg-zinc-800/50 animate-pulse rounded-2xl" />
        ) : null}
        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 text-center p-8 z-20">
            <ImageOff className="w-12 h-12 mb-3 text-zinc-500" />
            <p className="text-sm text-zinc-400 font-medium">{t("ui.imageNotAvailable")}</p>
            <p className="text-xs text-zinc-500 mt-1">{t("ui.posterLoadError")}</p>
            <button type="button" aria-label={t("ui.retry")} onClick={() => setImageError(false)}
                    className="mt-3 px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-all duration-150">
              <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />{t("ui.retry")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}