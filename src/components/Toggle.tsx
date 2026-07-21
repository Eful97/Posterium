"use client"

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} className={`toggle-track ${value ? "toggle-track-on" : "toggle-track-off"}`}>
      <span className={`toggle-thumb ${value ? "toggle-thumb-on" : "toggle-thumb-off"}`} />
    </button>
  )
}
