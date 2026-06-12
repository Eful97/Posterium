"use client"

export function SliderRow({ icon, label, value, min, max, boundsMin, boundsMax, onChange, onDoubleClick, editingValue, editText, setEditingValue, setEditText, editingKey }: {
  icon?: string; label: string; value: number; min: number; max: number; boundsMin: number; boundsMax: number;
  onChange: (v: number) => void; onDoubleClick: () => void;
  editingValue: string | null; editText: string;
  setEditingValue: (v: string | null) => void; setEditText: (v: string) => void;
  editingKey: string
}) {
  const range = max - min
  const step = Math.max(1, Math.round(range / 100))
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-[13px] text-zinc-400 w-14 shrink-0">{icon}</span>
      <span className="text-[12px] text-zinc-400 w-10 shrink-0 font-medium">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} onDoubleClick={onDoubleClick} className="flex-1" style={{ "--pct": `${boundsMax !== boundsMin ? ((value - boundsMin) / (boundsMax - boundsMin)) * 100 : 50}%` } as React.CSSProperties} />
      {editingValue === editingKey ? (
        <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onFocus={(e) => e.target.select()} onBlur={() => { const v = Math.min(boundsMax, Math.max(boundsMin, Number(editText) || 0)); onChange(v); setEditingValue(null) }} onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur() } }} className="w-14 text-right text-[11px] bg-background border border-zinc-700 rounded px-1 py-0.5 outline-none focus:border-accent" />
      ) : (
        <span onClick={() => { setEditText(String(value)); setEditingValue(editingKey) }} className="text-[12px] text-zinc-300 w-14 text-right cursor-pointer hover:text-accent transition-colors tabular-nums font-semibold">{value}{editingKey === "scale" ? "%" : "px"}</span>
      )}
    </div>
  )
}
