"use client"

export function PosterSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[120px] md:w-[140px] animate-stagger-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="aspect-[2/3] rounded-xl skeleton-shimmer" />
          <div className="mt-1.5 h-2.5 w-3/4 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}

export function PosterCardSkeleton() {
  return (
    <div className="bg-zinc-800 rounded-xl overflow-hidden border-2 border-transparent">
      <div className="aspect-[2/3] relative overflow-hidden">
        <div className="w-full h-full skeleton-shimmer" />
      </div>
      <div className="px-1 py-1">
        <div className="h-2.5 w-3/4 rounded skeleton-shimmer" />
      </div>
    </div>
  )
}

export function RankRowSkeleton() {
  return (
    <div>
      <div className="h-3 w-24 rounded skeleton-shimmer mb-3" />
      <div className="flex gap-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex-shrink-0 w-[170px] md:w-72 ${i > 0 ? "-ml-8 md:-ml-14" : ""} z-10 animate-stagger-in`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="aspect-[2/3] rounded-lg skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  )
}
