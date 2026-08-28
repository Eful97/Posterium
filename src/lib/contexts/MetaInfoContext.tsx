"use client"
import React, { createContext, useContext, useSyncExternalStore } from "react"
import type { MetaInfo } from "@/lib/context"

interface MetaStore {
  value: MetaInfo
  listeners: Set<() => void>
}

const MetaCtx = createContext<MetaStore | null>(null)

export function MetaInfoProvider({ value, children }: { value: MetaInfo; children: React.ReactNode }) {
  const storeRef = React.useRef<MetaStore | null>(null)
  if (!storeRef.current) storeRef.current = { value, listeners: new Set() }
  const store = storeRef.current
  store.value = value
  React.useEffect(() => { store.listeners.forEach((l) => l()) }, [value, store])
  return <MetaCtx.Provider value={store}>{children}</MetaCtx.Provider>
}

export function useMetaSelector<T>(selector: (v: MetaInfo) => T): T {
  const store = useContext(MetaCtx)
  if (!store) throw new Error("useMetaSelector must be inside MetaInfoProvider")
  const get = () => selector(store.value)
  return useSyncExternalStore((cb) => { store.listeners.add(cb); return () => { store.listeners.delete(cb) } }, get, get)
}
