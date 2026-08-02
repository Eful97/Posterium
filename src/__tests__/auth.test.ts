import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { checkAdminToken } from "@/lib/auth"

// Regressione per il bug HF: senza ADMIN_TOKEN configurato, in produzione il
// salvataggio poster (POST /api/mappings) era bloccato (fail-closed introdotto
// in 415aad3) → 401 su HF Spaces dove il token non è mai impostato.
// Il comportamento corretto: istanza pubblica senza token → route aperte;
// token configurato → fail-closed (header assente/errato → rifiutato).
describe("checkAdminToken", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.POSTERIUM_ADMIN_TOKEN
    delete process.env.ADMIN_TOKEN
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("allows requests in production when no admin token is configured (public instance, HF Spaces)", () => {
    Object.assign(process.env, { NODE_ENV: "production" })
    const req = new NextRequest("http://localhost:3000/api/mappings", { method: "POST" })
    expect(checkAdminToken(req)).toBe(true)
  })

  it("allows requests in dev when no admin token is configured", () => {
    Object.assign(process.env, { NODE_ENV: "development" })
    const req = new NextRequest("http://localhost:3000/api/mappings", { method: "POST" })
    expect(checkAdminToken(req)).toBe(true)
  })

  it("rejects when a token is configured but the header is missing", () => {
    Object.assign(process.env, { NODE_ENV: "production" })
    process.env.POSTERIUM_ADMIN_TOKEN = "secret"
    const req = new NextRequest("http://localhost:3000/api/mappings", { method: "POST" })
    expect(checkAdminToken(req)).toBe(false)
  })

  it("accepts a valid x-admin-token header", () => {
    process.env.POSTERIUM_ADMIN_TOKEN = "secret"
    const req = new NextRequest("http://localhost:3000/api/mappings", {
      method: "POST",
      headers: { "x-admin-token": "secret" },
    })
    expect(checkAdminToken(req)).toBe(true)
  })

  it("accepts a valid Authorization Bearer header", () => {
    process.env.ADMIN_TOKEN = "secret"
    const req = new NextRequest("http://localhost:3000/api/mappings", {
      method: "POST",
      headers: { authorization: "Bearer secret" },
    })
    expect(checkAdminToken(req)).toBe(true)
  })

  it("rejects a wrong bearer token", () => {
    process.env.POSTERIUM_ADMIN_TOKEN = "secret"
    const req = new NextRequest("http://localhost:3000/api/mappings", {
      method: "POST",
      headers: { authorization: "Bearer wrong" },
    })
    expect(checkAdminToken(req)).toBe(false)
  })

  it("does not short-circuit on prefix matches (constant-time compare)", () => {
    process.env.POSTERIUM_ADMIN_TOKEN = "secret"
    const req = new NextRequest("http://localhost:3000/api/mappings", {
      method: "POST",
      headers: { "x-admin-token": "secre" },
    })
    expect(checkAdminToken(req)).toBe(false)
  })
})
