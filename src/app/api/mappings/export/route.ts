import { getAll } from "@/lib/store"
import fs from "node:fs"
import path from "node:path"

function getAppVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"))
    return pkg.version || "0.0.0"
  } catch {
    return "0.0.0"
  }
}

export async function GET() {
  const mappings = await getAll()
  return Response.json({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    mappings,
  })
}
