"use client"

import { useState } from "react"
import { useT } from "@/lib/contexts/TranslationContext"
import { LANG_FLAGS, LANG_NAMES } from "@/lib/utils"
import { Eye, EyeOff, Key, ArrowRight, Check } from "lucide-react"

interface Props {
  tmdbKeyInput: string
  setTmdbKeyInput: (v: string) => void
  setTmdbKey: (v: string) => void
  onOpenFull: () => void
}

/**
 * Popup "Impostazioni rapide" (da prototipo Open Design): lingua + chiave TMDB
 * con invio rapido + link al pannello completo.
 */
export function QuickSettings({ tmdbKeyInput, setTmdbKeyInput, setTmdbKey, onOpenFull }: Props) {
  const { t, lang, pickLang } = useT()
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveKey = () => {
    setTmdbKey(tmdbKeyInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="p-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted px-2 pt-1 pb-1.5">
        {t("ui.quickSettingsTitle")}
      </p>
      <div className="flex flex-col">
        {Object.entries(LANG_NAMES)
          .filter(([k]) => k !== "xx")
          .map(([code, name]) => (
            <button
              type="button"
              key={code}
              onClick={() => pickLang(code)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-150 text-left hover:bg-zinc-700/50 active:scale-[0.98] ${code === lang ? "bg-accent/10 text-accent font-medium" : "text-zinc-300"}`}
            >
              <span className="w-6 text-center">{LANG_FLAGS[code]}</span>
              <span className="flex-1">{name}</span>
              {code === lang && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
      </div>
      <div className="h-px bg-white/10 my-2" />
      <div className="flex items-center gap-1.5 px-1">
        <Key className="w-3.5 h-3.5 text-muted shrink-0" />
        <input
          type={show ? "text" : "password"}
          value={tmdbKeyInput}
          onChange={(e) => setTmdbKeyInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveKey() }}
          placeholder={t("ui.tmdbKeyPlaceholder")}
          aria-label={t("ui.tmdbKey")}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 min-w-0 bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-accent-orange placeholder:text-zinc-500 transition-colors duration-150"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t("ui.hideKey") : t("ui.showKey")}
          className="shrink-0 p-1.5 rounded-lg text-muted hover:text-zinc-200 hover:bg-white/[0.08] active:scale-90 transition-all duration-150"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-muted px-2 py-1">
        {saved ? t("ui.saved") : t("ui.quickSettingsEnterHint")}
      </p>
      <div className="h-px bg-white/10 my-2" />
      <button
        type="button"
        onClick={onOpenFull}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-150"
      >
        <span className="flex-1 text-left font-medium">{t("ui.quickSettingsFull")}</span>
        <ArrowRight className="w-3.5 h-3.5 text-muted" />
      </button>
    </div>
  )
}
