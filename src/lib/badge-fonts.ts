/**
 * Catalogo dei font selezionabili per i badge (condiviso client/server).
 * MODULO PURO (isomorfico): nessun import node — usato sia dal client (UI,
 * URL builder) sia dal server (resvg). I path dei file TTF si risolvono
 * lato server in svg-badge.ts.
 *
 * Ogni font ha i file TTF da incorporare nell'SVG e un widthFactor relativo
 * a Inter (=1.0): i font più larghi di Inter scalano il font-size in modo
 * inversamente proporzionale per mantenere la resa visiva.
 */
export interface BadgeFont {
  readonly key: string
  /** Nome della famiglia (deve combaciare con la family interna del TTF). */
  readonly family: string
  /** Label mostrata nel selettore UI. */
  readonly label: string
  /** File TTF (nomi relativi a src/assets/fonts/) con il peso a cui incorporarli. */
  readonly files: readonly { readonly weight: number; readonly file: string }[]
  /** Larghezza media relativa a Inter (1.0 = stessa larghezza). */
  readonly widthFactor: number
}

export const BADGE_FONTS: readonly BadgeFont[] = [
  {
    key: "inter",
    family: "Inter",
    label: "Inter",
    files: [
      { weight: 400, file: "Inter-Regular.ttf" },
      { weight: 700, file: "Inter-Bold.ttf" },
      { weight: 900, file: "Inter-Black.ttf" },
    ],
    widthFactor: 1,
  },
  {
    key: "bebas",
    family: "Bebas Neue",
    label: "Bebas Neue",
    files: [{ weight: 400, file: "BebasNeue-Regular.ttf" }],
    widthFactor: 0.78,
  },
  {
    key: "anton",
    family: "Anton",
    label: "Anton",
    files: [{ weight: 400, file: "Anton-Regular.ttf" }],
    widthFactor: 0.9,
  },
  {
    key: "playfair",
    family: "Playfair Display",
    label: "Playfair Display",
    files: [{ weight: 700, file: "PlayfairDisplay-Bold.ttf" }],
    widthFactor: 1.05,
  },
  {
    key: "montserrat",
    family: "Montserrat",
    label: "Montserrat",
    files: [
      { weight: 700, file: "Montserrat-Bold.ttf" },
      { weight: 900, file: "Montserrat-Black.ttf" },
    ],
    widthFactor: 1.2,
  },
]

export const DEFAULT_BADGE_FONT = "inter"

export const BADGE_FONT_KEYS = BADGE_FONTS.map((f) => f.key)

const BY_KEY = new Map(BADGE_FONTS.map((f) => [f.key, f]))

export function isBadgeFont(value: string | null | undefined): value is string {
  return typeof value === "string" && BY_KEY.has(value)
}

export function getBadgeFont(key: string): BadgeFont {
  return BY_KEY.get(key) ?? BY_KEY.get(DEFAULT_BADGE_FONT)!
}
