import sharp from "sharp"

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

export default sharp
