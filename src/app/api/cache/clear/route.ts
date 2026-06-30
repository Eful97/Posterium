import fs from "node:fs"
import path from "node:path"
import { DATA_DIR } from "@/lib/data-dir"
import { cacheClear } from "@/lib/cache"
import { diskCacheClear } from "@/lib/disk-cache"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"

// DATA_DIR imported from data-dir

export async function POST(req: Request) {
  if (!checkAdminToken(req)) return adminAuthResponse()
  cacheClear()
  diskCacheClear("poster")
  diskCacheClear("tmdb")
  try { fs.unlinkSync(path.join(DATA_DIR, "flixpatrol_cache.json")) } catch {}
  return Response.json({ ok: true, message: "Cache svuotata" })
}
