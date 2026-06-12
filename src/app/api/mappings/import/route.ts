import { NextRequest } from "next/server";
import { importMappings } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!Array.isArray(body.mappings)) {
    return Response.json({ error: "mappings array required" }, { status: 400 });
  }
  await importMappings(body.mappings);
  return Response.json({ ok: true, count: body.mappings.length });
}
