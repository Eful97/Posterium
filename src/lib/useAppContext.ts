"use client"

import { useState, useRef } from "react"

export function useAppState() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [loadingImages, setLoadingImages] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const posterScrollRef = useRef<HTMLDivElement>(null)

  return {
    settingsOpen, setSettingsOpen,
    langOpen, setLangOpen,
    showLangPicker, setShowLangPicker,
    showKey, setShowKey,
    previewId, setPreviewId,
    loadingImages, setLoadingImages,
    settingsRef, langRef, posterScrollRef,
  }
}
