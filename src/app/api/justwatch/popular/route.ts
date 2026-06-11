import { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return Response.json({ titles: [] });
}
