"use client"

function BadgePreview({ style, accentColor }: { style: string; accentColor?: string | null }) {
  const base = "inline-flex items-center justify-center text-[8px] font-black leading-none w-7 h-4 rounded select-none"
  const ac = accentColor || "#fb923c"
  switch (style) {
    case "shadow":
      return <span className={`${base} bg-transparent text-white`} style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.4)" }}>Aa</span>
    case "pill":
      return <span className={`${base} text-white`} style={{ background: "rgba(255,255,255,0.18)", padding: "0 3px" }}>Aa</span>
    case "bar":
      return <span className={`${base} text-white w-7`} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 1 }}>Aa</span>
    case "colored":
      return <span className={`${base} text-black font-black`} style={{ background: ac }}>Aa</span>
    case "bordo":
      return <span className={`${base} text-white`} style={{ border: "1px solid rgba(255,255,255,0.5)", borderRadius: 3, background: "transparent" }}>Aa</span>
    case "vetro":
      return <span className={`${base} text-white`} style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.15)" }}>Aa</span>
    case "default":
      return <span className={`${base} text-white/70`}>Aa</span>
    default:
      return <span className={`${base} text-white/50`}>~</span>
  }
}

export function BadgeStyleSelector<S extends string>({
  value,
  options,
  onChange,
  t,
  accentColor,
  disabled,
}: {
  value: S
  options: readonly S[]
  onChange: (v: S) => void
  t: (k: string) => string
  accentColor?: string | null
  disabled?: readonly S[]
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((s) => {
        const isActive = value === s
        const isDisabled = disabled?.includes(s) ?? false
        return (
          <button
            key={s}
            type="button"
            onClick={() => !isDisabled && onChange(s)}
            className={`flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5 rounded-lg border transition-all duration-150 ${
              isDisabled
                ? "bg-white/5 text-zinc-600 cursor-not-allowed opacity-50 border-transparent"
                : isActive
                  ? "bg-accent-orange/15 text-accent-orange border-accent-orange/25"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border-transparent"
            }`}
          >
            <BadgePreview style={s} accentColor={accentColor} />
            <span className="text-[10px] font-semibold leading-tight">
              {s === "shadow" ? t("ui.shadow") : s === "pill" ? t("ui.pill") : s === "bar" ? t("ui.bar") : s === "default" ? t("ui.bsDefault") : s === "colored" ? t("ui.colored") : s === "bordo" ? t("ui.bordo") : s === "vetro" ? t("ui.vetro") : s === "netflix" ? t("ui.netflix") : s}
            </span>
          </button>
        )
      })}
    </div>
  )
}
