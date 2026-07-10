"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import type { Mapping } from "./types"
import { http } from "./http"
import { t } from "./i18n"

export function useMappingsStore() {
  const [mappings, setMappings] = useState<Mapping[]>([])

  const mappingsMap = useMemo(() => {
    const map = new Map<string, Mapping>()
    for (const m of mappings) {
      map.set(`${m.mediaType}:${m.tmdbId}`, m)
    }
    return map
  }, [mappings])

  const loadMappings = useCallback(async () => {
    try {
      const res = await fetch("/api/mappings")
      const data = await res.json()
      setMappings(data.mappings)
    } catch (e) { console.error("[posterium] Failed to load mappings:", e) }
  }, [])

  useEffect(() => { loadMappings() }, [loadMappings])

  const removeMapping = useCallback(async (m: Mapping) => {
    await http(`/api/mappings/${m.mediaType}:${m.tmdbId}`, { method: "DELETE" })
    setMappings((prev) => prev.filter((x) => !(x.tmdbId === m.tmdbId && x.mediaType === m.mediaType)))
    import("sonner").then(({ toast }) => toast(t("ui.mappingRemoved")))
  }, [])

  const exportData = useCallback(async () => {
    const data = await http("/api/mappings/export")
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "posterium-mappings.json"; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const importData = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"; input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        const res = await fetch("/api/mappings/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings: data.mappings || data }),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => null)
          const msg = errBody?.error || errBody?.details ? Object.values(errBody.details).flat().join("; ") : t("ui.importError")
          import("sonner").then(({ toast }) => toast(msg))
          return
        }
        loadMappings()
        const result = await res.json()
        import("sonner").then(({ toast }) => toast(t("ui.importSuccess", { count: result.count ?? data.mappings?.length ?? data.length })))
      } catch (e) {
        const msg = e instanceof SyntaxError ? t("ui.importError") : (e as Error).message
        import("sonner").then(({ toast }) => toast(msg))
      }
    }
    input.click()
  }, [loadMappings])

  return { mappings, setMappings, mappingsMap, loadMappings, removeMapping, exportData, importData }
}
