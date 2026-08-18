"use client"

import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useT } from "@/lib/contexts/TranslationContext"

export const ConfirmDialog = React.memo(function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  inline,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  confirmClass?: string
  onConfirm: () => void
  onCancel: () => void
  inline?: boolean
}) {
  const { t } = useT()
  const [closing, setClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setClosing(false)
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [open])

  // Cleanup del timer di chiusura su unmount: evita setState su componente smontato
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  // `closing` era stato morto (mai impostato a true): la chiusura avveniva istantanea
  // senza animazione di uscita. Ora gioca la fade-out e chiama il callback al termine.
  const dismiss = (cb: () => void) => {
    if (closing) return
    setClosing(true)
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      setClosing(false)
      cb()
    }, 150)
  }

  if (!open && !closing) return null
  if (inline) {
    return (
      <>
        <div className="fixed inset-0 z-[199]" onClick={() => dismiss(onCancel)} />
        <div role="dialog" aria-modal="true" aria-label={title} className={`absolute top-full right-0 mt-2 z-[200] bg-surface2 border border-zinc-500 rounded-2xl p-4 shadow-2xl shadow-black/80 min-w-56 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto ${closing ? "animate-fade-scale-out" : "animate-fade-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">{title}</h3>
        <p className="text-xs text-zinc-300 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => dismiss(onCancel)} className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-700 text-zinc-200 hover:bg-zinc-600 active:scale-[0.97] transition-all duration-150">{t("ui.cancelAction")}</button>
          <button type="button" onClick={() => dismiss(onConfirm)} className={`px-4 py-2 rounded-xl text-xs font-medium active:scale-[0.97] transition-all duration-150 ${confirmClass || "bg-red-600 text-white hover:bg-red-500"}`}>{confirmLabel}</button>
        </div>
        </div>
      </>
    )
  }
  // Variante full-screen: PORTAL a document.body — il pattern già usato dal
  // menu collezioni. Un antenato con transform persistente (view-enter)
  // creerebbe un containing block e il dialog fixed apparirebbe disallineato
  // ("in basso"), non centrato sul viewport.
  return typeof document !== "undefined"
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center ${closing ? "animate-fade-out" : "animate-fade-in"}`}
          onClick={() => dismiss(onCancel)}
        >
          <div
            className={`bg-surface2 border border-zinc-500 rounded-2xl p-6 shadow-2xl shadow-black/80 max-w-sm w-full mx-4 ${closing ? "animate-fade-scale-out" : "animate-fade-scale-in"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
            <p className="text-sm text-zinc-300 mb-5">{message}</p>
            <div className="flex gap-2 justify-end">
              <button type="button"
                onClick={() => dismiss(onCancel)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-700 text-zinc-200 hover:bg-zinc-600 active:scale-[0.97] transition-all duration-150"
              >
                {t("ui.cancelAction")}
              </button>
              <button type="button"
                onClick={() => dismiss(onConfirm)}
                className={`px-4 py-2 rounded-xl text-sm font-medium active:scale-[0.97] transition-all duration-150 ${confirmClass || "bg-red-600 text-white hover:bg-red-500"}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null
})
