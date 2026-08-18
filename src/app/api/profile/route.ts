import { NextRequest } from "next/server"
import { getDomain } from "@/lib/utils"
import {
  createOrUpdateProfile,
  getProfile,
  getFullProfileData,
  deleteProfile,
  generateProfileId,
  isValidProfileId,
  verifyProfilePassword,
  isKvStorageConfigured,
  type ProfileData,
} from "@/lib/profile-store"
import { type PosteriumUserConfig, configTokenSchema, encodeConfig } from "@/lib/config-token"
import { requireAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"
import { readJsonBody, BodyTooLargeError, DEFAULT_MAX_BODY_BYTES } from "@/lib/read-body"
import { mappingSchema } from "@/lib/validation"
import type { Mapping } from "@/lib/types"

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
 *
 * Se lo storage non è disponibile (Vercel senza KV: filesystem read-only),
 * il profilo viene restituito come STATELESS: { profileId, url, stateless: true,
 * configToken } — la config è firmata in un config token `?config=` e non viene
 * salvata nulla sul server. Richiede CONFIG_HMAC_SECRET in produzione.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(rateLimitKey(req), "profile")
    if (!rl.ok) return rateLimitResponse(rl.retAfter)
    if (!isSameOrigin(req)) return originMismatchResponse()
    // Cap sui byte del body indipendente da content-length (S4): legge a chunk
    // e interrompe appena si supera il limite → 413. JSON non valido → 400.
    let body: unknown
    try {
      body = await readJsonBody(req, DEFAULT_MAX_BODY_BYTES)
    } catch (e) {
      if (e instanceof BodyTooLargeError) return Response.json({ error: "Request body too large" }, { status: 413 })
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>

    // Login / Load action: authenticate existing profile and return full profile data
    if (raw.action === "load" || raw.action === "login") {
      // Fix L14: bucket "profile" (20 burst) invece di "default" (120): il
      // vecchio bucket condiviso permetteva 120 tentativi prima del blocco e
      // un client poteva loggare in blocco tutti (fail-safe condiviso).
      const rl = rateLimit(rateLimitKey(req), "profile")
      if (!rl.ok) return rateLimitResponse(rl.retAfter)
      const profileId = typeof raw.profileId === "string" ? raw.profileId.trim() : ""
      const password = typeof raw.password === "string" ? raw.password : ""
      if (!profileId || !password) {
        return Response.json({ error: "Missing profileId or password" }, { status: 400 })
      }
      const existing = await getFullProfileData(profileId)
      if (!existing) {
        return Response.json({ error: "Profile not found" }, { status: 404 })
      }
      // Le apiKeys (e i token OAuth) sono credenziali: vengono restituite SOLO
      // dopo la verifica della password. Un profilo legacy senza password resta
      // pubblico per config/mappings (come GET /api/profile), ma non espone le
      // chiavi — l'UUID compare nelle URL dei poster e non è un segreto.
      let authorizedApiKeys: ProfileData["apiKeys"] = {}
      if (existing.passwordHash && existing.salt) {
        const valid = await verifyProfilePassword(profileId, password)
        if (!valid) {
          return Response.json({ error: "Invalid password" }, { status: 401 })
        }
        authorizedApiKeys = existing.apiKeys || {}
      }
      return Response.json({
        profileId,
        config: existing.config,
        apiKeys: authorizedApiKeys,
        mappings: existing.mappings || {},
      })
    }

    const config = raw.config as PosteriumUserConfig | undefined
    if (!config || typeof config !== "object") {
      return Response.json({ error: "Missing or invalid 'config' in request body" }, { status: 400 })
    }

    // Rate limiting anche su create/update (non solo load/login): evita crescita disco illimitata
    const rlCreate = rateLimit(rateLimitKey(req), "profile")
    if (!rlCreate.ok) return rateLimitResponse(rlCreate.retAfter)

    // Validazione completa con lo stesso schema Zod di /api/config-token
    // (finding 15): enum badgeStyle/rankingBadgeStyle/ribbonSide, booleani
    // opzionali e customBadge con max vengono controllati alla scrittura,
    // non solo al render (dove i fallback già mitigavano).
    const parsedConfig = configTokenSchema.safeParse(config)
    if (!parsedConfig.success) {
      return Response.json(
        { error: "Invalid config", details: parsedConfig.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const validConfig = parsedConfig.data

    // Range check sui numeri: rifiuta subito i valori fuori scala invece di
    // persistere config incoerenti (il render clampa comunque come fallback).
    const requiredNums: { key: keyof PosteriumUserConfig; min: number; max: number }[] = [
      { key: "blurIntensity", min: 0, max: 100 },
      { key: "blurFade", min: 0, max: 100 },
      { key: "blurDarkness", min: 0, max: 100 },
      { key: "gradientHeight", min: 5, max: 100 },
    ]
    for (const { key, min, max } of requiredNums) {
      const v = validConfig[key]
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return Response.json({ error: `Invalid config: '${key}' must be a finite number` }, { status: 400 })
      }
      if (v < min || v > max) {
        return Response.json({ error: `Invalid config: '${key}' must be between ${min} and ${max}` }, { status: 400 })
      }
    }

    const existingProfileId = typeof raw.profileId === "string" && raw.profileId.length > 0
      ? raw.profileId
      : undefined

    // Finding 2: il profileId deve essere un UUID valido (stessa regex del
    // store). Senza questa guardia chiavi arbitrarie (es. "__proto__") finivano
    // verboatim nello storage profili.
    if (existingProfileId && !isValidProfileId(existingProfileId)) {
      return Response.json({ error: "Invalid profileId" }, { status: 400 })
    }

    const password = typeof raw.password === "string" && raw.password.length > 0
      ? raw.password
      : undefined

    // Finding 19: limite sulla lunghezza della password (scrypt è proporzionale
    // alla lunghezza dell'input nel pre-hash) — oltre il body cap sarebbe comunque
    // un abuso CPU inutile.
    if (password && password.length > 128) {
      return Response.json({ error: "Password too long (max 128 characters)" }, { status: 400 })
    }

    const existing = existingProfileId ? await getFullProfileData(existingProfileId) : null

    // CRITICO (finding 1): un profilo legacy senza password ha l'UUID esposto
    // nelle URL dei poster — chiunque lo conosca NON deve poterlo aggiornare
    // (sovrascriverebbe config/apiKeys e imposterebbe la propria password).
    if (existing && !existing.passwordHash && !requireAdminToken(req)) {
      return adminAuthResponse()
    }

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

    const apiKeys = raw.apiKeys && typeof raw.apiKeys === "object" ? (raw.apiKeys as ProfileData["apiKeys"]) : undefined
    // Fix L36: i mappings salvati vengono validati con lo stesso schema della
    // route mappings (mappingSchema). Prima un valore arbitrario (es.
    // `mappings: { "movie:1": "garbage" }`) veniva persistito verbatim e la
    // poster route lo trattava come Mapping (leggeva .updatedAt) → crash del
    // render. Le entry invalide vengono scartate; se NESSUNA è valida la
    // richiesta è rifiutata (niente salvataggio silenzioso di stato corrotto).
    let mappings: ProfileData["mappings"] | undefined
    if (raw.mappings !== undefined && raw.mappings !== null) {
      if (typeof raw.mappings !== "object" || Array.isArray(raw.mappings)) {
        return Response.json({ error: "Invalid mappings in request body" }, { status: 400 })
      }
      const validMappings: ProfileData["mappings"] = {}
      let entryCount = 0
      for (const [key, value] of Object.entries(raw.mappings as Record<string, unknown>)) {
        entryCount++
        const parsed = value && typeof value === "object" ? mappingSchema.safeParse(value) : null
        if (parsed?.success) validMappings[key] = parsed.data as Mapping
      }
      if (entryCount > 0 && Object.keys(validMappings).length === 0) {
        return Response.json({ error: "Invalid mappings in request body" }, { status: 400 })
      }
      mappings = validMappings
    }

    // Crea/aggiorna il profilo. Se lo storage non è disponibile (es. Vercel
    // serverless read-only senza KV), invece di fallire il profilo diventa
    // STATELESS: la config viene firmata in un config token (`?config=`) che
    // viaggia nell'URL senza salvare nulla sul server.
    try {
      const profileId = await createOrUpdateProfile(validConfig, existingProfileId, password, apiKeys, mappings)
      const url = `${getDomain()}/api/poster/{type}/{imdb_id}?u=${profileId}`
      return Response.json({ profileId, url })
    } catch (createError) {
      log.error("POST failed", { error: createError instanceof Error ? createError.message : String(createError) })
      if (!isKvStorageConfigured() && isStorageError(createError)) {
        try {
          const token = encodeConfig(validConfig)
          const statelessId = existingProfileId || generateProfileId()
          const url = `${getDomain()}/api/poster/{type}/{imdb_id}?config=${token}`
          return Response.json({ profileId: statelessId, url, stateless: true, configToken: token })
        } catch (tokenError) {
          // encodeConfig lancia in produzione senza CONFIG_HMAC_SECRET
          // (fail-closed): senza storage né secret il profilo stateless non è
          // possibile — messaggio che spiega entrambe le strade.
          const msg = tokenError instanceof Error ? tokenError.message : String(tokenError)
          return Response.json(
            {
              error: `Storage not configured and no HMAC secret to sign a stateless profile: ${msg}. ` +
                "Set CONFIG_HMAC_SECRET (or ENCRYPTION_KEY_SECRET) to enable stateless profiles, or configure Vercel KV to persist profiles.",
            },
            { status: 500 },
          )
        }
      }
      throw createError
    }
  } catch (error) {
    log.error("POST failed", { error: error instanceof Error ? error.message : String(error) })
    return Response.json({ error: "Failed to create/update profile" }, { status: 500 })
  }
}

function isStorageError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code
  return code === "ENOENT" || code === "EACCES" || code === "EPERM" || code === "EROFS"
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
  // Fix L14: anche le GET (incluse ?new) passano dal rate limit — prima
  // erano illimitate e un client poteva generare UUID a raffica o scandire
  // i profili per UUID.
  const rl = rateLimit(rateLimitKey(req), "profile")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
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
  // hasPassword (per lo sblocco al rientro). Le apiKeys NON sono esposte qui:
  // si caricano solo via POST action:"load" dopo la verifica della password.
  const full = await getFullProfileData(uuid)
  return Response.json({ profileId: uuid, config, hasPassword: !!full?.passwordHash })
}

/**
 * DELETE /api/profile?u=<UUID>
 *
 * Elimina un profilo. Richiede admin token per evitare eliminazioni
 * non autorizzate (i profile UUID sono esposti nelle URL dei poster).
 */
export async function DELETE(req: NextRequest) {
  // Eliminazione profilo: richiede SEMPRE admin token, anche su istanze
  // pubbliche (gli UUID dei profili sono esposti nelle URL dei poster).
  if (!requireAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  const uuid = req.nextUrl.searchParams.get("u")
  if (!uuid) {
    return Response.json({ error: "Missing 'u' query parameter" }, { status: 400 })
  }
  await deleteProfile(uuid)
  return Response.json({ success: true })
}
