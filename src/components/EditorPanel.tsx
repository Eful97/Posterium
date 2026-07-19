"use client"

interface Props {
  title?: string
  tabs?: { key: string; label: string; count?: number }[]
  activeTab?: string
  onTabChange?: (key: string) => void
  children: React.ReactNode
  className?: string
  "aria-label"?: string
}

export function EditorPanel({ title, tabs, activeTab, onTabChange, children, className = "", ["aria-label"]: ariaLabel }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!tabs || !activeTab || !onTabChange) return
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const dir = e.key === "ArrowRight" ? 1 : -1
      const currentIndex = tabs.findIndex(t => t.key === activeTab)
      const nextIndex = (currentIndex + dir + tabs.length) % tabs.length
      onTabChange(tabs[nextIndex].key)
    }
  }

  return (
    <section aria-label={ariaLabel} className={`editor-panel rounded-2xl border border-white/10 bg-zinc-950/75 shadow-2xl shadow-black/40 backdrop-blur-xl ${className}`}>
      {(title || tabs) && (
        <div className="editor-panel-header">
          {tabs ? (
            <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist" onKeyDown={handleKeyDown}>
              {tabs.map((tab, idx) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  tabIndex={activeTab === tab.key ? 0 : -1}
                  onClick={() => onTabChange?.(tab.key)}
                  className={`tab-chip h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all shrink-0 ${activeTab === tab.key ? "tab-chip-active bg-accent-orange/15 text-accent-orange border-accent-orange/35" : "bg-white/5 text-zinc-400 border-white/10 hover:text-zinc-200 hover:bg-white/10"}`}
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
      <div className="editor-panel-body scrollbar-none">
        {children}
      </div>
    </section>
  )
}
