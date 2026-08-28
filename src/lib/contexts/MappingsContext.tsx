"use client"
import React, { createContext, useContext, useSyncExternalStore } from "react"
import type { Mapping } from "@/lib/types"

interface MappingsStore {
  value: Mapping[]
  mapValue: Map<string, Mapping>
  listeners: Set<() => void>
}

const MappingsCtx = createContext<MappingsStore | null>(null)

export function MappingsProvider({ value, mapValue, children }: { value: Mapping[]; mapValue: Map<string, Mapping>; children: React.ReactNode }) {
  const storeRef = React.useRef<MappingsStore | null>(null)
  if (!storeRef.current) storeRef.current = { value, mapValue, listeners: new Set() }
  const store = storeRef.current
  store.value = value
  store.mapValue = mapValue
  React.useEffect(() => { store.listeners.forEach((l) => l()) }, [value, mapValue, store])
  return <MappingsCtx.Provider value={store}>{children}</MappingsCtx.Provider>
}

export function useMappingsSelector<T>(selector: (v: Mapping[], m: Map<string, Mapping>) => T): T {
  const store = useContext(MappingsCtx)
  if (!store) throw new Error("useMappingsSelector must be inside MappingsProvider")
  const get = () => selector(store.value, store.mapValue)
  return useSyncExternalStore((cb) => { store.listeners.add(cb); return () => { store.listeners.delete(cb) } }, get, get)
}
