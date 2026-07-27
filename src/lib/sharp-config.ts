import sharp from "sharp"

let initialized = false

/**
 * Inizializza la configurazione globale di sharp.
 * Va chiamata una volta all'avvio prima di usare sharp.
 * Separata dal module level per evitare side-effect all'import.
 */
export function initSharp(): void {
  if (initialized) return
  initialized = true

  const concurrency = Number(process.env.SHARP_CONCURRENCY) || 0
  const cacheMemory = Number(process.env.SHARP_CACHE_MEMORY_MB) || 0
  const cacheItems = Number(process.env.SHARP_CACHE_ITEMS) || 0

  if (concurrency > 0) sharp.concurrency(concurrency)
  if (cacheMemory > 0 || cacheItems > 0) {
    const opts: { memory?: number; items?: number } = {}
    if (cacheMemory > 0) opts.memory = cacheMemory
    if (cacheItems > 0) opts.items = cacheItems
    sharp.cache(opts)
  }
}

// Backward compat: init automatico al primo import
initSharp()

export default sharp
