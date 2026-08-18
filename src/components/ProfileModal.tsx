"use client"

import React, { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { X, Copy, Check, Lock, Fingerprint, User } from "lucide-react"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { Modal } from "@/components/ui/Modal"
import { ProfileTabs } from "@/components/ProfileTabs"

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: Props) {
  const profileId = usePSelector((v) => v.profileId)
  const tmdbKeyInput = usePSelector((v) => v.tmdbKeyInput)
  const mdblistApiKey = usePSelector((v) => v.mdblistApiKey)
  const setProfileId = usePSelector((v) => v.setProfileId)
  const setProfilePassword = usePSelector((v) => v.setProfilePassword)
  const setProfileStateless = usePSelector((v) => v.setProfileStateless)
  const setProfileConfigToken = usePSelector((v) => v.setProfileConfigToken)
  const profileStateless = usePSelector((v) => v.profileStateless)
  const profileConfigToken = usePSelector((v) => v.profileConfigToken)
  const loadProfile = usePSelector((v) => v.loadProfile)
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
  // Fix L30: timer del "copied" ripulito su unmount (setState post-unmount).
  const uuidCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => { if (uuidCopiedTimerRef.current) clearTimeout(uuidCopiedTimerRef.current) }
  }, [])

  React.useEffect(() => {
    if (!profileId && !generatedUuid) {
      try { setGeneratedUuid(crypto.randomUUID()) } catch {}
    }
  }, [profileId, generatedUuid])

  const activeUuid = profileId || generatedUuid

  const handleCopyUuid = async () => {
    if (!activeUuid) return
    try {
      await navigator.clipboard.writeText(activeUuid)
      setUuidCopied(true)
      if (uuidCopiedTimerRef.current) clearTimeout(uuidCopiedTimerRef.current)
      uuidCopiedTimerRef.current = setTimeout(() => setUuidCopied(false), 2000)
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
        tmdbKey: tmdbKeyInput || undefined,
        mdblistApiKey: mdblistApiKey || undefined,
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
      setProfileId(newProfileId)
      if (data.stateless === true) {
        // Profilo STATELESS (nessuno storage server): config e token firmato
        // vivono in localStorage; il link condiviso usa `?config=`.
        const token = data.configToken as string
        setProfileStateless(true)
        setProfileConfigToken(token)
        if (typeof window !== "undefined") {
          try { localStorage.setItem("posterium_profile_stateless", "1") } catch {}
          try { localStorage.setItem("posterium_profile_config_token", token) } catch {}
          try { localStorage.setItem("posterium_profile_config", JSON.stringify(config)) } catch {}
        }
        toast.success(t("ui.profileStatelessSaved"))
      } else {
        setProfileStateless(false)
        setProfileConfigToken(null)
        setProfilePassword(password)
        toast.success(t("ui.profileSaved"))
      }
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
      // Usa la logica condivisa (verifica password + applica config/chiavi + attiva profilo).
      await loadProfile(cleanUuid, loadPassword)
      toast.success(t("ui.profileLoaded") ?? "Profilo caricato con successo!")
      onClose()
    } catch (e) {
      console.error("[posterium] Failed to load profile:", e)
      setError(e instanceof Error ? e.message : t("ui.loadError"))
    } finally {
      setLoadingProfile(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnEscape={!!profileId} closeOnBackdrop={!!profileId} labelledBy="profile-modal-title">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent-orange/15 text-accent-orange border border-accent-orange/20">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 id="profile-modal-title" className="text-base font-bold text-white">{t("ui.profileTitle")}</h3>
            <p className="text-xs text-muted">{!profileId ? t("ui.profileCreateOrAccess") : t("ui.profileSubtitle")}</p>
          </div>
        </div>
        {profileId && (
          <button type="button"
            aria-label={t("ui.close")}
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

        {/* Tab switcher */}
        <ProfileTabs tab={tab} onTabChange={setTab} hasProfile={!!profileId} />

        {tab === "save" ? (
          <>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent-orange" />
                {t("ui.profileUuidLabel")}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-zinc-200 truncate">
                  {activeUuid || t("ui.uuidGenerating")}
                </div>
                {activeUuid && (
                  <button
                    type="button"
                    onClick={handleCopyUuid}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] text-muted hover:text-zinc-200 transition-all active:scale-90"
                    title={t("ui.copyUuid")}
                  >
                    {uuidCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {profileId && (
              <div className="space-y-2 p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-zinc-300 space-y-2">
                <div className="font-semibold text-accent-orange">📌 {t("ui.aiomLinkTitle")}</div>
                {profileStateless && profileConfigToken ? (
                  // Profilo stateless: il link usa `?config=` (nessun server).
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/60 border border-white/5">
                    <div className="truncate font-mono text-[10px] text-zinc-300">
                      {typeof window !== "undefined" ? `${window.location.origin}/api/poster/{type}/{imdb_id}?config=${profileConfigToken}` : ""}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (typeof window !== "undefined") {
                          await navigator.clipboard.writeText(`${window.location.origin}/api/poster/{type}/{imdb_id}?config=${profileConfigToken}`)
                          toast.success(t("ui.copied"))
                        }
                      }}
                      className="px-2 py-1 text-[10px] font-semibold rounded bg-white/10 hover:bg-accent-orange/20 text-zinc-200 hover:text-accent-orange shrink-0"
                    >
                      AIOMetadata
                    </button>
                  </div>
                ) : (
                  <>
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
                        {typeof window !== "undefined" ? `${window.location.origin}/u/${activeUuid}/manifest.json` : ""}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (typeof window !== "undefined") {
                            await navigator.clipboard.writeText(`${window.location.origin}/u/${activeUuid}/manifest.json`)
                            toast.success(t("ui.copied"))
                          }
                        }}
                        className="px-2 py-1 text-[10px] font-semibold rounded bg-white/10 hover:bg-accent-orange/20 text-zinc-200 hover:text-accent-orange shrink-0"
                      >
                        Stremio Addon
                      </button>
                    </div>
                  </>
                )}
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
              {profileId ? t("ui.cancel") : t("ui.continueWithoutProfile")}
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent-orange" />
                {t("ui.existingProfileUuid")}
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
                {t("ui.profilePasswordLabel")}
              </label>
              <input
                type="password"
                value={loadPassword}
                onChange={(e) => { setLoadPassword(e.target.value); setError("") }}
                placeholder={t("ui.profileYourPassword")}
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
              {loadingProfile ? t("ui.loading") : t("ui.loadAndAccess")}
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
