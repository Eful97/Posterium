"use client"

import { useState, useEffect } from "react"

const CURRENT_VERSION = "0.1.10"
const CURRENT_COMMIT = "e340b65"
const REPO = "Eful97/Posterium"
const CHECK_TTL = 60 * 60 * 1000

async function getLatestRelease(): Promise<{ tag: string | null; prerelease: boolean }> {
  try {
    const cached = localStorage.getItem("posterium:release")
    if (cached) {
      const { tag, ts } = JSON.parse(cached)
      if (Date.now() - ts < CHECK_TTL) return { tag, prerelease: false }
    }
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { tag: null, prerelease: false }
    const data = await res.json()
    const tag = data.tag_name?.replace(/^v/, "") || null
    localStorage.setItem("posterium:release", JSON.stringify({ tag, ts: Date.now() }))
    return { tag, prerelease: data.prerelease || false }
  } catch {
    return { tag: null, prerelease: false }
  }
}

export function VersionBadge() {
  const [updateTag, setUpdateTag] = useState<string | null>(null)

  useEffect(() => {
    getLatestRelease().then(({ tag }) => {
      if (tag && tag !== CURRENT_VERSION) setUpdateTag(tag)
    })
  }, [])

  return (
    <div className="fixed top-2 left-3 z-50 flex items-center gap-2">
      <span className="text-xs text-zinc-400 font-mono bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">v{CURRENT_VERSION}</span>
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
