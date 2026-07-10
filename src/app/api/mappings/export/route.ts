import { getAll } from "@/lib/store"
import { APP_VERSION } from "@/generated/app-version"

export async function GET() {
  const mappings = await getAll()
  return Response.json({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    mappings,
  })
}
