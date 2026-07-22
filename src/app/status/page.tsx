"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { t } from "@/lib/i18n"

interface CheckResult {
  ok: boolean
  status: number
  time: number
  reason?: string
}

interface HealthData {
  status: string
  timestamp: string
  tmdb: {
    apiKey: boolean
    apiKeyLength: number
    trending: CheckResult
    search: CheckResult
    popular: CheckResult
    externalIds: CheckResult
  }
  streaming: {
    justwatch: CheckResult
    flixpatrol: CheckResult
  }
  storage: {
    mode: "kv" | "file"
    mappingsCount: number
    dataFileExists: boolean | null
  }
  system: {
    node: string
    platform: string
    env: string
  }
}

interface CacheTagEntry {
  tag: string
  count: number
}

interface CacheStatusData {
  totalEntries: number
  taggedEntries: CacheTagEntry[]
  untaggedEntries: number
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok
    ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] mr-2 shrink-0" />
    : <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] mr-2 shrink-0" />
}

function StatusRow({ label, ok, extra }: { label: string; ok: boolean; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 even:bg-white/[0.03] rounded-lg text-sm">
      <StatusBadge ok={ok} />
      <span className="text-zinc-300">{label}</span>
      {extra && <span className="text-xs text-zinc-400 ml-auto">{extra}</span>}
    </div>
  )
}

export default function StatusPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [cacheStatus, setCacheStatus] = useState<CacheStatusData | null>(null)
  const [clearingCache, setClearingCache] = useState(false)
  const [cacheMessage, setCacheMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  async function loadCacheStatus() {
    try {
      const res = await fetch("/api/cache/status")
      if (!res.ok) { setCacheStatus(null); return }
      const body = await res.json()
      setCacheStatus(body)
    } catch {
      setCacheStatus(null)
    }
  }

  async function clearCache() {
    setClearingCache(true)
    setCacheMessage("")
    try {
      const res = await fetch("/api/cache/clear", { method: "POST" })
      if (!res.ok) { setCacheMessage(t("ui.statusCacheClearError")); return }
      setCacheMessage(t("ui.statusCacheClearSuccess"))
      await loadCacheStatus()
    } catch {
      setCacheMessage(t("ui.statusCacheClearError"))
    } finally {
      setClearingCache(false)
    }
  }

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok || r.status === 503 ? r.json() : Promise.reject("Errore " + r.status)))
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(String(e)); setLoading(false) })
    void loadCacheStatus()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-accent transition-colors mb-6">{t("ui.statusBack")}</Link>
        <h1 className="text-2xl font-bold mb-1">{t("ui.statusTitle")}</h1>
        {loading && <p className="text-zinc-400 mt-4">{t("ui.statusLoading")}</p>}
        {error && <p className="text-red-400 mt-4">{t("ui.statusError", { msg: error })}</p>}
        {data && (
          <div className="mt-6 space-y-6">
            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge ok={data.tmdb.apiKey} />
                <h2 className="text-base font-semibold">{t("ui.statusTmdb")}</h2>
                {data.tmdb.apiKey && <span className="text-xs text-zinc-400">({data.tmdb.apiKeyLength} caratteri)</span>}
              </div>
              <div className="space-y-1">
                <StatusRow label={t("ui.statusTrending")} ok={data.tmdb.trending.ok} extra={<>{data.tmdb.trending.status} — {data.tmdb.trending.time}ms</>} />
                <StatusRow label={t("ui.statusSearch")} ok={data.tmdb.search.ok} extra={<>{data.tmdb.search.status} — {data.tmdb.search.time}ms</>} />
                <StatusRow label={t("ui.statusPopular")} ok={data.tmdb.popular.ok} extra={<>{data.tmdb.popular.status} — {data.tmdb.popular.time}ms</>} />
                <StatusRow label={t("ui.statusExternalIds")} ok={data.tmdb.externalIds.ok} extra={<>{data.tmdb.externalIds.status} — {data.tmdb.externalIds.time}ms</>} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">{t("ui.statusStreaming")}</h2>
              <div className="space-y-1">
                <StatusRow label={t("ui.statusJustwatch")} ok={data.streaming.justwatch.ok} extra={<>{data.streaming.justwatch.status} — {data.streaming.justwatch.time}ms</>} />
                <StatusRow label={t("ui.statusFlixpatrol")} ok={data.streaming.flixpatrol.ok} extra={<>{data.streaming.flixpatrol.status} — {data.streaming.flixpatrol.time}ms</>} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">{t("ui.statusStorage")}</h2>
              <div className="space-y-1">
                {data.storage.mode === "kv"
                  ? <StatusRow label={t("ui.statusStorageMode")} ok extra={t("ui.statusStorageKv")} />
                  : <>
                      <StatusRow label={t("ui.statusStorageMode")} ok={!!data.storage.dataFileExists} extra={t("ui.statusStorageFile")} />
                      <StatusRow label={t("ui.statusDataFile")} ok={!!data.storage.dataFileExists} extra={data.storage.dataFileExists ? t("ui.statusDataFileName") : t("ui.statusNotFound")} />
                    </>
                }
                <StatusRow label={t("ui.statusSavedPosters")} ok={data.storage.mappingsCount > 0 || data.storage.mode === "kv" || !data.storage.dataFileExists} extra={<>{t("ui.statusPosterCount", { count: data.storage.mappingsCount })}</>} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">{t("ui.statusSystem")}</h2>
              <div className="space-y-1">
                <StatusRow label={t("ui.statusNode")} ok extra={<>{data.system.node}</>} />
                <StatusRow label={t("ui.statusPlatform")} ok extra={<>{data.system.platform}</>} />
                <StatusRow label={t("ui.statusEnvironment")} ok extra={<>{data.system.env}</>} />
                <StatusRow label={t("ui.statusOverall")} ok={data.status === "healthy"} extra={data.status === "healthy" ? t("ui.statusHealthy") : t("ui.statusDegraded")} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">{t("ui.statusCache")}</h2>
              {cacheStatus ? (
                <div className="space-y-1">
                  <StatusRow label={t("ui.statusCacheTotal")} ok extra={cacheStatus.totalEntries} />
                  <StatusRow label={t("ui.statusCacheUntagged")} ok extra={cacheStatus.untaggedEntries} />
                  {cacheStatus.taggedEntries.length > 0 ? (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {cacheStatus.taggedEntries.map((entry) => (
                        <span key={entry.tag} className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                          {entry.tag}: <span className="text-white font-semibold">{entry.count}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">{t("ui.statusCacheEmpty")}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">{t("ui.statusCacheUnavailable")}</p>
              )}
            </div>

            <p className="text-xs text-zinc-500 text-center">{t("ui.statusUpdated", { time: new Date(data.timestamp).toLocaleString("it-IT") })}</p>
          </div>
        )}
      </div>
    </div>
  )
}
