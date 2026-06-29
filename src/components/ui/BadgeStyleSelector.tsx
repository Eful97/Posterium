"use client"

import { Moon, Pill, BarChart3, Circle } from "lucide-react"

function getMeta(s: string, t: (k: string) => string): { icon: React.ReactNode; label: string } {
  if (s === "shadow") return { icon: <Moon className="w-3 h-3" />, label: t("ui.shadow") }
  if (s === "pill") return { icon: <Pill className="w-3 h-3" />, label: t("ui.pill") }
  if (s === "bar") return { icon: <BarChart3 className="w-3 h-3" />, label: t("ui.bar") }
  if (s === "default") return { icon: <Circle className="w-3 h-3" />, label: t("ui.bsDefault") }
  return { icon: <Circle className="w-3 h-3" />, label: t("ui.colored") }
}

export function BadgeStyleSelector({
  value,
  options,
  onChange,
  t,
  accentColor,
}: {
  value: string
  options: readonly string[]
  onChange: (v: string) => void
  t: (k: string) => string
  accentColor?: string
}) {
  return (
    <div className="flex gap-1">
      {options.map((s) => {
        const meta = getMeta(s, t)
        const isActive = value === s
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 ${
              isActive ? "bg-white/20 text-white shadow-sm" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >
            <span className="flex items-center gap-1 justify-center">
              {s === "colored" && accentColor && accentColor !== "#555555"
                ? <Circle className="w-3 h-3" style={{ color: accentColor }} />
                : meta.icon}
              {meta.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
