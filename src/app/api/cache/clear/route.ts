import { cacheClear } from "@/lib/cache"
import { diskCacheClear } from "@/lib/disk-cache"

export async function GET() {
  cacheClear()
  diskCacheClear("poster")
  diskCacheClear("tmdb")
  return Response.json({ ok: true })
}
