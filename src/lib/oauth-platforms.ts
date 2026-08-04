import type { OAuthPlatformConfig } from "@/lib/oauth-flow"
import { traktConfigured, buildTraktAuthorizeUrl, exchangeTraktCode } from "@/lib/trakt"
import { simklConfigured, buildSimklAuthorizeUrl, exchangeSimklCode } from "@/lib/simkl"

export const traktOAuthConfig: OAuthPlatformConfig = {
  platform: "trakt",
  configured: traktConfigured,
  buildAuthorizeUrl: buildTraktAuthorizeUrl,
  exchangeCode: exchangeTraktCode,
}

export const simklOAuthConfig: OAuthPlatformConfig = {
  platform: "simkl",
  configured: simklConfigured,
  buildAuthorizeUrl: buildSimklAuthorizeUrl,
  exchangeCode: exchangeSimklCode,
}
