export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 ${className}`}>
      {children}
    </div>
  )
}

export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1 text-center ${className}`}>
      {children}
    </h3>
  )
}
