import { cacheClear } from "@/lib/cache"
import { checkAdminToken, adminAuthResponse } from "@/lib/auth"

export async function POST(req: Request) {
  if (!checkAdminToken(req)) return adminAuthResponse()
  cacheClear()
  return Response.json({ ok: true, message: "Cache svuotata" })
}
