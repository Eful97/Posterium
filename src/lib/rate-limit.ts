const buckets = new Map<string, { tokens: number; lastRefill: number }>()
const CLEANUP_INTERVAL = 30 * 60 * 1000
// Cap sul numero di bucket: gli IP spoofati (X-Forwarded-For senza proxy
// trusted) possono generare chiavi arbitrarie. Oltre il cap, i bucket più
// vecchi vengono rimossi (FIFO) per tenere la memoria bounded.
const MAX_KEYS = 50_000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function evictOldest() {
  const oldest = buckets.keys().next().value
  if (oldest !== undefined) buckets.delete(oldest)
}

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - CLEANUP_INTERVAL
    for (const [key, b] of buckets) {
      if (b.lastRefill < cutoff) buckets.delete(key)
    }
  }, CLEANUP_INTERVAL)
}

interface BucketConfig {
  maxTokens: number
  refillRate: number
  refillWindow: number
}

// F7: il bucket poster era 100 burst/10s — un catalog load con molti poster
// freddi poteva andare in 429. Sovrascrivibile via env a module level.
const POSTER_MAX_TOKENS = (() => {
  const raw = process.env.POSTERIUM_RATELIMIT_POSTER_MAX
  const n = raw ? parseInt(raw, 10) : 200
  return Number.isFinite(n) && n >= 10 && n <= 10000 ? n : 200
})()

const limits: Record<string, BucketConfig> = {
  default: { maxTokens: 120, refillRate: 10, refillWindow: 1000 },
  tmdb:    { maxTokens: 60,  refillRate: 5,  refillWindow: 1000 },
  poster:  { maxTokens: POSTER_MAX_TOKENS, refillRate: 20, refillWindow: 1000 },
  search:  { maxTokens: 30,  refillRate: 3,  refillWindow: 1000 },
  mappings: { maxTokens: 120, refillRate: 10, refillWindow: 1000 },
  catalog:  { maxTokens: 60,  refillRate: 5,  refillWindow: 1000 },
  // Warmup: operazione pesante (rende molti poster) — burst basso e refill lento
  // per evitare che chiunque (istanza pubblica) possa triggerare carico.
  warmup:   { maxTokens: 5,  refillRate: 1,  refillWindow: 1000 },
  // Profili: creazione/aggiornamento con scrypt (CPU) su KV. Su istanza
  // pubblica evita che i bot creino profili a raffica.
  profile:  { maxTokens: 20, refillRate: 2,  refillWindow: 1000 },
  // Config token: generazione di link firmati — burst contenuto per evitare
  // che l'endpoint venga usato come generatore massivo.
  config:   { maxTokens: 30, refillRate: 3,  refillWindow: 1000 },
}

export function rateLimit(key: string, bucket: string): { ok: boolean; retAfter: number } {
  startCleanup()
  const cfg = limits[bucket] || limits.default
  const now = Date.now()
  let b = buckets.get(key)

  if (!b) {
    if (buckets.size >= MAX_KEYS) evictOldest()
    b = { tokens: cfg.maxTokens, lastRefill: now }
    buckets.set(key, b)
  }

  const elapsed = now - b.lastRefill
  if (elapsed >= cfg.refillWindow) {
    const cycles = Math.floor(elapsed / cfg.refillWindow)
    const refill = cycles * cfg.refillRate
    b.tokens = Math.min(b.tokens + refill, cfg.maxTokens)
    b.lastRefill += cycles * cfg.refillWindow
  }

  if (b.tokens > 0) {
    b.tokens--
    return { ok: true, retAfter: 0 }
  }

  const waitMs = b.lastRefill + cfg.refillWindow - now
  return { ok: false, retAfter: Math.ceil(waitMs / 1000) }
}

export function rateLimitKey(request: Request): string {
  // Preferenza: header impostati/sovrascritti da proxy trusted (Cloudflare,
  // HF edge, Nginx) e quindi non falsificabili dal client.
  // 1) cf-connecting-ip — scritto da Cloudflare, ignora il valore client.
  // 2) x-real-ip — scritto da Nginx/HF, ignora il valore client.
  // 3) ultimo hop di x-forwarded-for — con un proxy trusted che APPENDE il
  //    proprio valore, l'ultimo elemento è l'IP reale del client; MA se il
  //    deploy esegue senza reverse proxy l'header è interamente spoofabile
  //    dal client → usare l'ultimo valore resta la scelta migliore senza proxy,
  //    ma i deploy diretti dovrebbero mettere un reverse proxy in testa.
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const parts = forwarded.split(",")
    const last = parts[parts.length - 1]?.trim()
    if (last) return last
  }
  return "local"
}

export function rateLimitResponse(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: "Troppe richieste. Attendi qualche secondo." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
  })
}
