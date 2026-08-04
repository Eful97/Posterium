// Simkl integration — OAuth 2.0 + watchlist.
// Override via env nei test E2E: SIMKL_API_URL punta al mock server locale,
// SIMKL_AUTH_URL all'endpoint authorize simulato.
import type { OAuthTokens } from "./integrations"

const SIMKL_API = process.env.SIMKL_API_URL || "https://api.simkl.com"
const SIMKL_AUTH = process.env.SIMKL_AUTH_URL || "https://simkl.com"

export interface SimklWatchlistItem {
  type: "movie" | "show"
  tmdbId: number | null
}

export function simklCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: process.env.SIMKL_CLIENT_ID || "",
    clientSecret: process.env.SIMKL_CLIENT_SECRET || "",
  }
}

export function simklConfigured(): boolean {
  const { clientId, clientSecret } = simklCredentials()
  return clientId.length > 0 && clientSecret.length > 0
}

export function buildSimklAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = simklCredentials()
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  })
  return `${SIMKL_AUTH}/oauth/authorize?${params.toString()}`
}

async function simklTokenRequest(body: Record<string, string>): Promise<OAuthTokens> {
  const res = await fetch(`${SIMKL_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Simkl token exchange failed: ${res.status}`)
  const json = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!json.access_token || !json.refresh_token) throw new Error("Simkl token response missing fields")
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in ?? 31536000) * 1000,
  }
}

export async function exchangeSimklCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const { clientId, clientSecret } = simklCredentials()
  return simklTokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })
}

export async function refreshSimklTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
  const { clientId, clientSecret } = simklCredentials()
  return simklTokenRequest({
    refresh_token: tokens.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  })
}

/** Recupera la watchlist dell'utente (film + serie) e la normalizza in chiavi "movie|tv:tmdbId". */
export async function fetchSimklWatchlist(tokens: OAuthTokens): Promise<string[]> {
  const headers = {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
  }
  const [moviesRes, showsRes] = await Promise.all([
    fetch(`${SIMKL_API}/sync/watchlist/movies`, { headers, signal: AbortSignal.timeout(15000) }),
    fetch(`${SIMKL_API}/sync/watchlist/shows`, { headers, signal: AbortSignal.timeout(15000) }),
  ])
  if (!moviesRes.ok || !showsRes.ok) throw new Error(`Simkl watchlist failed: ${moviesRes.status}/${showsRes.status}`)
  const movies = await moviesRes.json() as { ids?: { tmdb?: number | string } }[]
  const shows = await showsRes.json() as { ids?: { tmdb?: number | string } }[]
  const out: string[] = []
  for (const m of movies) if (m.ids?.tmdb) out.push(`movie:${m.ids.tmdb}`)
  for (const s of shows) if (s.ids?.tmdb) out.push(`tv:${s.ids.tmdb}`)
  return out
}
