import { NextRequest } from "next/server"
import { posteriumCatalog } from "@/lib/catalog-handler"

type RouteParams = { uuid: string; type: string; id: string }

// Profilo via path (query-free, accettato da AIOMetadata):
//   /u/<uuid>/catalog/<type>/<id>.json
// L'import AIOMetadata costruisce gli URL dei cataloghi come
// `${manifestUrl.replace('/manifest.json','')}/catalog/...`: con il profilo nel
// path la base è valida (con ?u= in query l'URL risultava malformato).
export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { uuid, type: mediaType, id: rawId } = await params
  const configParam = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  return posteriumCatalog(req, mediaType, rawId, uuid, configParam)
}
