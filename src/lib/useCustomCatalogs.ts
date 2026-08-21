"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { CustomCatalogConfig } from "./types"
import { POSTERIUM_CATALOGS } from "./catalog-definitions"

export function useCustomCatalogs(
  safeGetItem: (key: string) => string | null,
  safeSetItem: (key: string, val: string) => void
) {
  const [customCatalogs, setCustomCatalogsState] = useState<CustomCatalogConfig[]>([])
  const [disabledCatalogIds, setDisabledCatalogIdsState] = useState<string[]>([])
  const [homeDisabledCatalogIds, setHomeDisabledCatalogIdsState] = useState<string[]>([])
  const [catalogOrder, setCatalogOrderState] = useState<string[]>([])
  const [catalogRenames, setCatalogRenamesState] = useState<Record<string, string>>({})
  const lastSyncRef = useRef<string>("")

  // Initial load: localStorage + fetch /api/defaults
  useEffect(() => {
    let localCustom: CustomCatalogConfig[] = []
    let localDisabled: string[] = []
    let localHomeDisabled: string[] = []
    let localOrder: string[] = []
    let localRenames: Record<string, string> = {}

    const savedCustomCats = safeGetItem("posterium_custom_catalogs")
    if (savedCustomCats) {
      try { localCustom = JSON.parse(savedCustomCats); setCustomCatalogsState(localCustom) } catch {}
    }
    const savedDisabledCats = safeGetItem("posterium_disabled_catalogs")
    if (savedDisabledCats) {
      try { localDisabled = JSON.parse(savedDisabledCats); setDisabledCatalogIdsState(localDisabled) } catch {}
    }
    const savedHomeDisabledCats = safeGetItem("posterium_home_disabled_catalogs")
    if (savedHomeDisabledCats) {
      try { localHomeDisabled = JSON.parse(savedHomeDisabledCats); setHomeDisabledCatalogIdsState(localHomeDisabled) } catch {}
    }
    const savedOrder = safeGetItem("posterium_catalog_order")
    if (savedOrder) {
      try { localOrder = JSON.parse(savedOrder); setCatalogOrderState(localOrder) } catch {}
    }
    const savedRenames = safeGetItem("posterium_catalog_renames")
    if (savedRenames) {
      try { localRenames = JSON.parse(savedRenames); setCatalogRenamesState(localRenames) } catch {}
    }

    lastSyncRef.current = JSON.stringify({
      customCatalogs: localCustom,
      disabledCatalogIds: localDisabled,
      homeDisabledCatalogIds: localHomeDisabled,
      catalogOrder: localOrder,
      catalogRenames: localRenames,
    })

    // Hydrate missing or server-configured defaults
    fetch("/api/defaults")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        if (Array.isArray(data.customCatalogs) && (!savedCustomCats || localCustom.length === 0)) {
          setCustomCatalogsState(data.customCatalogs)
          safeSetItem("posterium_custom_catalogs", JSON.stringify(data.customCatalogs))
        }
        if (Array.isArray(data.disabledCatalogIds) && (!savedDisabledCats || localDisabled.length === 0)) {
          setDisabledCatalogIdsState(data.disabledCatalogIds)
          safeSetItem("posterium_disabled_catalogs", JSON.stringify(data.disabledCatalogIds))
        }
        if (Array.isArray(data.homeDisabledCatalogIds) && (!savedHomeDisabledCats || localHomeDisabled.length === 0)) {
          setHomeDisabledCatalogIdsState(data.homeDisabledCatalogIds)
          safeSetItem("posterium_home_disabled_catalogs", JSON.stringify(data.homeDisabledCatalogIds))
        }
        if (Array.isArray(data.catalogOrder) && (!savedOrder || localOrder.length === 0)) {
          setCatalogOrderState(data.catalogOrder)
          safeSetItem("posterium_catalog_order", JSON.stringify(data.catalogOrder))
        }
        if (data.catalogRenames && typeof data.catalogRenames === "object" && (!savedRenames || Object.keys(localRenames).length === 0)) {
          setCatalogRenamesState(data.catalogRenames)
          safeSetItem("posterium_catalog_renames", JSON.stringify(data.catalogRenames))
        }
      })
      .catch(() => {})
  }, [safeGetItem, safeSetItem])

  // Auto-persist: sincronizza su server (/api/defaults) ad ogni modifica
  useEffect(() => {
    const payload = {
      customCatalogs,
      disabledCatalogIds,
      homeDisabledCatalogIds,
      catalogOrder,
      catalogRenames,
    }
    const payloadStr = JSON.stringify(payload)
    if (lastSyncRef.current === payloadStr) return
    lastSyncRef.current = payloadStr

    const timer = setTimeout(() => {
      fetch("/api/defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payloadStr,
      }).catch((e) => {
        lastSyncRef.current = ""
        console.warn("[catalogs] Auto-sync custom catalogs failed:", e)
      })
    }, 400)

    return () => clearTimeout(timer)
  }, [customCatalogs, disabledCatalogIds, homeDisabledCatalogIds, catalogOrder, catalogRenames])

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

  const setHomeDisabledCatalogIds = useCallback((ids: string[]) => {
    setHomeDisabledCatalogIdsState(ids)
    safeSetItem("posterium_home_disabled_catalogs", JSON.stringify(ids))
  }, [safeSetItem])

  const toggleCatalogHome = useCallback((id: string) => {
    setHomeDisabledCatalogIdsState((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      safeSetItem("posterium_home_disabled_catalogs", JSON.stringify(next))
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
    homeDisabledCatalogIds,
    setHomeDisabledCatalogIds,
    toggleCatalogHome,
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
