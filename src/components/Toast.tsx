"use client"

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react"
import { AlertTriangle, XCircle, CheckCircle2, X } from "lucide-react"

type ToastType = "error" | "warning" | "success"

interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
  timestamp: number
}

interface ToastItem extends Toast {
  exiting: boolean
}

const ToastCtx = createContext<{
  addToast: (t: Omit<Toast, "id" | "timestamp">) => void
  removeToast: (id: string) => void
} | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) {
    return {
      error: () => {},
      warning: () => {},
      success: () => {},
    }
  }
  return {
    error: (message: string, duration = 5000) => ctx.addToast({ type: "error", message, duration }),
    warning: (message: string, duration = 5000) => ctx.addToast({ type: "warning", message, duration }),
    success: (message: string, duration = 3000) => ctx.addToast({ type: "success", message, duration }),
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const cleanupTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
  }, [])

  const removeToast = useCallback((id: string) => {
    cleanupTimer(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [cleanupTimer])

  const dismissToast = useCallback((id: string) => {
    cleanupTimer(id)
    setToasts((prev) => prev.map((t) => t.id === id && !t.exiting ? { ...t, exiting: true } : t))
    setTimeout(() => removeToast(id), 200)
  }, [cleanupTimer, removeToast])

  const addToast = useCallback((t: Omit<Toast, "id" | "timestamp">) => {
    const id = crypto.randomUUID()
    const newToast: ToastItem = { ...t, id, timestamp: Date.now(), exiting: false }
    setToasts((prev) => [...prev, newToast])
    const timer = setTimeout(() => dismissToast(id), t.duration)
    timersRef.current.set(id, timer)
  }, [dismissToast])

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- timersRef.current is stable (ref doesn't change)
      const timers = timersRef.current
      const snapshot = new Map(timers)
      snapshot.forEach((timer) => clearTimeout(timer))
      snapshot.clear()
    }
  }, [])

  return (
    <ToastCtx.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl
              ${toast.exiting ? "animate-slide-down-out-toast" : "animate-slide-in-right"}
              ${toast.type === "error" ? "bg-red-900/80 border-red-700/50 text-red-100" : ""}
              ${toast.type === "warning" ? "bg-yellow-900/80 border-yellow-700/50 text-yellow-100" : ""}
              ${toast.type === "success" ? "bg-green-900/80 border-green-700/50 text-green-100" : ""}
            `}
          >
            {toast.type === "error" ? <XCircle className="w-5 h-5 shrink-0" /> :
             toast.type === "warning" ? <AlertTriangle className="w-5 h-5 shrink-0" /> :
             <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <p className="text-xs font-medium flex-1">{toast.message}</p>
            <button onClick={() => dismissToast(toast.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity press-scale">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
