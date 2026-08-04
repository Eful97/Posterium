import { useState, useRef, useEffect } from "react"
import { useP } from "@/lib/context"
import { useToast } from "@/components/Toast"

export function usePosterPreview() {
  const p = useP()
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [imageError, setImageError] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [imgSrc, setImgSrc] = useState("")
  
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const loadDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevObjUrlRef = useRef("")

  useEffect(() => {
    setImageError(false)
    setLoadProgress(0)
    
    if (!p.previewUrl) {
      if (prevObjUrlRef.current) {
        URL.revokeObjectURL(prevObjUrlRef.current)
        prevObjUrlRef.current = ""
      }
      setImgSrc("")
      setPreviewLoading(false)
      return
    }

    // Show loading bar only if request takes >200ms
    loadDelayRef.current = setTimeout(() => setPreviewLoading(true), 200)
    
    // Keep old img visible while new one loads — no flicker
    const url = p.previewUrl
    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open("GET", url, true)
    xhr.responseType = "blob"
    
    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        setLoadProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    
    xhr.onload = () => {
      if (loadDelayRef.current) {
        clearTimeout(loadDelayRef.current)
        loadDelayRef.current = null
      }
      if (xhr.status === 200) {
        const blob = xhr.response
        const objUrl = URL.createObjectURL(blob)
        if (prevObjUrlRef.current) URL.revokeObjectURL(prevObjUrlRef.current)
        prevObjUrlRef.current = objUrl
        setImgSrc(objUrl)
        setLoadProgress(100)
        setPreviewLoading(false)
      } else {
        setImageError(true)
        setPreviewLoading(false)
      }
    }
    
    xhr.onerror = () => {
      if (loadDelayRef.current) {
        clearTimeout(loadDelayRef.current)
        loadDelayRef.current = null
      }
      setImageError(true)
      setPreviewLoading(false)
      toastRef.current.error("Failed to load poster preview")
    }
    
    xhr.send()
    
    return () => {
      xhr.abort()
      xhrRef.current = null
      if (loadDelayRef.current) {
        clearTimeout(loadDelayRef.current)
        loadDelayRef.current = null
      }
    }
  }, [p.previewUrl])

  // Revoca l'object URL residuo SOLO allo smontaggio. La cleanup dell'effetto
  // sopra non può revocare: durante il caricamento della nuova preview l'immagine
  // vecchia deve restare valida (no-flicker).
  useEffect(() => {
    return () => {
      if (prevObjUrlRef.current) {
        URL.revokeObjectURL(prevObjUrlRef.current)
        prevObjUrlRef.current = ""
      }
    }
  }, [])

  return {
    imageError,
    setImageError,
    previewLoading,
    loadProgress,
    imgSrc,
  }
}
