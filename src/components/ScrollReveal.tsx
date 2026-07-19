"use client"

import { useRef, useEffect, type ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  animation?: "fade-up" | "fade-up-fast" | "scale-in-subtle" | "slide-in-left-subtle"
  delay?: number
  threshold?: number
  as?: "div" | "section"
}

export function ScrollReveal({
  children,
  className = "",
  animation = "fade-up",
  delay = 0,
  threshold = 0.1,
  as: Tag = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("visible")
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) {
            el.style.animationDelay = `${delay}ms`
          }
          el.classList.add("visible")
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay, threshold])

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLElement>}
      className={`reveal-${animation === "fade-up" ? "up" : animation} ${className}`}
    >
      {children}
    </Tag>
  )
}
