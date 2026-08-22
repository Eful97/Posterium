"use client"

import React, { useState, useEffect, useRef } from "react"
import { X, Check, Copy, Download, ExternalLink, Tv } from "lucide-react"
import QRCode from "qrcode"

interface InstallModalProps {
  isOpen: boolean
  onClose: () => void
  manifestUrl?: string
}

export function InstallModal({ isOpen, onClose, manifestUrl: propManifestUrl }: InstallModalProps) {
  const [copied, setCopied] = useState(false)
  const [qrSvg, setQrSvg] = useState<string>("")
  const [resolvedManifestUrl, setResolvedManifestUrl] = useState(propManifestUrl || "")
  const popoverRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (propManifestUrl) {
      setResolvedManifestUrl(propManifestUrl)
      return
    }
    if (typeof window === "undefined") return
    const path = window.location.pathname
    const params = new URLSearchParams(window.location.search)
    const cParam = params.get("config") || params.get("c")
    const uParam = params.get("u") || params.get("user")

    if (path.startsWith("/c/")) {
      const seg = path.split("/")[2]
      if (seg && seg !== "manifest.json" && seg !== "configure") {
        setResolvedManifestUrl(`${window.location.origin}/c/${seg}/manifest.json`)
        return
      }
    }
    if (path.startsWith("/u/")) {
      const seg = path.split("/")[2]
      if (seg && seg !== "manifest.json" && seg !== "configure") {
        setResolvedManifestUrl(`${window.location.origin}/u/${seg}/manifest.json`)
        return
      }
    }
    if (cParam) {
      setResolvedManifestUrl(`${window.location.origin}/c/${cParam}/manifest.json`)
      return
    }
    if (uParam) {
      setResolvedManifestUrl(`${window.location.origin}/u/${uParam}/manifest.json`)
      return
    }
    setResolvedManifestUrl(`${window.location.origin}/manifest.json`)
  }, [propManifestUrl, isOpen])

  const stremioDeepLink = (resolvedManifestUrl || "").replace(/^https?:\/\//, "stremio://")
  const stremioWebLink = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(resolvedManifestUrl || "")}`

  useEffect(() => {
    if (!isOpen || !resolvedManifestUrl) return
    QRCode.toString(resolvedManifestUrl, {
      type: "svg",
      margin: 1,
      width: 180,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((svg) => setQrSvg(svg))
      .catch(() => setQrSvg(""))
  }, [isOpen, resolvedManifestUrl])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    const clickTimer = setTimeout(() => {
      window.addEventListener("click", handleClickOutside)
    }, 50)
    return () => {
      clearTimeout(clickTimer)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("click", handleClickOutside)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resolvedManifestUrl)
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        ref={popoverRef}
        className="w-full max-w-sm bg-[#141418] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent-orange/20 border border-accent-orange/30 flex items-center justify-center text-accent-orange">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Installa Posterium Hub</h2>
              <p className="text-[11px] text-muted">All-in-One: Cataloghi Streaming, Metadati e Locandine Dinamiche</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* QR Code Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-zinc-300 text-[11px] font-medium">
              <Tv className="w-3.5 h-3.5 text-accent-orange" />
              <span>Scansiona da Smart TV o Smartphone</span>
            </div>
            {qrSvg ? (
              <div
                className="bg-white p-2.5 rounded-xl shadow-lg"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-[180px] h-[180px] bg-white/10 rounded-xl flex items-center justify-center text-muted text-xs">
                Generazione QR...
              </div>
            )}
            <p className="text-[10px] text-muted text-center max-w-[240px]">
              Inquadra con la fotocamera per installare Posterium Hub su Stremio
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Direct App Install */}
            <a
              href={stremioDeepLink}
              className="w-full py-2.5 px-4 rounded-xl bg-accent-orange hover:bg-accent-orange/90 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent-orange/20 active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installa Posterium Hub nell&apos;app</span>
            </a>

            {/* Copy Manifest URL */}
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                copied
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                  : "bg-surface2 hover:bg-surface2/80 text-zinc-200 border-white/10"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
              <span>{copied ? "Link Manifest Copiato!" : "Copia Link Manifest"}</span>
            </button>

            {/* Open in Web Stremio */}
            <a
              href={stremioWebLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1.5 px-3 rounded-xl text-[11px] font-medium text-muted hover:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Apri su Stremio Web</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
