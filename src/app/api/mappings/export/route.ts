import { getAll } from "@/lib/store";

export async function GET() {
  const mappings = getAll();
  return Response.json({ mappings, exportedAt: new Date().toISOString() });
}
