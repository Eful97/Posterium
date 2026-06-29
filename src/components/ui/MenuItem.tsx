"use client"

export function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  className = "",
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left text-xs px-3 py-2 rounded-lg active:scale-[0.98] transition-all duration-150 ${
        danger
          ? "hover:bg-red-900/50"
          : "hover:bg-zinc-700"
      } ${className}`}
    >
      <span className="flex items-center gap-1.5">
        {Icon && <span className="w-3 h-3">{Icon}</span>}
        {label}
      </span>
    </button>
  )
}
