"use client"

import { useState, useCallback, useEffect } from "react"
import type { CustomCatalogConfig } from "./types"
import { POSTERIUM_CATALOGS } from "./catalog-definitions"

export function useCustomCatalogs(
  safeGetItem: (key: string) => string | null,
  safeSetItem: (key: string, val: string) => void
) {
  const [customCatalogs, setCustomCatalogsState] = useState<CustomCatalogConfig[]>([])
  const [disabledCatalogIds, setDisabledCatalogIdsState] = useState<string[]>([])
  const [catalogOrder, setCatalogOrderState] = useState<string[]>([])
  const [catalogRenames, setCatalogRenamesState] = useState<Record<string, string>>({})

  // Initial load
  useEffect(() => {
    const savedCustomCats = safeGetItem("posterium_custom_catalogs")
    if (savedCustomCats) {
      try { setCustomCatalogsState(JSON.parse(savedCustomCats)) } catch {}
    }
    const savedDisabledCats = safeGetItem("posterium_disabled_catalogs")
    if (savedDisabledCats) {
      try { setDisabledCatalogIdsState(JSON.parse(savedDisabledCats)) } catch {}
    }
    const savedOrder = safeGetItem("posterium_catalog_order")
    if (savedOrder) {
      try { setCatalogOrderState(JSON.parse(savedOrder)) } catch {}
    }
    const savedRenames = safeGetItem("posterium_catalog_renames")
    if (savedRenames) {
      try { setCatalogRenamesState(JSON.parse(savedRenames)) } catch {}
    }
  }, [safeGetItem])

  const setCustomCatalogs = useCallback((catalogs: CustomCatalogConfig[]) => {
    setCustomCatalogsState(catalogs)
    safeSetItem("posterium_custom_catalogs", JSON.stringify(catalogs))
  }, [safeSetItem])

  const addCustomCatalog = useCallback((catalog: Omit<CustomCatalogConfig, "id">) => {
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setCustomCatalogsState((prev) => {
      const next = [...prev, { ...catalog, id }]
      safeSetItem("posterium_custom_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const removeCustomCatalog = useCallback((id: string) => {
    setCustomCatalogsState((prev) => {
      const next = prev.filter((c) => c.id !== id)
      safeSetItem("posterium_custom_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const toggleCustomCatalog = useCallback((id: string) => {
    setCustomCatalogsState((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
      safeSetItem("posterium_custom_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const setDisabledCatalogIds = useCallback((ids: string[]) => {
    setDisabledCatalogIdsState(ids)
    safeSetItem("posterium_disabled_catalogs", JSON.stringify(ids))
  }, [safeSetItem])

  const toggleBuiltinCatalog = useCallback((id: string) => {
    setDisabledCatalogIdsState((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      safeSetItem("posterium_disabled_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const setCatalogOrder = useCallback((order: string[]) => {
    setCatalogOrderState(order)
    safeSetItem("posterium_catalog_order", JSON.stringify(order))
  }, [safeSetItem])

  const moveCatalog = useCallback((id: string, direction: "up" | "down") => {
    setCatalogOrderState((prev) => {
      const allIds: string[] = []
      const existing = new Set<string>()
      prev.forEach((catId) => {
        allIds.push(catId)
        existing.add(catId)
      })
      POSTERIUM_CATALOGS.forEach((c) => {
        if (!existing.has(c.id)) {
          allIds.push(c.id)
          existing.add(c.id)
        }
      })
      customCatalogs.forEach((c) => {
        if (c.type === "mixed") {
          const mId = `posterium-custom-movie-${c.id}`
          const sId = `posterium-custom-series-${c.id}`
          if (!existing.has(mId)) { allIds.push(mId); existing.add(mId) }
          if (!existing.has(sId)) { allIds.push(sId); existing.add(sId) }
        } else {
          const cId = `posterium-custom-${c.type}-${c.id}`
          if (!existing.has(cId)) { allIds.push(cId); existing.add(cId) }
        }
      })

      const idx = allIds.indexOf(id)
      if (idx === -1) return prev
      const targetIdx = direction === "up" ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= allIds.length) return allIds

      const next = [...allIds]
      const [item] = next.splice(idx, 1)
      next.splice(targetIdx, 0, item)
      safeSetItem("posterium_catalog_order", JSON.stringify(next))
      return next
    })
  }, [customCatalogs, safeSetItem])

  const setCatalogRenames = useCallback((renames: Record<string, string>) => {
    setCatalogRenamesState(renames)
    safeSetItem("posterium_catalog_renames", JSON.stringify(renames))
  }, [safeSetItem])

  const renameCatalog = useCallback((id: string, newName: string) => {
    setCatalogRenamesState((prev) => {
      const next = { ...prev, [id]: newName }
      if (!newName.trim()) delete next[id]
      safeSetItem("posterium_catalog_renames", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const resetCatalogNames = useCallback(() => {
    setCatalogRenamesState({})
    try { localStorage.removeItem("posterium_catalog_renames") } catch {}
  }, [])

  const resetCatalogOrder = useCallback(() => {
    setCatalogOrderState([])
    try { localStorage.removeItem("posterium_catalog_order") } catch {}
  }, [])

  return {
    customCatalogs,
    setCustomCatalogs,
    addCustomCatalog,
    removeCustomCatalog,
    toggleCustomCatalog,
    disabledCatalogIds,
    setDisabledCatalogIds,
    toggleBuiltinCatalog,
    catalogOrder,
    setCatalogOrder,
    moveCatalog,
    catalogRenames,
    setCatalogRenames,
    renameCatalog,
    resetCatalogNames,
    resetCatalogOrder,
  }
}
