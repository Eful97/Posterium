import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HomeHero } from "@/components/HomeHero"
import { HomeStatusStrip } from "@/components/HomeStatusStrip"
import { renderWithCtx } from "@/__tests__/test-utils"

describe("HomeHero", () => {
  it("renders kicker, split title, subtitle and pills", () => {
    renderWithCtx(<HomeHero />)
    expect(screen.getByText("ui.heroKicker")).toBeInTheDocument()
    const title = screen.getByRole("heading", { level: 1 })
    expect(title.textContent).toContain("ui.heroTitleLead")
    expect(title.textContent).toContain("ui.heroTitleAccent")
    expect(title.textContent).toContain("ui.heroTitleTail")
    expect(screen.getByText("ui.heroSubtitle")).toBeInTheDocument()
    expect(screen.getByText("ui.heroPillLogos")).toBeInTheDocument()
    // "AI best-fit" compare sia nella pill della copia sia nel chip flottante
    expect(screen.getAllByText("ui.heroPillAi").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("ui.heroPillLangs")).toBeInTheDocument()
  })

  it("renders three real rendered podium posters via /api/poster", () => {
    const { container } = renderWithCtx(<HomeHero />, { tmdbKey: "test-key" })
    const posterSrcs = Array.from(container.querySelectorAll(".p-frame img")).map((i) => i.getAttribute("src"))
    expect(posterSrcs.filter((s) => s?.startsWith("/api/poster/"))).toHaveLength(3)
    // La chiave personale va in query per i titoli non mappati
    expect(posterSrcs[0]).toContain("api_key=test-key")
  })

  it("picks 2 random ranked movies + 1 ranked series with their real ranks", () => {
    const trending = [
      { id: 101, media_type: "movie", title: "Movie B", name: "", poster_path: "/b.jpg", release_date: "2020-01-01", rank: 2 },
      { id: 100, media_type: "movie", title: "Movie A", name: "", poster_path: "/a.jpg", release_date: "2020-01-01", rank: 1 },
      { id: 102, media_type: "movie", title: "Movie C", name: "", poster_path: "/c.jpg", release_date: "2020-01-01", rank: 3 },
      { id: 200, media_type: "tv", title: "", name: "Series A", poster_path: "/s.jpg", release_date: "2020-01-01", rank: 1 },
    ] as const
    const { container } = renderWithCtx(<HomeHero />, { tmdbKey: "test-key", trending: [...trending] })
    const posterSrcs = Array.from(container.querySelectorAll(".p-frame img")).map((i) => i.getAttribute("src") || "")
    expect(posterSrcs).toHaveLength(3)
    // 2 film distinti tra quelli in classifica + 1 serie; rank reali in URL
    const movieIds = posterSrcs.map((s) => s.match(/\/movie\/(\d+)\?/)?.[1]).filter(Boolean)
    expect(new Set(movieIds).size).toBe(2)
    expect(movieIds.every((id) => ["100", "101", "102"].includes(id!))).toBe(true)
    const tvSrc = posterSrcs.find((s) => s.includes("/tv/"))
    expect(tvSrc).toContain("/tv/200?")
    expect(tvSrc).toContain("rank=1")
    // Il nastro Netflix identifica la serie giornaliera (e il primo film)
    expect(tvSrc).toContain("rs=netflix")
    posterSrcs.forEach((s) => {
      const id = s.match(/\/(?:movie|tv)\/(\d+)\?/)?.[1]
      const item = [...trending].find((i) => String(i.id) === id)
      expect(s).toContain(`rank=${item!.rank}`)
    })
  })

  it("navigates to catalogs when CTA is clicked", async () => {
    const u = userEvent.setup()
    const push = vi.fn()
    renderWithCtx(<HomeHero />, { router: { push, replace: vi.fn(), back: vi.fn() } })
    await u.click(screen.getByText("ui.heroCatalogsCta"))
    expect(push).toHaveBeenCalledWith("cataloghi")
  })

  it("opens the editor when a podium poster is clicked", async () => {
    const u = userEvent.setup()
    const navigateToPoster = vi.fn()
    const trending = [
      { id: 100, media_type: "movie", title: "Movie A", name: "", poster_path: "/a.jpg", release_date: "2020-01-01", rank: 1 },
      { id: 101, media_type: "movie", title: "Movie B", name: "", poster_path: "/b.jpg", release_date: "2020-01-01", rank: 2 },
      { id: 200, media_type: "tv", title: "", name: "Series A", poster_path: "/s.jpg", release_date: "2020-01-01", rank: 1 },
    ] as const
    renderWithCtx(<HomeHero />, { tmdbKey: "test-key", trending: [...trending], navigateToPoster })
    await u.click(screen.getByRole("button", { name: "Movie A" }))
    expect(navigateToPoster).toHaveBeenCalledWith(expect.objectContaining({ id: 100, media_type: "movie" }))
    // Anche il fallback statico resta cliccabile (nessun trending)
    navigateToPoster.mockClear()
    renderWithCtx(<HomeHero />, { tmdbKey: "test-key", navigateToPoster })
    await u.click(screen.getByRole("button", { name: "Dark" }))
    expect(navigateToPoster).toHaveBeenCalledWith(expect.objectContaining({ id: 44217, media_type: "tv" }))
  })
})

describe("HomeStatusStrip", () => {
  it("renders operational state and service links", () => {
    renderWithCtx(<HomeStatusStrip />)
    expect(screen.getByText("ui.allSystemsOperational")).toBeInTheDocument()
    expect(screen.getByText("ui.statusMeta")).toBeInTheDocument()
    expect(screen.getByText("ui.statusTitle")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "ui.statusTitle" })).toHaveAttribute("href", "/status")
  })
})
