import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { renderExtraBadge, renderGenreBadge, renderRankingBadge } from "@/lib/svg-badge"

export const runtime = "nodejs"

const MIN_PREVIEW_W = 120
const MAX_PREVIEW_W = 1400
const DEFAULT_PREVIEW_W = 380

type BadgeKind = "genre" | "ranking" | "extra"
type RenderedBadge = { png: Buffer; w: number; h: number }

const GENRE_STYLES = new Set(["shadow", "pill", "bar", "colored"])
const RANKING_STYLES = new Set(["default", "bar", "colored"])

function readKind(value: string | null): BadgeKind | null {
  if (value === "genre" || value === "ranking" || value === "extra") return value
  return null
}

function readWidth(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_PREVIEW_W
  return Math.min(Math.max(Math.round(parsed), MIN_PREVIEW_W), MAX_PREVIEW_W)
}

function readNumber(value: string | null): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readBool(value: string | null): boolean | undefined {
  if (value === "1") return true
  if (value === "0") return false
  return undefined
}

function readStyle(value: string | null, allowed: Set<string>, fallback: string): string {
  if (value && allowed.has(value)) return value
  return fallback
}

function readText(value: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function pngResponse(badge: RenderedBadge): Response {
  return new Response(new Uint8Array(badge.png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=60",
      "X-Badge-W": String(badge.w),
      "X-Badge-H": String(badge.h),
    },
  })
}

function badRequest(message: string): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 400 })
}

async function renderGenrePreview(params: URLSearchParams, pw: number): Promise<Response> {
  const genre = readText(params.get("genre"))
  const vote = readNumber(params.get("vote"))
  if (!genre) return badRequest("Missing genre")
  if (vote === null) return badRequest("Invalid vote")

  const year = readText(params.get("year")) ?? undefined
  const style = readStyle(params.get("style"), GENRE_STYLES, "shadow")
  const badge = await renderGenreBadge(genre, vote, pw, year, style, readText(params.get("ac")) ?? undefined, readBool(params.get("tl")))
  return pngResponse(badge)
}

async function renderRankingPreview(params: URLSearchParams, pw: number): Promise<Response> {
  const rank = readNumber(params.get("rank")) ?? 13
  const label = readText(params.get("label")) ?? "Oggi"
  const style = readStyle(params.get("style"), RANKING_STYLES, "default")
  const badge = await renderRankingBadge(rank, pw, label, readBool(params.get("tl")), style, readText(params.get("ac")) ?? undefined)
  return pngResponse(badge)
}

async function renderExtraPreview(params: URLSearchParams, pw: number): Promise<Response> {
  const label = readText(params.get("label"))
  if (!label) return badRequest("Missing label")

  const style = readStyle(params.get("style"), RANKING_STYLES, "default")
  const badge = await renderExtraBadge(label, pw, readBool(params.get("tl")), style, readText(params.get("ac")) ?? undefined)
  return pngResponse(badge)
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const params = req.nextUrl.searchParams
    const kind = readKind(params.get("kind"))
    if (!kind) return badRequest("Invalid badge kind")

    const pw = readWidth(params.get("pw"))
    if (kind === "genre") return await renderGenrePreview(params, pw)
    if (kind === "ranking") return await renderRankingPreview(params, pw)
    return await renderExtraPreview(params, pw)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Badge preview failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
