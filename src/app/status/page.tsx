"use client"

import React, { useEffect, useState } from "react"

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
    mappingsCount: number
    dataFileExists: boolean
  }
  system: {
    node: string
    platform: string
    env: string
  }
}

export default function StatusPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok || r.status === 503 ? r.json() : Promise.reject("Errore " + r.status)))
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(String(e)); setLoading(false) })
  }, [])

  const badge = (ok: boolean) =>
    ok
      ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] mr-2 shrink-0" />
      : <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] mr-2 shrink-0" />

  const Row = ({ label, ok, extra }: { label: string; ok: boolean; extra?: React.ReactNode }) => (
    <div className="flex items-center gap-2 py-2 px-3 even:bg-white/[0.03] rounded-lg text-sm">
      {badge(ok)}
      <span className="text-zinc-300">{label}</span>
      {extra && <span className="text-xs text-zinc-400 ml-auto">{extra}</span>}
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-accent transition-colors mb-6">← Torna alla home</a>
        <h1 className="text-2xl font-bold mb-1">🏥 Stato servizi</h1>
        {loading && <p className="text-zinc-400 mt-4">Caricamento...</p>}
        {error && <p className="text-red-400 mt-4">Errore: {error}</p>}
        {data && (
          <div className="mt-6 space-y-6">
            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {badge(data.tmdb.apiKey)}
                <h2 className="text-base font-semibold">TMDB</h2>
                {data.tmdb.apiKey && <span className="text-xs text-zinc-400">({data.tmdb.apiKeyLength} caratteri)</span>}
              </div>
              <div className="space-y-1">
                <Row label="Trending" ok={data.tmdb.trending.ok} extra={<>{data.tmdb.trending.status} — {data.tmdb.trending.time}ms</>} />
                <Row label="Ricerca" ok={data.tmdb.search.ok} extra={<>{data.tmdb.search.status} — {data.tmdb.search.time}ms</>} />
                <Row label="Popolari" ok={data.tmdb.popular.ok} extra={<>{data.tmdb.popular.status} — {data.tmdb.popular.time}ms</>} />
                <Row label="External IDs" ok={data.tmdb.externalIds.ok} extra={<>{data.tmdb.externalIds.status} — {data.tmdb.externalIds.time}ms</>} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">📺 Streaming</h2>
              <div className="space-y-1">
                <Row label="JustWatch" ok={data.streaming.justwatch.ok} extra={<>{data.streaming.justwatch.status} — {data.streaming.justwatch.time}ms</>} />
                <Row label="FlixPatrol" ok={data.streaming.flixpatrol.ok} extra={<>{data.streaming.flixpatrol.status} — {data.streaming.flixpatrol.time}ms</>} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">💾 Storage</h2>
              <div className="space-y-1">
                <Row label="File dati" ok={data.storage.dataFileExists} extra={data.storage.dataFileExists ? "mappings.json" : "non trovato"} />
                <Row label="Poster salvati" ok={data.storage.mappingsCount > 0 || !data.storage.dataFileExists} extra={<>{data.storage.mappingsCount} poster</>} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">⚙️ Sistema</h2>
              <div className="space-y-1">
                <Row label="Node.js" ok extra={<>{data.system.node}</>} />
                <Row label="Piattaforma" ok extra={<>{data.system.platform}</>} />
                <Row label="Ambiente" ok extra={<>{data.system.env}</>} />
                <Row label="Stato generale" ok={data.status === "healthy"} extra={data.status === "healthy" ? "✅ Tutto ok" : "⚠️ Degradato"} />
              </div>
            </div>

            <p className="text-xs text-zinc-500 text-center">Ultimo aggiornamento: {new Date(data.timestamp).toLocaleString("it-IT")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
