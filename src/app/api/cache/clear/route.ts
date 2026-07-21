import { cacheClear } from "@/lib/cache"
import { clearAutoFitCache } from "@/lib/poster-auto-fit"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"

export async function POST(req: Request) {
  if (!checkAdminToken(req)) return adminAuthResponse()
  cacheClear()
  clearAutoFitCache()
  return Response.json({ ok: true, message: "Cache svuotata" })
}
