"use client"

import { usePosterium, PosteriumProvider } from "@/lib/context"
import { AppShell } from "@/components/AppShell"

export default function Home() {
  const value = usePosterium()
  return (
    <PosteriumProvider value={value}>
      <AppShell />
    </PosteriumProvider>
  )
}
