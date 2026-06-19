import { cacheClear } from "@/lib/cache"
import fs from "node:fs"
import path from "node:path"

async function clearDiskPosters() {
  const dirs = [
    path.join(process.cwd(), "data", "posters"),
    "/data/posters",
  ]
  let count = 0
  for (const dir of dirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
        for (const f of files) {
          fs.unlinkSync(path.join(dir, f))
          count++
        }
      }
    } catch {}
  }
  return count
}

export async function GET() {
  cacheClear()
  const diskCount = await clearDiskPosters()
  return Response.json({ ok: true, memoryCleared: true, diskFilesRemoved: diskCount })
}
