"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Contatore animato (count-up) per valori numerici premium: al mount parte da
 * 0 e sale fino a `target`; quando `target` cambia scorre dal valore
 * precedente. Easing ease-out.
 *
 * Rispetta `prefers-reduced-motion`; in ambienti senza matchMedia (jsdom nei
 * test) mostra subito il valore finale per non rompere le asserzioni.
 */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const reduced =
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      fromRef.current = target
      setValue(target)
      return
    }
    const from = fromRef.current
    const delta = target - from
    if (delta === 0) return

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + delta * eased))
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
