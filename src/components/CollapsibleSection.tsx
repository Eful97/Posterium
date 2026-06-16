"use client"

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
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-2 flex-1 text-left px-3 py-2 rounded-xl transition-all duration-200 ease-in-out ${
            isOpen
              ? "bg-accent/10 backdrop-blur-sm border border-accent/20"
              : "bg-black/30 backdrop-blur-sm border border-transparent hover:bg-black/50 hover:border-zinc-700"
          }`}
        >
          <span
            className={`transition-all duration-200 text-xs ${
              isOpen ? "text-accent rotate-90" : "text-zinc-400"
            }`}
          >
            ▶
          </span>
          <span
            className={`text-sm font-semibold ${
              isOpen ? "text-accent" : "text-zinc-300"
            }`}
          >
            {label}
          </span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-200 ${
              isOpen
                ? "bg-accent/20 text-accent"
                : "bg-zinc-700 text-zinc-400"
            }`}
          >
            {count}
          </span>
        </button>
      </div>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
