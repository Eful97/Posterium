"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { PosteriumUserConfig } from "./config-token"

export interface UseProfileAuthProps {
  safeGetItem: (key: string) => string | null
  safeSetItem: (key: string, val: string) => void
  setTmdbKey: (val: string) => void
  setTmdbKeyInput: (val: string) => void
  setMdblistApiKey: (val: string) => void
  applyProfileConfig: (config: PosteriumUserConfig) => void
}

export function useProfileAuth({
  safeGetItem,
  safeSetItem,
  setTmdbKey,
  setTmdbKeyInput,
  setMdblistApiKey,
  applyProfileConfig,
}: UseProfileAuthProps) {
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profilePassword, setProfilePassword] = useState("")
  const [profileStateless, setProfileStateless] = useState(false)
  const [profileConfigToken, setProfileConfigToken] = useState<string | null>(null)
  const [profileLocked, setProfileLocked] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileModalSuppressed, setProfileModalSuppressed] = useState(false)
  const savedProfileIdRef = useRef<string | null>(null)

  const loadProfile = useCallback(async (uuid: string, password: string): Promise<void> => {
    if (safeGetItem("posterium_profile_id") === uuid && safeGetItem("posterium_profile_stateless") === "1") {
      const savedToken = safeGetItem("posterium_profile_config_token")
      const savedConfig = safeGetItem("posterium_profile_config")
      if (savedToken) setProfileConfigToken(savedToken)
      setProfileStateless(true)
      setProfileId(uuid)
      if (savedConfig) {
        try {
          applyProfileConfig(JSON.parse(savedConfig) as PosteriumUserConfig)
        } catch {
          // Config corrotta
        }
      }
      savedProfileIdRef.current = null
      return
    }
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load", profileId: uuid, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      const err = data.error || (res.status === 401 ? "Password errata" : "Profilo non trovato")
      throw new Error(err)
    }
    const loadedId = data.profileId as string
    safeSetItem("posterium_profile_id", loadedId)
    setProfileId(loadedId)
    setProfilePassword(password)
    safeSetItem("posterium_profile_password", password)
    savedProfileIdRef.current = null

    if (data.config) {
      applyProfileConfig(data.config as PosteriumUserConfig)
    }
    if (data.apiKeys?.tmdbKey) {
      setTmdbKeyInput(data.apiKeys.tmdbKey)
      setTmdbKey(data.apiKeys.tmdbKey)
    }
    if (data.apiKeys?.mdblistApiKey) setMdblistApiKey(data.apiKeys.mdblistApiKey)
  }, [safeGetItem, safeSetItem, setTmdbKey, setTmdbKeyInput, setMdblistApiKey, applyProfileConfig])

  // Initialize and check saved profile on mount
  useEffect(() => {
    const savedProfileId = safeGetItem("posterium_profile_id")
    const savedStateless = safeGetItem("posterium_profile_stateless") === "1"
    const savedPassword = safeGetItem("posterium_profile_password")

    if (savedProfileId) {
      savedProfileIdRef.current = savedProfileId
      void (async () => {
        // Se abbiamo la password salvata, tentiamo il login automatico immediato
        if (savedPassword) {
          try {
            await loadProfile(savedProfileId, savedPassword)
            setProfileLocked(false)
            return
          } catch {
            // Password non valida o cambiata sul server
          }
        }

        setProfileLocked(true)
        try {
          const res = await fetch(`/api/profile?u=${encodeURIComponent(savedProfileId)}`, {
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) {
            const data = await res.json()
            if (data && data.hasPassword === true) {
              try { localStorage.removeItem("posterium_profile_stateless") } catch {}
              try { localStorage.removeItem("posterium_profile_config_token") } catch {}
              return
            }
            savedProfileIdRef.current = null
            setProfileLocked(false)
            setProfileModalSuppressed(true)
            setProfileId(null)
            return
          }
          if (savedStateless) {
            savedProfileIdRef.current = null
            setProfileLocked(false)
            setProfileId(savedProfileId)
            setProfileStateless(true)
            const savedToken = safeGetItem("posterium_profile_config_token")
            if (savedToken) setProfileConfigToken(savedToken)
            const savedConfig = safeGetItem("posterium_profile_config")
            if (savedConfig) {
              try {
                applyProfileConfig(JSON.parse(savedConfig) as PosteriumUserConfig)
              } catch {
                // Config corrotta
              }
            }
          } else {
            try { localStorage.removeItem("posterium_profile_id") } catch {}
            try { localStorage.removeItem("posterium_profile_password") } catch {}
            savedProfileIdRef.current = null
            setProfileLocked(false)
            setProfileModalSuppressed(true)
            setProfileId(null)
          }
        } catch {
          if (savedStateless) {
            savedProfileIdRef.current = null
            setProfileLocked(false)
            setProfileId(savedProfileId)
            setProfileStateless(true)
            const savedToken = safeGetItem("posterium_profile_config_token")
            if (savedToken) setProfileConfigToken(savedToken)
            const savedConfig = safeGetItem("posterium_profile_config")
            if (savedConfig) {
              try {
                applyProfileConfig(JSON.parse(savedConfig) as PosteriumUserConfig)
              } catch {
                // ignora
              }
            }
          }
        }
      })()
    }
  }, [safeGetItem, applyProfileConfig, loadProfile])

  const unlockProfile = useCallback(async (password: string) => {
    if (!savedProfileIdRef.current) return
    setProfileLoading(true)
    setProfileLoadError("")
    try {
      await loadProfile(savedProfileIdRef.current, password)
      setProfileLocked(false)
    } catch (error) {
      setProfileLoadError(error instanceof Error ? error.message : "Errore")
    } finally {
      setProfileLoading(false)
    }
  }, [loadProfile])

  const setProfilePasswordPersist = useCallback((v: string) => {
    setProfilePassword(v)
    safeSetItem("posterium_profile_password", v)
  }, [safeSetItem])

  const dismissProfileLock = useCallback(() => {
    try { localStorage.removeItem("posterium_profile_id") } catch {}
    try { localStorage.removeItem("posterium_profile_stateless") } catch {}
    try { localStorage.removeItem("posterium_profile_config_token") } catch {}
    try { localStorage.removeItem("posterium_profile_config") } catch {}
    savedProfileIdRef.current = null
    setProfileStateless(false)
    setProfileConfigToken(null)
    setProfileLocked(false)
    setProfileModalSuppressed(true)
  }, [])

  return {
    profileId,
    setProfileId,
    profilePassword,
    setProfilePassword: setProfilePasswordPersist,
    profileStateless,
    setProfileStateless,
    profileConfigToken,
    setProfileConfigToken,
    profileLocked,
    setProfileLocked,
    profileLoadError,
    profileLoading,
    profileModalSuppressed,
    loadProfile,
    unlockProfile,
    dismissProfileLock,
  }
}
