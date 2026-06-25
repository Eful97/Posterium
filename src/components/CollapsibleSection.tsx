"use client"

import { ChevronRight } from "lucide-react"

export function CollapsibleSection({
  isOpen,
  onToggle,
  label,
  count,
  children,
}: {
  isOpen: boolean
  onToggle: () => void
  label: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg transition-all duration-200 ease-in-out ${
          isOpen
            ? "bg-white/5"
            : "hover:bg-white/[0.03]"
        }`}
      >
        <ChevronRight className={`w-3 h-3 transition-all duration-200 ${isOpen ? "rotate-90 text-accent" : "text-zinc-500"}`} />
        <span className={`text-xs font-semibold ${isOpen ? "text-accent" : "text-zinc-300"}`}>{label}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-auto transition-all duration-200 ${
          isOpen ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-500"
        }`}>{count}</span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-1.5 px-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
