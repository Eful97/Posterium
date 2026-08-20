"use client"

import React, { useState } from "react"
import { X, Plus, ListPlus, Film, Tv, Check, AlertCircle } from "lucide-react"
import { usePosterium } from "@/lib/context"
import { parseMDBListTarget } from "@/lib/mdblist"

interface CustomCatalogModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CustomCatalogModal({ isOpen, onClose }: CustomCatalogModalProps) {
  const { addCustomCatalog, mdblistApiKey } = usePosterium()
  const [url, setUrl] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<"movie" | "series">("movie")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewItems, setPreviewItems] = useState<Array<{ title: string; year: number }> | null>(null)

  if (!isOpen) return null

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmedUrl = url.trim()
    const trimmedName = name.trim()

    if (!trimmedUrl) {
      setError("Inserisci l'URL o l'ID della lista MDBList")
      return
    }
    if (!trimmedName) {
      setError("Inserisci un nome per il catalogo")
      return
    }

    const target = parseMDBListTarget(trimmedUrl)
    if (!target) {
      setError("Formato non valido. Usa un URL MDBList (es. https://mdblist.com/lists/user/slug) o un ID lista.")
      return
    }

    setLoading(true)
    try {
      // Verifica la lista
      let testEndpoint = ""
      if (target.id) {
        testEndpoint = mdblistApiKey
          ? `https://api.mdblist.com/lists/${target.id}/items?apikey=${encodeURIComponent(mdblistApiKey)}&limit=3`
          : `https://mdblist.com/api/lists/${target.id}`
      } else if (target.user && target.slug) {
        testEndpoint = mdblistApiKey
          ? `https://api.mdblist.com/lists/${encodeURIComponent(target.user)}/${encodeURIComponent(target.slug)}/items?apikey=${encodeURIComponent(mdblistApiKey)}&limit=3`
          : `https://mdblist.com/api/lists/${encodeURIComponent(target.user)}/${encodeURIComponent(target.slug)}`
      }

      if (testEndpoint) {
        const res = await fetch(testEndpoint, { signal: AbortSignal.timeout(6000) }).catch(() => null)
        if (res && res.ok) {
          const data = await res.json()
          const payload = data?.data?.items || data?.items || data?.shows || data?.movies || (Array.isArray(data) ? data : [])
          if (Array.isArray(payload) && payload.length > 0) {
            setPreviewItems(payload.slice(0, 3).map((it: { title?: string; year?: number }) => ({ title: it.title || "Titolo", year: it.year || 0 })))
          }
        }
      }

      addCustomCatalog({
        name: trimmedName,
        type,
        url: trimmedUrl,
        enabled: true,
      })

      setTimeout(() => {
        setUrl("")
        setName("")
        setPreviewItems(null)
        setLoading(false)
        onClose()
      }, previewItems ? 800 : 200)
    } catch {
      // In caso di errore di rete temporaneo durante il test, aggiungiamo comunque la lista
      addCustomCatalog({
        name: trimmedName,
        type,
        url: trimmedUrl,
        enabled: true,
      })
      setUrl("")
      setName("")
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-surface2/50">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-accent-orange" />
            <h3 className="text-base font-semibold text-white">Aggiungi Catalogo Personalizzato</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleTestAndSave} className="p-5 space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Inserisci una lista <strong>MDBList</strong> (es. Top 10 Sky / NOW, Trakt trending o anime). Posterium ne genererà un catalogo per Stremio con tutte le locandine dinamiche.
          </p>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              URL o ID Lista MDBList
            </label>
            <input
              type="text"
              placeholder="https://mdblist.com/lists/user/sky-now-top10"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-orange transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome del Catalogo
            </label>
            <input
              type="text"
              placeholder="es. Sky & NOW — Top 10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-orange transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Tipo Contenuto
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("movie")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  type === "movie"
                    ? "bg-accent-orange/20 border-accent-orange text-accent-orange"
                    : "bg-surface2/60 border-white/5 text-muted hover:text-white"
                }`}
              >
                <Film className="w-3.5 h-3.5" /> Film
              </button>
              <button
                type="button"
                onClick={() => setType("series")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  type === "series"
                    ? "bg-accent-orange/20 border-accent-orange text-accent-orange"
                    : "bg-surface2/60 border-white/5 text-muted hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" /> Serie TV
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {previewItems && previewItems.length > 0 && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-green-400">
                <Check className="w-3.5 h-3.5" /> Lista verificata con successo!
              </div>
              <p className="text-[11px] text-zinc-300">
                Primi titoli: {previewItems.map((p) => `${p.title} (${p.year})`).join(", ")}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-white transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-orange text-white text-xs font-semibold hover:bg-accent-orange/90 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? "Salvataggio..." : <><Plus className="w-3.5 h-3.5" /> Aggiungi Catalogo</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
