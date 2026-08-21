import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { searchAi } from "@/lib/groq"

describe("Groq AI Search", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it("returns missing_api_key when no POSTERIUM_GROQ_KEY or GROQ_API_KEY is present", async () => {
    delete process.env.POSTERIUM_GROQ_KEY
    delete process.env.GROQ_API_KEY

    const res = await searchAi("film sui viaggi nel tempo")
    expect(res.error).toBe("missing_api_key")
    expect(res.results).toEqual([])
  })

  it("handles empty query gracefully", async () => {
    process.env.POSTERIUM_GROQ_KEY = "gsk_test123"
    const res = await searchAi("   ")
    expect(res.results).toEqual([])
    expect(res.query).toBe("")
  })

  it("calls Groq API and parses recommendations into TMDB search results", async () => {
    process.env.POSTERIUM_GROQ_KEY = "gsk_test123"

    // Mock global fetch for Groq API and TMDB
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = url.toString()

      // Groq endpoint mock
      if (urlStr.includes("api.groq.com")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    thought: "Film di fantascienza acclamati incentrati su buchi neri e relatività.",
                    recommendations: [
                      {
                        title: "Interstellar",
                        year: 2014,
                        type: "movie",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }

      // TMDB search mock
      if (urlStr.includes("/search/movie")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 157336,
                title: "Interstellar",
                release_date: "2014-11-05",
                poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
                vote_average: 8.4,
              },
            ],
            total_results: 1,
            total_pages: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }

      return new Response(JSON.stringify({ results: [] }), { status: 200 })
    })

    const res = await searchAi("film sci-fi buchi neri", "it-IT", "tmdb_mock_key")
    expect(res.error).toBeUndefined()
    expect(res.explanation).toContain("buchi neri")
    expect(res.results.length).toBe(1)
    expect(res.results[0].id).toBe(157336)
    expect(res.results[0].title).toBe("Interstellar")
  })

  it("tolerates a Groq response wrapped in a markdown fenced block", async () => {
    // Alcuni modelli (es. groq/compound) possono ignorare response_format e
    // incapsulare il JSON in ```json ... ```. Il parser tollerante deve estrarlo.
    process.env.POSTERIUM_GROQ_KEY = "gsk_test123"

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = url.toString()
      if (urlStr.includes("api.groq.com")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "```json\n" + JSON.stringify({
                    thought: "Giallo psicologico sui serial killer.",
                    recommendations: [
                      { title: "Se7en", year: 1995, type: "movie" },
                    ],
                  }) + "\n```",
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }
      if (urlStr.includes("/search/movie")) {
        return new Response(
          JSON.stringify({
            results: [
              { id: 807, title: "Se7en", release_date: "1995-09-22", poster_path: "/p.jpg", vote_average: 8.4 },
            ],
            total_results: 1,
            total_pages: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }
      return new Response(JSON.stringify({ results: [] }), { status: 200 })
    })

    const res = await searchAi("thriller serial killer", "it-IT", "tmdb_mock_key")
    expect(res.error).toBeUndefined()
    expect(res.results.length).toBe(1)
    expect(res.results[0].id).toBe(807)
  })
})
