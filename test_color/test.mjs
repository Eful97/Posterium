import sharp from 'sharp'

const url = 'https://image.tmdb.org/t/p/original/cPaCvcYZwcgX64SAymsTiQSg0Vr.jpg'

const resp = await fetch(url)
const buf = Buffer.from(await resp.arrayBuffer())

// Simulate server-side: resize poster to 1000x1500 then extract
const poster = await sharp(buf).resize(1000, 1500, { fit: 'fill' }).toBuffer()

// extractMostSaturated logic
const pixelBuf = await sharp(poster).resize(200, 300, { fit: 'fill' }).raw().toBuffer()

const pixels = []
for (let i = 0; i < pixelBuf.length; i += 4) {
  const r = pixelBuf[i] / 255, g = pixelBuf[i + 1] / 255, b = pixelBuf[i + 2] / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  if (s < 0.05 || l < 0.03 || l > 0.97) continue
  pixels.push({ r: pixelBuf[i], g: pixelBuf[i + 1], b: pixelBuf[i + 2], s, l })
}

console.log(`Valid pixels: ${pixels.length}`)

const n = pixels.length
const bgMean = {
  r: pixels.reduce((a, p) => a + p.r, 0) / n,
  g: pixels.reduce((a, p) => a + p.g, 0) / n,
  b: pixels.reduce((a, p) => a + p.b, 0) / n,
}
console.log(`bgMean RGB: (${bgMean.r.toFixed(0)}, ${bgMean.g.toFixed(0)}, ${bgMean.b.toFixed(0)})`)

// Show top 10 scores
const scored = pixels.map(p => {
  const chroma = p.s * (1 - Math.abs(p.l - 0.5) * 2)
  const dr = p.r - bgMean.r, dg = p.g - bgMean.g, db = p.b - bgMean.b
  const divergence = Math.sqrt(dr*dr + dg*dg + db*db) / 441.67
  const score = chroma * divergence
  return { ...p, chroma, divergence, score }
})
scored.sort((a, b) => b.score - a.score)

console.log('\nTop 10 colors by score:')
for (let i = 0; i < Math.min(10, scored.length); i++) {
  const p = scored[i]
  const hex = `#${p.r.toString(16).padStart(2,'0')}${p.g.toString(16).padStart(2,'0')}${p.b.toString(16).padStart(2,'0')}`
  console.log(`  #${i+1}: RGB(${p.r},${p.g},${p.b}) ${hex}  s=${p.s.toFixed(3)} l=${p.l.toFixed(3)} chroma=${p.chroma.toFixed(3)} div=${p.divergence.toFixed(3)} score=${p.score.toFixed(3)}`)
}

// Apply lightness clamp to winner
let best = scored[0]
let cr = best.r, cg = best.g, cb = best.b
const clampLum = 0.2126 * cr/255 + 0.7152 * cg/255 + 0.0722 * cb/255
console.log(`\nWinner before clamp: #${cr.toString(16).padStart(2,'0')}${cg.toString(16).padStart(2,'0')}${cb.toString(16).padStart(2,'0')}  lum=${clampLum.toFixed(4)}`)
if (clampLum < 0.4) {
  cr = Math.round(cr + (255 - cr) * 0.2)
  cg = Math.round(cg + (255 - cg) * 0.2)
  cb = Math.round(cb + (255 - cb) * 0.2)
} else if (clampLum > 0.7) {
  cr = Math.round(cr * 0.85)
  cg = Math.round(cg * 0.85)
  cb = Math.round(cb * 0.85)
}
cr = Math.max(0, Math.min(255, cr))
cg = Math.max(0, Math.min(255, cg))
cb = Math.max(0, Math.min(255, cb))
console.log(`Winner after clamp:  #${cr.toString(16).padStart(2,'0')}${cg.toString(16).padStart(2,'0')}${cb.toString(16).padStart(2,'0')}`)

// Test: what if we also resize to 100px wide (client approach)?
const clientBuf = await sharp(poster).resize(200, 300, { fit: 'fill' }).raw().toBuffer()
const cPixels = []
for (let i = 0; i < clientBuf.length; i += 4) {
  const r = clientBuf[i] / 255, g = clientBuf[i + 1] / 255, b = clientBuf[i + 2] / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  if (s < 0.05 || l < 0.03 || l > 0.97) continue
  cPixels.push({ r: clientBuf[i], g: clientBuf[i + 1], b: clientBuf[i + 2], s, l })
}
const cn = cPixels.length
const cMean = {
  r: cPixels.reduce((a, p) => a + p.r, 0) / cn,
  g: cPixels.reduce((a, p) => a + p.g, 0) / cn,
  b: cPixels.reduce((a, p) => a + p.b, 0) / cn,
}
const cScored = cPixels.map(p => {
  const chroma = p.s * (1 - Math.abs(p.l - 0.5) * 2)
  const dr = p.r - cMean.r, dg = p.g - cMean.g, db = p.b - cMean.b
  const divergence = Math.sqrt(dr*dr + dg*dg + db*db) / 441.67
  return { ...p, chroma, divergence, score: chroma * divergence }
})
cScored.sort((a, b) => b.score - a.score)
console.log(`\nClient approach (100px, step2) — top 10:`)
for (let i = 0; i < Math.min(10, cScored.length); i++) {
  const p = cScored[i]
  const hex = `#${p.r.toString(16).padStart(2,'0')}${p.g.toString(16).padStart(2,'0')}${p.b.toString(16).padStart(2,'0')}`
  console.log(`  #${i+1}: RGB(${p.r},${p.g},${p.b}) ${hex}  s=${p.s.toFixed(3)} l=${p.l.toFixed(3)} chroma=${p.chroma.toFixed(3)} div=${p.divergence.toFixed(3)} score=${p.score.toFixed(3)}`)
}
