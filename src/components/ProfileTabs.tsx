"use client"

export type ProfileTab = "save" | "load"

/**
 * Tab switcher Salva/Accedi del ProfileModal (estratto per leggibilita').
 */
export function ProfileTabs({
  tab,
  onTabChange,
  hasProfile,
}: {
  tab: ProfileTab
  onTabChange: (t: ProfileTab) => void
  hasProfile: boolean
}) {
  return (
    <div className="flex rounded-xl bg-black/40 border border-white/10 p-1">
      <button
        type="button"
        onClick={() => onTabChange("save")}
        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
          tab === "save" ? "bg-accent-orange/20 text-accent-orange border border-accent-orange/30" : "text-muted hover:text-zinc-200"
        }`}
      >
        {hasProfile ? "Salva Profilo" : "Nuovo Profilo"}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("load")}
        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
          tab === "load" ? "bg-accent-orange/20 text-accent-orange border border-accent-orange/30" : "text-muted hover:text-zinc-200"
        }`}
      >
        Accedi a Profilo Esistente
      </button>
    </div>
  )
}
