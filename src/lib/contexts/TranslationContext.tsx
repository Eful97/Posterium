"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { PosteriumCtx } from "@/lib/context"

/**
 * TranslationCtx — fornisce t() e lang in modo stabile.
 * t è un import, quindi non cambia MAI; lang e pickLang cambiano
 * solo quando l'utente cambia lingua. Perfetto per i consumer
 * che hanno bisogno solo di traduzioni senza abbonarsi a tutto.
 */
export interface TranslationCtx {
  t: (key: string, params?: Record<string, string | number>) => string
  lang: string
  pickLang: (l: string) => void
}

const Ctx = createContext<TranslationCtx | null>(null)

export function useT() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useT must be inside PosteriumProvider")
  return v
}

export function TranslationProvider({
  value,
  children,
}: {
  value: PosteriumCtx
  children: ReactNode
}) {
  const ctx = useMemo<TranslationCtx>(
    () => ({
      t: value.t,
      lang: value.lang,
      pickLang: value.pickLang,
    }),
    [value.t, value.lang, value.pickLang],
  )

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}