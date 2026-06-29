import { NextResponse } from "next/server"
import { gzipSync } from "zlib"

export function jsonGzip(data: unknown, status = 200, extraHeaders?: Record<string, string>): NextResponse {
  const body = JSON.stringify(data)
  const buf = Buffer.from(body)
  const MIN_GZIP = 1024
  if (buf.length < MIN_GZIP) {
    return NextResponse.json(data, { status, headers: { ...extraHeaders } })
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
