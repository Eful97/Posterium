import fs from "node:fs"
import path from "node:path"
import { cacheClear } from "@/lib/cache"
import { diskCacheClear } from "@/lib/disk-cache"

const DATA_DIR = (() => {
  const hfData = "/data"
  try {
    if (fs.existsSync(hfData)) {
      const testFile = path.join(hfData, ".write_test")
      fs.writeFileSync(testFile, "ok")
      fs.unlinkSync(testFile)
      return hfData
    }
  } catch {}
  return path.join(process.cwd(), "data")
})()

export async function GET() {
  cacheClear()
  diskCacheClear("poster")
  diskCacheClear("tmdb")
  try { fs.unlinkSync(path.join(DATA_DIR, "flixpatrol_cache.json")) } catch {}
  return Response.json({ ok: true })
}
