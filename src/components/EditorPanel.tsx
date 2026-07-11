"use client"

interface Props {
  title?: string
  tabs?: { key: string; label: string; count?: number }[]
  activeTab?: string
  onTabChange?: (key: string) => void
  children: React.ReactNode
  className?: string
}

export function EditorPanel({ title, tabs, activeTab, onTabChange, children, className = "" }: Props) {
  return (
    <section className={`h-full min-h-0 rounded-xl border border-zinc-800/70 bg-zinc-950/45 flex flex-col overflow-hidden ${className}`}>
      {(title || tabs) && (
        <div className="shrink-0 px-4 py-3 border-b border-zinc-800/60">
          {tabs ? (
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange?.(tab.key)}
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all shrink-0 ${
                    activeTab === tab.key
                      ? "bg-accent-orange/15 text-accent-orange border-accent-orange/35"
                      : "bg-white/5 text-zinc-400 border-white/10 hover:text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>}
                </button>
              ))}
            </div>
          ) : (
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">{title}</h3>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-3">
        {children}
      </div>
    </section>
  )
}
