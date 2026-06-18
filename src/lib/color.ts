const CACHE = new Map<string, string>()
const CACHE_MAX = 200

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    switch (mx) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1)
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0")
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

export async function averageColor(imgUrl: string): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = "anonymous"
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("load failed"))
      el.src = imgUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = 1; canvas.height = 1
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    const toHex = (x: number) => x.toString(16).padStart(2, "0")
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  } catch {
    return null
  }
}

export async function averageTopColor(imgUrl: string): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = "anonymous"
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("load failed"))
      el.src = imgUrl
    })

    const w = img.naturalWidth
    const h = img.naturalHeight
    const regionH = Math.max(1, Math.round(h * 0.05))
    const canvas = document.createElement("canvas")
    canvas.width = 1; canvas.height = 1
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0, w, regionH, 0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    const toHex = (x: number) => x.toString(16).padStart(2, "0")
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  } catch {
    return null
  }
}

export async function extractColor(imgUrl: string): Promise<string | null> {
  if (CACHE.has(imgUrl)) return CACHE.get(imgUrl)!

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = "anonymous"
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("load failed"))
      el.src = imgUrl
    })

    const W = 80, H = Math.round(W * (img.height / img.width))
    const canvas = document.createElement("canvas")
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0, W, H)

    const data = ctx.getImageData(0, 0, W, H).data
    const bins = new Map<number, number>()
    let total = 0

    for (let i = 0; i < data.length; i += 4) {
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
      if (s < 20 || l < 12 || l > 80) continue
      const key = Math.round(h / 10) * 10
      bins.set(key, (bins.get(key) || 0) + 1)
      total++
    }

    if (total === 0) {
      for (let i = 0; i < data.length; i += 40) {
        const [h] = rgbToHsl(data[i], data[i + 1], data[i + 2])
        const key = Math.round(h / 10) * 10
        bins.set(key, (bins.get(key) || 0) + 1)
      }
    }

    let bestHue = 260, bestCount = 0
    for (const [hue, count] of bins) {
      if (count > bestCount) { bestHue = hue; bestCount = count }
    }

    const color = hslToHex(bestHue, 65, 55)
    if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value!)
    CACHE.set(imgUrl, color)
    return color
  } catch {
    return null
  }
}
