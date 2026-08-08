/**
 * Lettura del body con cap sul numero di byte, indipendente da content-length.
 *
 * S4: un body in chunked encoding non ha l'header content-length, quindi un
 * check sull'header non basta — senza un limite reale un body enorme viene
 * letto per intero in memoria prima del parse (memory exhaustion). Leggendo
 * lo stream a chunk ci si ferma appena si supera il limite (→ 413).
 */

/** Default condiviso per i body JSON delle route admin/editor. */
export const DEFAULT_MAX_BODY_BYTES = 100_000

export class BodyTooLargeError extends Error {
  constructor() {
    super("Request body too large")
    this.name = "BodyTooLargeError"
  }
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super("Invalid JSON body")
    this.name = "InvalidJsonBodyError"
  }
}

/**
 * Legge il body fino a `maxBytes` byte. Ritorna null se il body lo supera
 * (lo stream viene annullato per non consumare memoria ulteriore).
 */
export async function readBodyBytes(req: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (!req.body) return new Uint8Array(0)
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.byteLength
  }
  return merged
}

/**
 * Legge e interpreta il body come JSON con cap sui byte.
 * Lancia BodyTooLargeError se supera `maxBytes`, InvalidJsonBodyError se non
 * è JSON valido.
 */
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const bytes = await readBodyBytes(req, maxBytes)
  if (bytes === null) throw new BodyTooLargeError()
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new InvalidJsonBodyError()
  }
}
