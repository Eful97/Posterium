export function checkAdminToken(request: Request): boolean {
  const token = process.env.ADMIN_TOKEN
  if (!token) return true

  const headers = request.headers
  const bearer = headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const xtoken = headers.get("x-admin-token")
  return bearer === token || xtoken === token
}

export function adminAuthResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized. Set x-admin-token or Authorization: Bearer header." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  })
}
