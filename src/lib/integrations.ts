// Tipi condivisi per le integrazioni Trakt / Simkl.

export type WatchlistPlatform = "trakt" | "simkl"

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: number // epoch ms
  username?: string
}
