"use client"

import React, { useState, useEffect } from "react"
import { useP } from "@/lib/context"

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
  const p = useP()
  const [visible, setVisible] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setClosing(false)
    }
  }, [open])

  if (!open && !closing) return null
  if (inline) {
    return (
      <>
        <div className="fixed inset-0 z-[199]" onClick={onCancel} />
        <div className={`absolute top-full right-0 mt-2 z-[200] bg-zinc-800 border border-zinc-500 rounded-2xl p-4 shadow-2xl shadow-black/80 min-w-56 ${closing ? "animate-fade-scale-out" : "animate-fade-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">{title}</h3>
        <p className="text-xs text-zinc-300 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-700 text-zinc-200 hover:bg-zinc-600 active:scale-[0.97] transition-all duration-150">{p.t("ui.cancelAction")}</button>
          <button onClick={onConfirm} className={`px-3 py-1.5 rounded-xl text-xs font-medium active:scale-[0.97] transition-all duration-150 ${confirmClass || "bg-red-600 text-white hover:bg-red-500"}`}>{confirmLabel}</button>
        </div>
        </div>
      </>
    )
  }
  return (
    <div
      className={`fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center ${closing ? "animate-fade-out" : "animate-fade-in"}`}
      onClick={onCancel}
    >
        <div
          className={`bg-zinc-800 border border-zinc-500 rounded-2xl p-6 shadow-2xl shadow-black/80 max-w-sm w-full mx-4 ${closing ? "animate-fade-scale-out" : "animate-fade-scale-in"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
          <p className="text-sm text-zinc-300 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-700 text-zinc-200 hover:bg-zinc-600 active:scale-[0.97] transition-all duration-150"
          >
            {p.t("ui.cancelAction")}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium active:scale-[0.97] transition-all duration-150 ${confirmClass || "bg-red-600 text-white hover:bg-red-500"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
})
