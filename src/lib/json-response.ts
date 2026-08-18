import { NextResponse } from "next/server"
import { gzipSync } from "zlib"

export function jsonGzip(data: unknown, status = 200, extraHeaders?: Record<string, string>, acceptEncoding?: string | null): NextResponse {
  const body = JSON.stringify(data)
  const buf = Buffer.from(body)
  const MIN_GZIP = 1024
  // Rispetta l'Accept-Encoding del client: un client che NON accetta gzip riceverebbe
  // altrimenti un body compresso illeggibile. Se non viene passato l'header (chiamanti
  // legacy), si mantiene il comportamento precedente.
  const acceptsGzip = acceptEncoding ? /\bgzip\b/.test(acceptEncoding) : true
  if (buf.length < MIN_GZIP || !acceptsGzip) {
    // Fix L16: anche il ramo non-gzip dichiara Vary: Accept-Encoding — senza,
    // una CDN poteva servire la variante gzip (o plain) a client che ne
    // accettano un'altra.
    return NextResponse.json(data, { status, headers: { "Vary": "Accept-Encoding", ...extraHeaders } })
  }
  const compressed = gzipSync(buf, { level: 6 })
  return new NextResponse(compressed, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "gzip",
      "Vary": "Accept-Encoding",
      ...extraHeaders,
    },
  })
}
