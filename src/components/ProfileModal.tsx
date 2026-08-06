"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import { X, Copy, Check, Lock, Fingerprint, User } from "lucide-react"
import { useP } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { Modal } from "@/components/ui/Modal"

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: Props) {
  const p = useP()
  const { t } = useT()
  const ed = usePosterEditor()
  const [tab, setTab] = useState<"save" | "load">("save")
  const [password, setPassword] = useState("")
  const [loadUuid, setLoadUuid] = useState("")
  const [loadPassword, setLoadPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [uuidCopied, setUuidCopied] = useState(false)
  const [error, setError] = useState("")
  const [generatedUuid, setGeneratedUuid] = useState("")

  React.useEffect(() => {
    if (!p.profileId && !generatedUuid) {
      try { setGeneratedUuid(crypto.randomUUID()) } catch {}
    }
  }, [p.profileId, generatedUuid])

  const activeUuid = p.profileId || generatedUuid

  const handleCopyUuid = async () => {
    if (!activeUuid) return
    try {
      await navigator.clipboard.writeText(activeUuid)
      setUuidCopied(true)
      setTimeout(() => setUuidCopied(false), 2000)
    } catch {
      toast.error(t("ui.saveError"))
    }
  }

  const handleSave = async () => {
    setError("")
    if (!password) {
      setError(t("ui.profilePasswordRequired"))
      return
    }
    setSaving(true)
    try {
      const config = {
        globalBadges: ed.globalBadges,
        rankingBadges: ed.rankingBadges,
        badgeStyle: ed.badgeStyle,
        rankingBadgeStyle: ed.rankingBadgeStyle,
        blurEnabled: ed.blurEnabled,
        blurIntensity: ed.blurIntensity,
        blurFade: ed.blurFade,
        blurDarkness: ed.blurDarkness,
        gradientHeight: ed.gradientHeight,
        networkLogo: ed.networkLogo,
        ribbonSide: ed.ribbonSide,
        autoRotateClean: ed.autoRotateClean,
        logoFitEnabled: ed.defaultLogoFitEnabled,
        customBadge: ed.customBadge || undefined,
      }
      const apiKeys = {
        tmdbKey: p.tmdbKeyInput || undefined,
        mdblistApiKey: p.mdblistApiKey || undefined,
      }
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          apiKeys,
          profileId: activeUuid || undefined,
          password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || (res.status === 401 ? t("ui.profileWrongPassword") : t("ui.saveError")))
        return
      }
      const newProfileId = data.profileId as string
      if (typeof window !== "undefined") {
        try { localStorage.setItem("posterium_profile_id", newProfileId) } catch {}
      }
      p.setProfileId(newProfileId)
      p.setProfilePassword(password)
      toast.success(t("ui.profileSaved"))
      onClose()
    } catch (e) {
      console.error("[posterium] Failed to save profile:", e)
      setError(t("ui.saveError"))
    } finally {
      setSaving(false)
    }
  }

  const handleLoadProfile = async () => {
    setError("")
    const cleanUuid = loadUuid.trim()
    if (!cleanUuid) {
      setError("Inserisci l'UUID del tuo profilo")
      return
    }
    if (!loadPassword) {
      setError(t("ui.profilePasswordRequired"))
      return
    }
    setLoadingProfile(true)
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "load",
          profileId: cleanUuid,
          password: loadPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || (res.status === 401 ? t("ui.profileWrongPassword") : "Profilo non trovato o errore nel caricamento"))
        return
      }

      const loadedId = data.profileId as string
      if (typeof window !== "undefined") {
        try { localStorage.setItem("posterium_profile_id", loadedId) } catch {}
      }
      p.setProfileId(loadedId)
      p.setProfilePassword(loadPassword)

      // Apply loaded config settings if present
      if (data.config) {
        if (typeof data.config.globalBadges === "boolean") ed.setDefaultGlobalBadges(data.config.globalBadges)
        if (typeof data.config.rankingBadges === "boolean") ed.setDefaultRankingBadges(data.config.rankingBadges)
        if (data.config.badgeStyle) ed.setDefaultBadgeStyle(data.config.badgeStyle)
        if (data.config.rankingBadgeStyle) ed.setDefaultRankingBadgeStyle(data.config.rankingBadgeStyle)
        if (typeof data.config.blurEnabled === "boolean") ed.setBlurEnabled(data.config.blurEnabled)
        if (typeof data.config.blurIntensity === "number") ed.setBlurIntensity(data.config.blurIntensity)
        if (typeof data.config.blurFade === "number") ed.setBlurFade(data.config.blurFade)
        if (typeof data.config.blurDarkness === "number") ed.setBlurDarkness(data.config.blurDarkness)
        if (typeof data.config.gradientHeight === "number") ed.setGradientHeight(data.config.gradientHeight)
        if (typeof data.config.networkLogo === "boolean") ed.setNetworkLogo(data.config.networkLogo)
        if (data.config.ribbonSide === "left" || data.config.ribbonSide === "right") ed.setRibbonSide(data.config.ribbonSide)
        if (typeof data.config.autoRotateClean === "boolean") ed.setAutoRotateClean(data.config.autoRotateClean)
        if (typeof data.config.logoFitEnabled === "boolean") ed.setDefaultLogoFitEnabled(data.config.logoFitEnabled)
        if (typeof data.config.customBadge === "string") ed.setCustomBadge(data.config.customBadge)
      }

      if (data.apiKeys?.tmdbKey) {
        p.setTmdbKeyInput(data.apiKeys.tmdbKey)
        p.setTmdbKey(data.apiKeys.tmdbKey)
      }
      if (data.apiKeys?.mdblistApiKey) {
        p.setMdblistApiKey(data.apiKeys.mdblistApiKey)
      }

      toast.success("Profilo caricato con successo!")
      onClose()
    } catch (e) {
      console.error("[posterium] Failed to load profile:", e)
      setError("Errore nel caricamento del profilo")
    } finally {
      setLoadingProfile(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnEscape={!!p.profileId} closeOnBackdrop={!!p.profileId} labelledBy="profile-modal-title">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent-orange/15 text-accent-orange border border-accent-orange/20">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 id="profile-modal-title" className="text-base font-bold text-white">{t("ui.profileTitle")}</h3>
            <p className="text-xs text-zinc-400">{!p.profileId ? "Crea o accedi ad un profilo per iniziare" : t("ui.profileSubtitle")}</p>
          </div>
        </div>
        {p.profileId && (
          <button type="button"
            aria-label="Chiudi"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-black/40 border border-white/10 p-1">
          <button
            type="button"
            onClick={() => setTab("save")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "save" ? "bg-accent-orange/20 text-accent-orange border border-accent-orange/30" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {p.profileId ? "Salva Profilo" : "Nuovo Profilo"}
          </button>
          <button
            type="button"
            onClick={() => setTab("load")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "load" ? "bg-accent-orange/20 text-accent-orange border border-accent-orange/30" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Accedi a Profilo Esistente
          </button>
        </div>

        {tab === "save" ? (
          <>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent-orange" />
                {t("ui.profileUuidLabel")}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-zinc-200 truncate">
                  {activeUuid || "Generazione UUID..."}
                </div>
                {activeUuid && (
                  <button
                    type="button"
                    onClick={handleCopyUuid}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] text-zinc-400 hover:text-zinc-200 transition-all active:scale-90"
                    title="Copia UUID"
                  >
                    {uuidCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {p.profileId && (
              <div className="space-y-2 p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-zinc-300 space-y-2">
                <div className="font-semibold text-accent-orange">📌 Link per AIOMetadata & Stremio:</div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/60 border border-white/5">
                  <div className="truncate font-mono text-[10px] text-zinc-300">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/poster/{type}/{imdb_id}?u=${activeUuid}` : ""}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof window !== "undefined") {
                        await navigator.clipboard.writeText(`${window.location.origin}/api/poster/{type}/{imdb_id}?u=${activeUuid}`)
                        toast.success(t("ui.copied"))
                      }
                    }}
                    className="px-2 py-1 text-[10px] font-semibold rounded bg-white/10 hover:bg-accent-orange/20 text-zinc-200 hover:text-accent-orange shrink-0"
                  >
                    AIOMetadata
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/60 border border-white/5">
                  <div className="truncate font-mono text-[10px] text-zinc-300">
                    {typeof window !== "undefined" ? `${window.location.origin}/manifest.json?u=${activeUuid}` : ""}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof window !== "undefined") {
                        await navigator.clipboard.writeText(`${window.location.origin}/manifest.json?u=${activeUuid}`)
                        toast.success(t("ui.copied"))
                      }
                    }}
                    className="px-2 py-1 text-[10px] font-semibold rounded bg-white/10 hover:bg-accent-orange/20 text-zinc-200 hover:text-accent-orange shrink-0"
                  >
                    Stremio Addon
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent-orange" />
                {t("ui.profilePasswordLabel")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
                placeholder={t("ui.profilePasswordPlaceholder")}
                className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-accent-orange/60"
                autoComplete="new-password"
              />
              <p className="text-[10px] text-zinc-500 leading-relaxed">{t("ui.profilePasswordHint")}</p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !password}
              className="w-full h-11 text-sm font-bold rounded-xl btn-primary flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? t("ui.saving") : t("ui.saveProfile")}
            </button>
            {error && (
              <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-[11px] text-red-300 text-center">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
            >
              {p.profileId ? "Annulla" : "Continua senza profilo"}
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent-orange" />
                UUID Profilo Esistente
              </label>
              <input
                type="text"
                value={loadUuid}
                onChange={(e) => { setLoadUuid(e.target.value); setError("") }}
                placeholder="550e8400-e29b-41d4-a716-446655440000"
                className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-accent-orange/60"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent-orange" />
                Password del Profilo
              </label>
              <input
                type="password"
                value={loadPassword}
                onChange={(e) => { setLoadPassword(e.target.value); setError("") }}
                placeholder="La tua password"
                className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-accent-orange/60"
                autoComplete="current-password"
              />
            </div>

            <button
              type="button"
              onClick={handleLoadProfile}
              disabled={loadingProfile || !loadUuid.trim() || !loadPassword}
              className="w-full h-11 text-sm font-bold rounded-xl btn-primary flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
            >
              {loadingProfile ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <User className="w-4 h-4" />
              )}
              {loadingProfile ? "Caricamento in corso..." : "Accedi & Carica Profilo"}
            </button>
            {error && (
              <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-[11px] text-red-300 text-center">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
            >
              Annulla
            </button>
          </>
        )}
    </Modal>
  )
}
