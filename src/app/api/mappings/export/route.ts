import { getAll } from "@/lib/store";

const CURRENT_VERSION = "0.5.0"

export async function GET() {
  const mappings = await getAll()
  return Response.json({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: CURRENT_VERSION,
    mappings,
  })
}
