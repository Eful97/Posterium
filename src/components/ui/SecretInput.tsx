"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

export function SecretInput({
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  className = "",
}: {
  label: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  className?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
        {Icon && <span className="w-3 h-3">{Icon}</span>}
        {label}
      </label>
      <div className="flex gap-1">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-background border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="px-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 active:scale-90 transition-all duration-150"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
