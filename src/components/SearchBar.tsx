"use client"

import React, { useState, useRef, useEffect } from "react"
import { useP } from "@/lib/context"
import { Search, ArrowRight } from "lucide-react"

interface Props {
  tmdbKey: string
  onSearch: (q: string) => void
  large?: boolean
  value?: string
  onChange?: (v: string) => void
  onFocus?: () => void
  onBlur?: () => void
}

export function SearchBar({ tmdbKey, onSearch, large, value, onChange, onFocus, onBlur }: Props) {
  const p = useP()
  const [text, setText] = useState(value || "")
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const h = large ? "h-12" : "h-10"

  useEffect(() => {
    if (value !== undefined) setText(value)
  }, [value])

  return (
    <div role="search" className={`flex items-center ${h} bg-black/50 backdrop-blur-sm border ${focused ? "border-accent/60 shadow-lg shadow-accent/10" : "border-zinc-700/80"} focus-within:border-accent/60 focus-within:shadow-lg focus-within:shadow-accent/10 rounded-2xl transition-all duration-300 group`}>
      <span className="shrink-0 pl-3.5 text-zinc-500 group-focus-within:text-accent transition-colors duration-300" aria-hidden="true"><Search className="w-4 h-4" /></span>
      <input
        suppressHydrationWarning
        ref={inputRef}
        value={text}
        aria-label={large ? p.t("ui.searchAriaLabelLarge") : p.t("ui.searchAriaLabel")}
        onChange={(e) => { setText(e.target.value); onChange?.(e.target.value) }}
        onFocus={() => { setFocused(true); onFocus?.() }}
        onBlur={() => { setFocused(false); onBlur?.() }}
        onKeyDown={(e) => { if (e.key === "Enter" && text.length >= 2 && tmdbKey) { onSearch(text) } }}
        placeholder={large ? p.t("ui.searchPlaceholderLarge") : p.t("ui.searchPlaceholder")}
        className="flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400 focus:placeholder:text-zinc-400 px-2 h-full transition-colors duration-200"
      />
      {text.length > 0 && (
        <button
          type="button"
          aria-label={p.t("ui.searchButton")}
          onClick={() => { if (text.length >= 2 && tmdbKey) { onSearch(text) } }}
          disabled={!tmdbKey}
          className="shrink-0 w-8 h-8 mr-1.5 flex items-center justify-center bg-accent-orange text-white rounded-full hover:shadow-lg hover:shadow-accent-orange/30 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
