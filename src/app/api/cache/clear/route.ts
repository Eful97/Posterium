import { cacheClear } from "@/lib/cache"

export async function GET() {
  cacheClear()
  return Response.json({ ok: true })
}
