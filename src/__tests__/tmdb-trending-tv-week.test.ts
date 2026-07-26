import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/tmdb/trending/tv/week/route"

describe("GET /api/tmdb/trending/tv/week", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("fetches Japanese TV shows when with_original_language=ja is specified", async () => {
    const mockData = {
      results: [
        {
          id: 37854,
          name: "One Piece",
          original_name: "One Piece",
          poster_path: "/onepiece.jpg",
          first_air_date: "1999-10-20",
          vote_average: 8.7,
        },
      ],
    }

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const req = new NextRequest("http://localhost:3000/api/tmdb/trending/tv/week?api_key=testkey&with_original_language=ja&sort_by=popularity")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toBeDefined()
    expect(json.results.length).toBe(1)
    expect(json.results[0].name).toBe("One Piece")
    expect(json.results[0].media_type).toBe("tv")
  })
})
