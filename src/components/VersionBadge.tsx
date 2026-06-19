"use client"

import { useState, useEffect, useCallback } from "react"

const CURRENT_VERSION = "0.5.6"
const REPO = "Eful97/Posterium"
const CHECK_TTL = 60 * 60 * 1000

async function fetchLatestTag(): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/tags?per_page=1`, {
    headers: { Accept: "application/vnd.github.v3+json" },
    signal: AbortSignal.timeout(5000),
  })
  if (res.ok) {
    const data = await res.json()
    return data?.[0]?.name?.replace(/^v/, "") || null
  }
  const rel = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github.v3+json" },
    signal: AbortSignal.timeout(5000),
  })
  if (rel.ok) {
    const data = await rel.json()
    return data?.tag_name?.replace(/^v/, "") || null
  }
  return null
}

async function getLatestVersion(force = false): Promise<string | null> {
  try {
    const cached = localStorage.getItem("posterium:latest")
    if (!force && cached) {
      const { tag, ts } = JSON.parse(cached)
      if (Date.now() - ts < CHECK_TTL) return tag
    }
    const tag = await fetchLatestTag()
    if (tag) localStorage.setItem("posterium:latest", JSON.stringify({ tag, ts: Date.now() }))
    return tag
  } catch {
    return null
  }
}

export function VersionBadge() {
  const [updateTag, setUpdateTag] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    localStorage.removeItem("posterium:tag")
    getLatestVersion().then((tag) => {
      if (tag && tag !== CURRENT_VERSION) setUpdateTag(tag)
    })
  }, [])

  const handleCheck = useCallback(async () => {
    setChecking(true)
    const tag = await getLatestVersion(true)
    if (tag && tag !== CURRENT_VERSION) setUpdateTag(tag)
    else setUpdateTag(null)
    setChecking(false)
  }, [])

  return (
    <div className="fixed top-2 left-3 z-50 flex items-center gap-2">
      <span className="text-xs text-zinc-400 font-mono bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">v{CURRENT_VERSION}</span>
      <button
        onClick={handleCheck}
        title="Controlla aggiornamenti"
        className={`text-xs text-zinc-500 hover:text-accent active:scale-90 transition-all duration-150 ${checking ? "animate-spin" : ""}`}
      >
        ↻
      </button>
      {updateTag && (
        <a
          href={`https://github.com/${REPO}/releases/tag/v${updateTag}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold bg-accent-orange text-white hover:bg-accent-orange/90 px-2 py-1 rounded-lg transition-all duration-150 shadow-lg shadow-accent-orange/25"
        >
          v{updateTag} disponibile
        </a>
      )}
    </div>
  )
}
