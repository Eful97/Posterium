"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { AlertTriangle, XCircle, CheckCircle2, X } from "lucide-react"

type ToastType = "error" | "warning" | "success"

interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
  timestamp: number
}

const ToastCtx = createContext<{
  addToast: (t: Omit<Toast, "id" | "timestamp">) => void
  removeToast: (id: string) => void
} | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) {
    return {
      error: (_msg: string, _dur?: number) => {},
      warning: (_msg: string, _dur?: number) => {},
      success: (_msg: string, _dur?: number) => {},
    }
  }
  return {
    error: (message: string, duration = 5000) => ctx.addToast({ type: "error", message, duration }),
    warning: (message: string, duration = 5000) => ctx.addToast({ type: "warning", message, duration }),
    success: (message: string, duration = 3000) => ctx.addToast({ type: "success", message, duration }),
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Omit<Toast, "id" | "timestamp">) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...t, id, timestamp: Date.now() }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const interval = setInterval(() => {
      const now = Date.now()
      setToasts((prev) => prev.filter((t) => now - t.timestamp < t.duration))
    }, 1000)
    return () => clearInterval(interval)
  }, [toasts.length])

  return (
    <ToastCtx.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl animate-slide-in-right
              ${toast.type === "error" ? "bg-red-900/80 border-red-700/50 text-red-100" : ""}
              ${toast.type === "warning" ? "bg-yellow-900/80 border-yellow-700/50 text-yellow-100" : ""}
              ${toast.type === "success" ? "bg-green-900/80 border-green-700/50 text-green-100" : ""}
            `}
          >
            {toast.type === "error" ? <XCircle className="w-5 h-5 shrink-0" /> :
             toast.type === "warning" ? <AlertTriangle className="w-5 h-5 shrink-0" /> :
             <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <p className="text-xs font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
