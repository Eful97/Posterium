import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PosteriumUserConfig } from "@/lib/config-token"

const SAMPLE_CONFIG: PosteriumUserConfig = {
  globalBadges: true,
  rankingBadges: false,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
  blurEnabled: true,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  gradientHeight: 30,
  networkLogo: true,
  autoRotateClean: false,
  logoFitEnabled: true,
  customBadge: "Test",
}

const MINIMAL_CONFIG: PosteriumUserConfig = {
  globalBadges: false,
  rankingBadges: false,
  badgeStyle: "pill",
  rankingBadgeStyle: "bar",
  blurEnabled: false,
  blurIntensity: 3,
  blurFade: 50,
  blurDarkness: 30,
  gradientHeight: 20,
  networkLogo: false,
  autoRotateClean: true,
  logoFitEnabled: false,
}

let tempDir: string | undefined
const origDataDir = process.env.POSTERIUM_DATA_DIR
const origKvUrl = process.env.KV_REST_API_URL
const origKvToken = process.env.KV_REST_API_TOKEN

beforeEach(() => {
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
})

afterEach(async () => {
  if (origKvUrl) process.env.KV_REST_API_URL = origKvUrl
  else delete process.env.KV_REST_API_URL
  if (origKvToken) process.env.KV_REST_API_TOKEN = origKvToken
  else delete process.env.KV_REST_API_TOKEN
  if (origDataDir === undefined) delete process.env.POSTERIUM_DATA_DIR
  else process.env.POSTERIUM_DATA_DIR = origDataDir
  vi.resetModules()
  if (tempDir) await fsp.rm(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

async function importStore() {
  vi.resetModules()
  return import("@/lib/profile-store")
}

function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

describe("generateProfileId", () => {
  it("returns a valid UUID v4", async () => {
    const { generateProfileId } = await importStore()
    const id = generateProfileId()
    expect(isValidUuid(id)).toBe(true)
  })

  it("returns different ids on each call", async () => {
    const { generateProfileId } = await importStore()
    const a = generateProfileId()
    const b = generateProfileId()
    expect(a).not.toBe(b)
  })
})

describe("createOrUpdateProfile", () => {
  it("creates a new profile and returns a valid UUID", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)
    expect(isValidUuid(uuid)).toBe(true)
  })

  it("persists config so getProfile can retrieve it", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)
    const retrieved = await getProfile(uuid)
    expect(retrieved).toEqual(SAMPLE_CONFIG)
  })

  it("updates an existing profile when existingProfileId is provided", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)
    const updated = await createOrUpdateProfile(MINIMAL_CONFIG, uuid)
    expect(updated).toBe(uuid)

    const retrieved = await getProfile(uuid)
    expect(retrieved).toEqual(MINIMAL_CONFIG)
  })

  it("uses client-provided UUID when existingProfileId does not exist", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile } = await importStore()

    const fakeId = "00000000-0000-0000-0000-000000000000"
    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, fakeId)
    expect(isValidUuid(uuid)).toBe(true)
    // The server should use the client-provided UUID (stile AIOMetadata)
    expect(uuid).toBe(fakeId)
  })

  it("stores password hash when password is provided", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getFullProfileData } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, undefined, "secret123")
    const full = await getFullProfileData(uuid)
    expect(full).not.toBeNull()
    expect(full!.passwordHash).toBeDefined()
    expect(full!.salt).toBeDefined()
    expect(full!.config).toEqual(SAMPLE_CONFIG)
  })

  it("preserves password on update when no new password is given", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getFullProfileData } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, undefined, "secret123")
    const before = await getFullProfileData(uuid)

    await createOrUpdateProfile(MINIMAL_CONFIG, uuid)
    const after = await getFullProfileData(uuid)
    expect(after!.passwordHash).toBe(before!.passwordHash)
    expect(after!.salt).toBe(before!.salt)
    expect(after!.config).toEqual(MINIMAL_CONFIG)
  })

  it("updates password when new password is provided on update", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getFullProfileData } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, undefined, "secret123")
    await createOrUpdateProfile(SAMPLE_CONFIG, uuid, "newsecret456")
    const full = await getFullProfileData(uuid)
    expect(full!.passwordHash).toBeDefined()
  })
})

describe("getProfile", () => {
  it("returns null for a non-existent UUID", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { getProfile } = await importStore()

    const result = await getProfile("550e8400-e29b-41d4-a716-446655440000")
    expect(result).toBeNull()
  })

  it("returns null for malformed UUID (no dashes)", async () => {
    const { getProfile } = await importStore()
    const result = await getProfile("550e8400e29b41d4a716446655440000")
    expect(result).toBeNull()
  })

  it("returns null for completely invalid string", async () => {
    const { getProfile } = await importStore()
    const result = await getProfile("not-a-uuid")
    expect(result).toBeNull()
  })

  it("returns null for empty string", async () => {
    const { getProfile } = await importStore()
    const result = await getProfile("")
    expect(result).toBeNull()
  })

  it("retrieves config after createOrUpdateProfile", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)
    const retrieved = await getProfile(uuid)
    expect(retrieved).toEqual(SAMPLE_CONFIG)
    expect(retrieved?.globalBadges).toBe(true)
    expect(retrieved?.rankingBadgeStyle).toBe("default")
    expect(retrieved?.customBadge).toBe("Test")
  })

  it("does not expose passwordHash or salt", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, undefined, "secret123")
    const retrieved = await getProfile(uuid)
    expect(retrieved).toEqual(SAMPLE_CONFIG)
    expect((retrieved as any).passwordHash).toBeUndefined()
    expect((retrieved as any).salt).toBeUndefined()
  })
})

describe("verifyProfilePassword", () => {
  it("returns true for correct password", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, verifyProfilePassword } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, undefined, "secret123")
    const valid = await verifyProfilePassword(uuid, "secret123")
    expect(valid).toBe(true)
  })

  it("returns false for wrong password", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, verifyProfilePassword } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, undefined, "correctpassword")
    const valid = await verifyProfilePassword(uuid, "wrongpassword")
    expect(valid).toBe(false)
  })

  it("returns false for non-existent profile", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { verifyProfilePassword } = await importStore()

    const valid = await verifyProfilePassword("550e8400-e29b-41d4-a716-446655440000", "any")
    expect(valid).toBe(false)
  })

  it("returns false for profile without password", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, verifyProfilePassword } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)
    const valid = await verifyProfilePassword(uuid, "any")
    expect(valid).toBe(false)
  })

  it("returns false for malformed UUID", async () => {
    const { verifyProfilePassword } = await importStore()
    const valid = await verifyProfilePassword("not-a-uuid", "any")
    expect(valid).toBe(false)
  })
})

describe("getFullProfileData", () => {
  it("returns full profile with password fields", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getFullProfileData } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, undefined, "secret123")
    const full = await getFullProfileData(uuid)
    expect(full).not.toBeNull()
    expect(full!.config).toEqual(SAMPLE_CONFIG)
    expect(full!.passwordHash).toBeDefined()
    expect(full!.salt).toBeDefined()
  })

  it("returns null for non-existent UUID", async () => {
    const { getFullProfileData } = await importStore()
    const result = await getFullProfileData("550e8400-e29b-41d4-a716-446655440000")
    expect(result).toBeNull()
  })
})

describe("deleteProfile", () => {
  it("removes an existing profile", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getProfile, deleteProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)
    expect(await getProfile(uuid)).not.toBeNull()

    await deleteProfile(uuid)
    expect(await getProfile(uuid)).toBeNull()
  })

  it("is idempotent — deleting a non-existent UUID does not throw", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { deleteProfile } = await importStore()

    await expect(deleteProfile("550e8400-e29b-41d4-a716-446655440000")).resolves.toBeUndefined()
  })

  it("no-ops on invalid UUID format", async () => {
    const { deleteProfile } = await importStore()

    await expect(deleteProfile("bad-uuid")).resolves.toBeUndefined()
  })

  it("allows recreation after deletion", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getProfile, deleteProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)
    expect(await getProfile(uuid)).not.toBeNull()

    await deleteProfile(uuid)
    expect(await getProfile(uuid)).toBeNull()

    const newUuid = await createOrUpdateProfile(MINIMAL_CONFIG, uuid)
    expect(isValidUuid(newUuid)).toBe(true)
    // Should reuse the same UUID since the client asked for it (stile AIOMetadata)
    expect(newUuid).toBe(uuid)
  })
})

describe("concurrent writes", () => {
  it("handles concurrent createOrUpdateProfile calls without losing data", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getProfile } = await importStore()

    const [uuid1, uuid2] = await Promise.all([
      createOrUpdateProfile(SAMPLE_CONFIG),
      createOrUpdateProfile(MINIMAL_CONFIG),
    ])

    expect(isValidUuid(uuid1)).toBe(true)
    expect(isValidUuid(uuid2)).toBe(true)
    expect(uuid1).not.toBe(uuid2)

    const c1 = await getProfile(uuid1)
    const c2 = await getProfile(uuid2)
    expect(c1).toEqual(SAMPLE_CONFIG)
    expect(c2).toEqual(MINIMAL_CONFIG)
  })

  it("handles concurrent create and read without hanging", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile, getProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)
    const results = await Promise.all([
      getProfile(uuid),
      getProfile(uuid),
      getProfile(uuid),
    ])
    expect(results).toHaveLength(3)
    for (const r of results) {
      expect(r).toEqual(SAMPLE_CONFIG)
    }
  })
})

describe("data persistence across module reloads", () => {
  it("survives a module reset (file-based store)", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir

    const mod1 = await importStore()
    const uuid = await mod1.createOrUpdateProfile(SAMPLE_CONFIG)
    const c1 = await mod1.getProfile(uuid)
    expect(c1).toEqual(SAMPLE_CONFIG)

    vi.resetModules()
    const mod2 = await import("@/lib/profile-store")
    const c2 = await mod2.getProfile(uuid)
    expect(c2).toEqual(SAMPLE_CONFIG)
  })
})

describe("profiles file structure", () => {
  it("writes profiles in ProfileData format to the expected JSON file", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG)

    const raw = await fsp.readFile(path.join(tempDir, "profiles.json"), "utf-8")
    const data = JSON.parse(raw)
    expect(data[uuid]).toEqual(expect.objectContaining({ config: SAMPLE_CONFIG }))
  })

  it("writes passwordHash and salt when password is provided", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir
    const { createOrUpdateProfile } = await importStore()

    const uuid = await createOrUpdateProfile(SAMPLE_CONFIG, undefined, "mypassword")

    const raw = await fsp.readFile(path.join(tempDir, "profiles.json"), "utf-8")
    const data = JSON.parse(raw)
    expect(data[uuid].config).toEqual(SAMPLE_CONFIG)
    expect(data[uuid].passwordHash).toBeDefined()
    expect(data[uuid].passwordHash).toHaveLength(128)
    expect(data[uuid].salt).toBeDefined()
    expect(data[uuid].salt).toHaveLength(32)
  })

  it("creates an empty object when no profiles exist", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir

    const { getProfile } = await importStore()
    const result = await getProfile("550e8400-e29b-41d4-a716-446655440000")
    expect(result).toBeNull()
  })
})

describe("backward compatibility with old format", () => {
  it("reads old-style profiles (direct PosteriumUserConfig)", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir

    const uuid = "550e8400-e29b-41d4-a716-446655440000"
    const oldData = { [uuid]: SAMPLE_CONFIG }
    await fsp.writeFile(path.join(tempDir, "profiles.json"), JSON.stringify(oldData))

    const { getProfile } = await importStore()
    const retrieved = await getProfile(uuid)
    expect(retrieved).toEqual(SAMPLE_CONFIG)
  })

  it("reads new format mixed with old format", async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "profile-store-"))
    process.env.POSTERIUM_DATA_DIR = tempDir

    const oldUuid = "550e8400-e29b-41d4-a716-446655440000"
    const newUuid = "660e8400-e29b-41d4-a716-446655440001"
    const mixedData = {
      [oldUuid]: SAMPLE_CONFIG,
      [newUuid]: { config: MINIMAL_CONFIG },
    }
    await fsp.writeFile(path.join(tempDir, "profiles.json"), JSON.stringify(mixedData))

    const { getProfile } = await importStore()
    const oldResult = await getProfile(oldUuid)
    expect(oldResult).toEqual(SAMPLE_CONFIG)

    const newResult = await getProfile(newUuid)
    expect(newResult).toEqual(MINIMAL_CONFIG)
  })
})
