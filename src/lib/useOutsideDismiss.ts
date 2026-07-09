"use client"

import { useEffect, type RefObject } from "react"

type OutsideDismissEvent = "click" | "mousedown"

interface OutsideDismissOptions {
  active: boolean
  ref: RefObject<HTMLElement | null>
  onDismiss: () => void
  eventName?: OutsideDismissEvent
  delayMs?: number
  shouldIgnore?: () => boolean
}

export function useOutsideDismiss({
  active,
  ref,
  onDismiss,
  eventName = "click",
  delayMs = 0,
  shouldIgnore,
}: OutsideDismissOptions): void {
  useEffect(() => {
    if (!active) return
    const handler = (event: MouseEvent) => {
      if (shouldIgnore?.()) return
      const target = event.target
      if (target instanceof Node && ref.current && !ref.current.contains(target)) {
        onDismiss()
      }
    }

    const addListener = () => document.addEventListener(eventName, handler)
    if (delayMs > 0) {
      const timer = setTimeout(addListener, delayMs)
      return () => {
        clearTimeout(timer)
        document.removeEventListener(eventName, handler)
      }
    }

    addListener()
    return () => document.removeEventListener(eventName, handler)
  }, [active, delayMs, eventName, onDismiss, ref, shouldIgnore])
}
