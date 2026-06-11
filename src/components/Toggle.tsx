"use client"

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className={`relative w-10 h-6 rounded-full transition-all duration-300 ${value ? "bg-accent-orange shadow-lg shadow-accent-orange/30" : "bg-zinc-700"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 flex items-center justify-center text-[8px] font-bold ${value ? "left-[18px] scale-105 text-accent-orange" : "left-0.5 scale-95 text-zinc-400"}`}>{value ? "✓" : "✕"}</span>
    </button>
  )
}
