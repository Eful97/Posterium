"use client"

export function RankingBadge({ rank = "13", label = "Oggi" }: { rank?: number | string; label?: string }) {
  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-neutral-900 px-5 py-1.5 rounded-2xl">
      <span className="text-white text-xl font-bold tracking-tight">
        #{rank} {label}
      </span>
    </div>
  )
}

export function GenreRatingBadges({ genreName, voteAverage }: { genreName: string; voteAverage: number; containerW?: number; containerH?: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10" style={{
      background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)",
      height: "30%",
      minHeight: "80px",
      pointerEvents: "none",
    }}>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-3 text-lg font-medium text-gray-200">
        <span>{genreName}</span>
        <span>&bull;</span>
        <span className="flex items-center gap-1">
          <span>★</span>
          <span>{voteAverage.toFixed(1)}</span>
        </span>
      </div>
    </div>
  )
}

export function ExtraBadge({ label }: { label: string }) {
  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-neutral-900 px-5 py-1.5 rounded-2xl">
      <span className="text-white text-xl font-bold tracking-tight">{label}</span>
    </div>
  )
}
