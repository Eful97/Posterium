"use client"

import { useState } from "react"
import { Fingerprint, Lock, ArrowRight } from "lucide-react"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"

/**
 * Overlay di ri-autenticazione del profilo al rientro (stile AIOMetadata):
 * il profilo salvato richiede la password prima di essere usato/sincronizzato.
 */
export function ProfileUnlock() {
  const { t } = useT()
  const profileLoadError = usePSelector((v) => v.profileLoadError)
  const profileLoading = usePSelector((v) => v.profileLoading)
  const unlockProfile = usePSelector((v) => v.unlockProfile)
  const dismissProfileLock = usePSelector((v) => v.dismissProfileLock)
  const [password, setPassword] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    await unlockProfile(password)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Accesso al profilo"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl space-y-5 select-text">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent-orange/15 text-accent-orange border border-accent-orange/20">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t("ui.profileTitle")}</h2>
            <p className="text-xs text-muted">{t("ui.profileUnlockHint") ?? "Inserisci la password del profilo salvato"}</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs text-muted mb-1 block flex items-center gap-1.5"><Lock className="w-3 h-3" /> Password</span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border text-sm text-foreground focus:outline-none focus:border-accent-orange/50"
            />
          </label>

          {profileLoadError && (
            <p className="text-xs text-danger">{profileLoadError}</p>
          )}

          <button
            type="submit"
            disabled={profileLoading || !password}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent-orange text-white text-sm font-semibold disabled:opacity-50 hover:bg-accent-orange/90 transition-all"
          >
            {profileLoading ? "…" : <><ArrowRight className="w-4 h-4" /> {t("ui.profileUnlock") ?? "Accedi"}</>}
          </button>
        </form>

        <button
          type="button"
          onClick={dismissProfileLock}
          className="w-full text-center text-xs text-muted hover:text-zinc-200 transition-colors py-1"
        >
          {t("ui.continueWithoutProfile") ?? "Continua senza profilo"}
        </button>
      </div>
    </div>
  )
}
