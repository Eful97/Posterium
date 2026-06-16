"use client"

export function RankingBadge({ rank = "13", label = "Oggi", topLight, containerW = 380 }: { rank?: number | string; label?: string; topLight?: boolean; containerW?: number }) {
  const fs = 23 * containerW / 380
  const px = Math.round(fs)
  const py = Math.round(fs * 12 / 23)
  const r = Math.round(fs * 16 / 23)
  const bg = topLight ? "bg-black/80" : "bg-white/80"
  const text = topLight ? "text-white/80" : "text-black/80"
  return (
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${bg} font-semibold tracking-wide whitespace-nowrap`} style={{
      padding: `${py}px ${px}px`,
      borderBottomLeftRadius: `${r}px`,
      borderBottomRightRadius: `${r}px`,
      boxShadow: "0 5px 14px rgba(0,0,0,0.3)",
      fontSize: `${fs}px`,
    }}>
      <span className={text}>#{rank} {label}</span>
    </div>
  )
}

export function GenreRatingBadges({ genreName, voteAverage, containerW = 380, containerH = 570, bottomOffset = 0 }: { genreName: string; voteAverage: number; containerW?: number; containerH?: number; bottomOffset?: number }) {
  const fs = 24 * containerW / 380
  const gap = Math.round(fs / 3)
  const gap2 = Math.round(fs / 6)
  const bottom = 20 * containerH / 570 + bottomOffset
  const minH = 100 * containerH / 570
  return (
    <>
      <div className="absolute bottom-0 left-0 right-0" style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 50%)",
        height: "40%",
        minHeight: `${minH}px`,
        pointerEvents: "none",
      }} />
      <div className="absolute w-full flex justify-center items-center text-gray-200 drop-shadow-lg whitespace-nowrap z-10 font-bold" style={{
        bottom: `${bottom}px`,
        gap: `${gap}px`,
        fontSize: `${fs}px`,
        lineHeight: 1,
        pointerEvents: "none",
      }}>
        <span>{genreName}</span>
        <span style={{ opacity: 0.6 }}>&bull;</span>
        <span style={{ display: "flex", alignItems: "center", gap: `${gap2}px` }}>
          <span>★</span>
          <span>{voteAverage.toFixed(1)}</span>
        </span>
      </div>
    </>
  )
}

export function ExtraBadge({ label, topLight, containerW = 380 }: { label: string; topLight?: boolean; containerW?: number }) {
  const fs = 23 * containerW / 380
  const px = Math.round(fs)
  const py = Math.round(fs * 12 / 23)
  const r = Math.round(fs * 16 / 23)
  const bg = topLight ? "bg-black/80" : "bg-white/80"
  const text = topLight ? "text-white/80" : "text-black/80"
  return (
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${bg} font-semibold tracking-wide whitespace-nowrap`} style={{
      padding: `${py}px ${px}px`,
      borderBottomLeftRadius: `${r}px`,
      borderBottomRightRadius: `${r}px`,
      boxShadow: "0 5px 14px rgba(0,0,0,0.3)",
      fontSize: `${fs}px`,
    }}>
      <span className={text}>{label}</span>
    </div>
  )
}
