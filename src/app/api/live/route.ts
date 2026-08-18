export async function GET() {
  // Fix L17: probe di liveness — mai servito dalla cache (proxy/CDN farebbe
  // finta che l'istanza sia viva anche da zombie).
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}
