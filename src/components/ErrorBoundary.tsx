"use client"

import React from "react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Qualcosa è andato storto</h3>
          <p className="text-xs text-zinc-400 mb-4 max-w-sm">{this.state.error?.message || "Errore sconosciuto"}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 border border-zinc-700 hover:border-accent/50 hover:text-accent active:scale-95 transition-all duration-200"
          >
            Riprova
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
