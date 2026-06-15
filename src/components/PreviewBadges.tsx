"use client"

export function RankingBadge({ rank = "13", label = "Oggi", topLight }: { rank?: number | string; label?: string; topLight?: boolean }) {
  const bg = topLight ? "bg-black/80 backdrop-blur-sm" : "bg-white/80"
  const text = topLight ? "text-white/80" : "text-black/80"
  return (
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${bg} px-[23px] py-[12px] rounded-b-[16px] shadow-lg shadow-black/30`}>
      <span className={`${text} text-[23px] font-semibold tracking-wide whitespace-nowrap`}>
        #{rank} {label}
      </span>
    </div>
  )
}

export function GenreRatingBadges({ genreName, voteAverage }: { genreName: string; voteAverage: number; containerW?: number; containerH?: number }) {
  return (
    <>
      <div className="absolute bottom-0 left-0 right-0" style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 50%)",
        height: "40%",
        minHeight: "100px",
        pointerEvents: "none",
      }} />
      <div className="absolute bottom-5 w-full flex justify-center items-center gap-2 text-2xl font-bold text-gray-200 drop-shadow-lg whitespace-nowrap z-10" style={{ pointerEvents: "none" }}>
        <span>{genreName}</span>
        <span>&bull;</span>
        <span className="flex items-center gap-1">
          <span>★</span>
          <span>{voteAverage.toFixed(1)}</span>
        </span>
      </div>
    </>
  )
}

export function ExtraBadge({ label, topLight }: { label: string; topLight?: boolean }) {
  const bg = topLight ? "bg-black/80 backdrop-blur-sm" : "bg-white/80"
  const text = topLight ? "text-white/80" : "text-black/80"
  return (
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${bg} px-[23px] py-[12px] rounded-b-[16px] shadow-lg shadow-black/30`}>
      <span className={`${text} text-[23px] font-semibold tracking-wide whitespace-nowrap`}>{label}</span>
    </div>
  )
}
