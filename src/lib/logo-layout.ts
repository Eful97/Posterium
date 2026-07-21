import { MAX_LOGO_HEIGHT_RATIO } from "./constants"

type LogoLayoutInput = {
  readonly posterW: number
  readonly posterH: number
  readonly logoW: number
  readonly logoH: number
  readonly logoScale: number
  readonly logoOffsetX: number
  readonly logoOffsetY: number
  readonly hasBadges: boolean
}

type LogoBoxInput = Pick<LogoLayoutInput, "posterW" | "posterH" | "logoW" | "logoH" | "logoScale">

type LogoBox = {
  readonly width: number
  readonly height: number
}

type LogoLayout = LogoBox & {
  readonly left: number
  readonly top: number
}

type LogoOffsetBounds = {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}

function sanePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

export function computeLogoBox(input: LogoBoxInput): LogoBox {
  const posterW = sanePositive(input.posterW, 1000)
  const posterH = sanePositive(input.posterH, 1500)
  const logoW = sanePositive(input.logoW, 1)
  const logoH = sanePositive(input.logoH, 1)
  const scalePct = Math.max(input.logoScale, 10) / 100
  const targetW = Math.min(Math.round(posterW * scalePct), posterW)
  const targetH = Math.round(logoH * (targetW / logoW))
  if (targetH <= posterH) return { width: targetW, height: targetH }

  const ratio = posterH / targetH
  return {
    width: Math.max(Math.round(targetW * ratio), 1),
    height: posterH,
  }
}

export function computeLogoLayout(input: LogoLayoutInput): LogoLayout {
  const posterW = sanePositive(input.posterW, 1000)
  const posterH = sanePositive(input.posterH, 1500)
  const box = computeLogoBox(input)
  const badgeOffset = input.hasBadges ? 0 : Math.round(40 * posterH / 1500)
  const left = Math.round((posterW - box.width) / 2 + input.logoOffsetX)
  const top = Math.max(0, Math.round(posterH - box.height - posterH * 0.1 + input.logoOffsetY + badgeOffset))
  return { ...box, left, top }
}

export function computeLogoOffsetBounds(input: Omit<LogoLayoutInput, "logoOffsetX" | "logoOffsetY">): LogoOffsetBounds {
  const posterW = sanePositive(input.posterW, 1000)
  const posterH = sanePositive(input.posterH, 1500)
  const box = computeLogoBox(input)
  const badgeOffset = input.hasBadges ? 0 : Math.round(40 * posterH / 1500)
  const halfX = Math.round((posterW - box.width) / 2)
  const baseTop = Math.round(posterH - box.height - posterH * 0.1 + badgeOffset)
  const maxY = Math.round(posterH * 0.1 - badgeOffset)
  return { minX: cleanZero(-halfX), maxX: cleanZero(halfX), minY: cleanZero(-baseTop), maxY: cleanZero(maxY) }
}
