import { NextRequest } from "next/server"
import { getDomain } from "@/lib/utils"
import {
  createOrUpdateProfile,
  getProfile,
  getFullProfileData,
  deleteProfile,
  generateProfileId,
  verifyProfilePassword,
} from "@/lib/profile-store"
import { decodeConfig, type PosteriumUserConfig } from "@/lib/config-token"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"
import { createLogger } from "@/lib/logger"

const log = createLogger("profile")

/**
 * POST /api/profile
 *
 * Crea o aggiorna un profilo utente (con protezione password stile AIOMetadata).
 * Body JSON:
 *   - config: PosteriumUserConfig (obbligatorio)
 *   - profileId?: string (opzionale — se fornito ed esistente, aggiorna)
 *   - password: string (obbligatorio per creazione; obbligatorio per aggiornamento se il profilo ha password)
 *
 * Risponde con { profileId: string, url: string }
 * 401 se la password è errata per un profilo esistente.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Login / Load action: authenticate existing profile and return full profile data
    if (body.action === "load" || body.action === "login") {
      const profileId = typeof body.profileId === "string" ? body.profileId.trim() : ""
      const password = typeof body.password === "string" ? body.password : ""
      if (!profileId || !password) {
        return Response.json({ error: "Missing profileId or password" }, { status: 400 })
      }
      const existing = await getFullProfileData(profileId)
      if (!existing) {
        return Response.json({ error: "Profile not found" }, { status: 404 })
      }
      if (existing.passwordHash && existing.salt) {
        const valid = await verifyProfilePassword(profileId, password)
        if (!valid) {
          return Response.json({ error: "Invalid password" }, { status: 401 })
        }
      }
      return Response.json({
        profileId,
        config: existing.config,
        apiKeys: existing.apiKeys || {},
        mappings: existing.mappings || {},
      })
    }

    const config = body.config as PosteriumUserConfig | undefined
    if (!config || typeof config !== "object") {
      return Response.json({ error: "Missing or invalid 'config' in request body" }, { status: 400 })
    }

    const requiredBools: (keyof PosteriumUserConfig)[] = [
      "globalBadges", "rankingBadges", "blurEnabled",
      "networkLogo", "autoRotateClean", "logoFitEnabled",
    ]
    for (const key of requiredBools) {
      if (typeof config[key] !== "boolean") {
        return Response.json({ error: `Invalid config: '${key}' must be a boolean` }, { status: 400 })
      }
    }

    const existingProfileId = typeof body.profileId === "string" && body.profileId.length > 0
      ? body.profileId
      : undefined

    const password = typeof body.password === "string" && body.password.length > 0
      ? body.password
      : undefined

    const existing = existingProfileId ? await getFullProfileData(existingProfileId) : null

    // Se il profilo esiste già e ha password, verificane la validità
    if (existing?.passwordHash && existing?.salt) {
      if (!password) {
        return Response.json({ error: "Password required to update existing profile" }, { status: 400 })
      }
      const valid = await verifyProfilePassword(existingProfileId!, password)
      if (!valid) {
        return Response.json({ error: "Invalid password" }, { status: 401 })
      }
    }

    // Nuovo profilo: password obbligatoria
    if (!existing && !password) {
      return Response.json({ error: "Password required to create a profile" }, { status: 400 })
    }

    const apiKeys = body.apiKeys && typeof body.apiKeys === "object" ? body.apiKeys : undefined
    const mappings = body.mappings && typeof body.mappings === "object" ? body.mappings : undefined

    const profileId = await createOrUpdateProfile(config, existingProfileId, password, apiKeys, mappings)
    const url = `${getDomain()}/api/poster/{type}/{imdb_id}?u=${profileId}`

    return Response.json({ profileId, url })
  } catch (error) {
    log.error("POST failed", { error: error instanceof Error ? error.message : String(error) })
    return Response.json({ error: "Failed to create/update profile" }, { status: 500 })
  }
}

/**
 * GET /api/profile?u=<UUID>
 *
 * Recupera la configurazione di un profilo (senza dati di autenticazione).
 *
 * GET /api/profile/new
 * Genera e restituisce un nuovo UUID senza salvarlo.
 */
export async function GET(req: NextRequest) {
  const uuid = req.nextUrl.searchParams.get("u")

  if (req.nextUrl.searchParams.has("new")) {
    const profileId = generateProfileId()
    return Response.json({ profileId })
  }

  if (!uuid) {
    return Response.json({ error: "Missing 'u' query parameter" }, { status: 400 })
  }

  const config = await getProfile(uuid)
  if (!config) {
    return Response.json({ error: "Profile not found" }, { status: 404 })
  }
  return Response.json({ profileId: uuid, config })
}

/**
 * DELETE /api/profile?u=<UUID>
 *
 * Elimina un profilo. Richiede admin token per evitare eliminazioni
 * non autorizzate (i profile UUID sono esposti nelle URL dei poster).
 */
export async function DELETE(req: NextRequest) {
  if (!checkAdminToken(req)) return adminAuthResponse()
  const uuid = req.nextUrl.searchParams.get("u")
  if (!uuid) {
    return Response.json({ error: "Missing 'u' query parameter" }, { status: 400 })
  }
  await deleteProfile(uuid)
  return Response.json({ success: true })
}
