"use client"

import { PosteriumRoot } from "@/lib/context"
import { AppShell } from "@/components/AppShell"

export default function Home() {
  return (
    <PosteriumRoot>
      <AppShell />
    </PosteriumRoot>
  )
}