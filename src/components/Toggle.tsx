"use client"

// Fix L31: il toggle ha un nome accessibile esplicito — un role="switch"
// senza nome viene annunciato come "switch" senza contesto dagli screen reader.
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} className={`toggle-track ${value ? "toggle-track-on" : "toggle-track-off"}`}>
      <span className={`toggle-thumb ${value ? "toggle-thumb-on" : "toggle-thumb-off"}`} />
    </button>
  )
}