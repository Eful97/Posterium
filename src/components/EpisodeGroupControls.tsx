"use client"

import { useState, useEffect } from "react"
import { ListOrdered, Check, Save } from "lucide-react"
import { usePSelector } from "@/lib/context"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { http } from "@/lib/http"

export function EpisodeGroupControls() {
  const selected = usePSelector((v) => v.selected)
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const mappingsMap = usePSelector((v) => v.mappingsMap)
  const loadMappings = usePSelector((v) => v.loadMappings)
  const profileStateless = usePSelector((v) => v.profileStateless)
  const ed = usePosterEditor()

  const [epGroups, setEpGroups] = useState<{ id: string; name: string; group_count: number; episode_count: number }[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!selected || selected.media_type !== "tv") {
      setEpGroups([])
      return
    }
    let active = true
    fetch(`/api/tmdb/${selected.id}/episode_groups`, {
      headers: tmdbKey ? { "x-api-key": tmdbKey } : undefined,
    })
      .then((res) => res.json())
      .then((data) => {
        if (active) setEpGroups(data.results || [])
      })
      .catch(() => {
        if (active) setEpGroups([])
      })
    return () => { active = false }
  }, [selected, tmdbKey])

  // Reset "saved" feedback after 2s
  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(t)
  }, [saved])

  if (!selected || selected.media_type !== "tv") return null

  const handleSaveEpisodeGroup = async () => {
    if (!selected) return
    if (profileStateless) {
      const { toast } = await import("sonner")
      toast("Funzione non disponibile in modalità stateless")
      return
    }

    setSaving(true)
    try {
      const key = `${selected.media_type}:${selected.id}`
      const existing = mappingsMap.get(key)

      if (existing) {
        // Aggiorna solo episodeGroupId sul mapping esistente
        await http(`/api/mappings/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...existing,
            episodeGroupId: ed.episodeGroupId || null,
          }),
        })
      } else {
        // Crea un mapping minimale solo per l'episodeGroupId
        await http("/api/mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: selected.id,
            mediaType: selected.media_type,
            title: selected.name || selected.title || "",
            posterPath: selected.poster_path || null,
            logoPath: null,
            originalPosterPath: selected.poster_path || null,
            language: null,
            episodeGroupId: ed.episodeGroupId || null,
          }),
        })
      }

      await loadMappings()
      setSaved(true)
      const { toast } = await import("sonner")
      toast("Ordinamento stagioni salvato ✓")
    } catch {
      const { toast } = await import("sonner")
      toast("Errore nel salvataggio")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3.5 text-xs">
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-accent-orange" />
            <span>Ordinamento Parti & Stagioni</span>
          </span>
          {epGroups.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-orange/15 text-accent-orange border border-accent-orange/30">
              {epGroups.length} gruppi
            </span>
          )}
        </div>

        <p className="text-[11px] text-zinc-400">
          Scegli come organizzare le stagioni e le parti della serie in Stremio:
        </p>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => ed.setEpisodeGroupId(null)}
            className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] border transition-all flex items-center justify-between cursor-pointer ${
              !ed.episodeGroupId
                ? "bg-accent-orange/15 text-white border-accent-orange/40 font-semibold"
                : "bg-surface2/40 text-zinc-300 border-surface2 hover:bg-surface2 hover:text-white"
            }`}
          >
            <div className="flex flex-col">
              <span>🪄 Automatico (Italian Parts / Netflix)</span>
              <span className="text-[10px] text-zinc-400">Rileva l&apos;ordinamento streaming italiano consigliato</span>
            </div>
            {!ed.episodeGroupId && <Check className="w-3.5 h-3.5 text-accent-orange shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => ed.setEpisodeGroupId("standard")}
            className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] border transition-all flex items-center justify-between cursor-pointer ${
              ed.episodeGroupId === "standard"
                ? "bg-accent-orange/15 text-white border-accent-orange/40 font-semibold"
                : "bg-surface2/40 text-zinc-300 border-surface2 hover:bg-surface2 hover:text-white"
            }`}
          >
            <div className="flex flex-col">
              <span>📺 Stagioni Standard TMDB</span>
              <span className="text-[10px] text-zinc-400">Ordinamento originale per data di messa in onda</span>
            </div>
            {ed.episodeGroupId === "standard" && <Check className="w-3.5 h-3.5 text-accent-orange shrink-0" />}
          </button>

          {epGroups.map((g) => {
            const isSelected = ed.episodeGroupId === g.id
            return (
              <button
                type="button"
                key={g.id}
                onClick={() => ed.setEpisodeGroupId(g.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] border transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "bg-accent-orange/15 text-white border-accent-orange/40 font-semibold"
                    : "bg-surface2/40 text-zinc-300 border-surface2 hover:bg-surface2 hover:text-white"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-[10px] text-zinc-400">{g.group_count} parti · {g.episode_count} episodi</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent-orange shrink-0" />}
              </button>
            )
          })}

          {epGroups.length === 0 && (
            <p className="text-[11px] text-zinc-500 text-center py-2 italic">
              Nessun gruppo di episodi alternativo disponibile per questa serie.
            </p>
          )}
        </div>

        {/* Bottone Salva dedicato */}
        <button
          type="button"
          onClick={handleSaveEpisodeGroup}
          disabled={saving}
          className={`w-full mt-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 ${
            saved
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "btn-primary"
          }`}
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Salvato!
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvataggio..." : "Salva Ordinamento"}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
