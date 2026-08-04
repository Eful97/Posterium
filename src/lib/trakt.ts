// Trakt integration — OAuth 2.0 + watchlist (v2 API).
// Override via env nei test E2E: TRAKT_API_URL punta al mock server locale,
// TRAKT_AUTH_URL all'endpoint authorize simulato.
import type { OAuthTokens } from "./integrations"

const TRAKT_API = process.env.TRAKT_API_URL || "https://api.trakt.tv"
const TRAKT_AUTH = process.env.TRAKT_AUTH_URL || "https://trakt.tv"

export function traktCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: process.env.TRAKT_CLIENT_ID || "",
    clientSecret: process.env.TRAKT_CLIENT_SECRET || "",
  }
}

export function traktConfigured(): boolean {
  const { clientId, clientSecret } = traktCredentials()
  return clientId.length > 0 && clientSecret.length > 0
}

export function buildTraktAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = traktCredentials()
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  })
  return `${TRAKT_AUTH}/oauth/authorize?${params.toString()}`
}

async function traktTokenRequest(body: Record<string, string>): Promise<OAuthTokens> {
  const { clientId } = traktCredentials()
  const res = await fetch(`${TRAKT_API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": clientId,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Trakt token exchange failed: ${res.status}`)
  const json = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!json.access_token || !json.refresh_token) throw new Error("Trakt token response missing fields")
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in ?? 7776000) * 1000,
  }
}

export async function exchangeTraktCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const { clientId, clientSecret } = traktCredentials()
  return traktTokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })
}

export async function refreshTraktTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
  const { clientId, clientSecret } = traktCredentials()
  return traktTokenRequest({
    refresh_token: tokens.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  })
}

/** Recupera la watchlist dell'utente (film + serie) e la normalizza in chiavi "movie|tv:tmdbId". */
export async function fetchTraktWatchlist(tokens: OAuthTokens): Promise<string[]> {
  const { clientId } = traktCredentials()
  const headers = {
    "trakt-api-version": "2",
    "trakt-api-key": clientId,
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
  }
  const [moviesRes, showsRes] = await Promise.all([
    fetch(`${TRAKT_API}/sync/watchlist/movies`, { headers, signal: AbortSignal.timeout(15000) }),
    fetch(`${TRAKT_API}/sync/watchlist/shows`, { headers, signal: AbortSignal.timeout(15000) }),
  ])
  if (!moviesRes.ok || !showsRes.ok) throw new Error(`Trakt watchlist failed: ${moviesRes.status}/${showsRes.status}`)
  const movies = await moviesRes.json() as { ids?: { tmdb?: number } }[]
  const shows = await showsRes.json() as { ids?: { tmdb?: number } }[]
  const out: string[] = []
  for (const m of movies) if (m.ids?.tmdb) out.push(`movie:${m.ids.tmdb}`)
  for (const s of shows) if (s.ids?.tmdb) out.push(`tv:${s.ids.tmdb}`)
  return out
}
