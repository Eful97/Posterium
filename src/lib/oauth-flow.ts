// Factory condivisa per le route OAuth Trakt/Simkl.
// Flusso: start (authorize) → callback (exchange + salva token) → status/disconnect.
// Il redirect_uri è derivato dall'origin della richiesta (proxy-safe, vedi
// getOriginFromRequest), quindi deve combaciare con l'app registrata sulla
// piattaforma. Lo `state` OAuth trasporta il profileId (UUID, non indovinabile).

import type { NextRequest } from "next/server"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { setProfileTokens } from "@/lib/profile-store"
import type { OAuthTokens, WatchlistPlatform } from "@/lib/integrations"

export interface OAuthPlatformConfig {
  platform: WatchlistPlatform
  configured: () => boolean
  buildAuthorizeUrl: (state: string, redirectUri: string) => string
  exchangeCode: (code: string, redirectUri: string) => Promise<OAuthTokens>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function handleOAuthStart(req: NextRequest, cfg: OAuthPlatformConfig): Response {
  if (!cfg.configured()) {
    return Response.json({ error: `${cfg.platform} is not configured` }, { status: 503 })
  }
  const profile = req.nextUrl.searchParams.get("profile")
  if (!profile || !UUID_RE.test(profile)) {
    return Response.json({ error: "Invalid 'profile' query parameter" }, { status: 400 })
  }
  const redirectUri = `${getOriginFromRequest(req)}/api/${cfg.platform}/auth/callback`
  const url = cfg.buildAuthorizeUrl(profile, redirectUri)
  return new Response(null, { status: 302, headers: { Location: url } })
}

export async function handleOAuthCallback(req: NextRequest, cfg: OAuthPlatformConfig): Promise<Response> {
  const origin = getOriginFromRequest(req)
  const code = req.nextUrl.searchParams.get("code")
  const state = req.nextUrl.searchParams.get("state")
  if (!code) {
    return Response.redirect(`${origin}/?oauth=${cfg.platform}&status=error&reason=missing_code`)
  }
  if (!state || !UUID_RE.test(state)) {
    return Response.redirect(`${origin}/?oauth=${cfg.platform}&status=error&reason=invalid_state`)
  }
  try {
    const redirectUri = `${origin}/api/${cfg.platform}/auth/callback`
    const tokens = await cfg.exchangeCode(code, redirectUri)
    await setProfileTokens(state, cfg.platform, tokens)
    return Response.redirect(`${origin}/?oauth=${cfg.platform}&status=connected`)
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 80) : "unknown"
    return Response.redirect(`${origin}/?oauth=${cfg.platform}&status=error&reason=${encodeURIComponent(reason)}`)
  }
}

export async function handleOAuthStatus(req: NextRequest, cfg: OAuthPlatformConfig): Promise<Response> {
  const profile = req.nextUrl.searchParams.get("profile")
  if (!profile || !UUID_RE.test(profile)) {
    return Response.json({ error: "Invalid 'profile' query parameter" }, { status: 400 })
  }
  const { getFullProfileData } = await import("@/lib/profile-store")
  const data = await getFullProfileData(profile)
  const tokens = data?.[cfg.platform === "trakt" ? "traktTokens" : "simklTokens"]
  return Response.json({
    connected: !!tokens,
    username: tokens?.username ?? null,
  })
}

export async function handleOAuthDisconnect(req: NextRequest, cfg: OAuthPlatformConfig): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })
  const profile = req.nextUrl.searchParams.get("profile")
  if (!profile || !UUID_RE.test(profile)) {
    return Response.json({ error: "Invalid 'profile' query parameter" }, { status: 400 })
  }
  await setProfileTokens(profile, cfg.platform, null)
  return Response.json({ ok: true })
}
