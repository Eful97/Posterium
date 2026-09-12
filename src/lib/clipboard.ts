/**
 * Copia testo negli appunti con fallback per contesti non sicuri.
 *
 * `navigator.clipboard.writeText` esiste solo in secure context (https,
 * localhost): su deploy Docker raggiunti via `http://IP-locale` è `undefined`
 * e i bottoni copia morirebbero in silenzio. Il fallback textarea +
 * `execCommand("copy")` funziona anche lì. Non lancia mai: ritorna `false`
 * se la copia fallisce.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fallback sotto.
  }
  try {
    if (typeof document === "undefined") return false
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
