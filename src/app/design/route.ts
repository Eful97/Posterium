import { NextRequest, NextResponse } from "next/server"

// URL pulito per la spec interattiva dell'editor (wireframe annotato).
// Il file vive in public/ (servito staticamente da Next su ogni target:
// dev, Docker, Vercel); questa route fa da alias stabile, con l'origin
// derivato dalla richiesta (funziona ovunque, non solo in locale).
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/editor-wireframe.html", request.nextUrl.origin), 302)
}
