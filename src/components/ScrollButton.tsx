"use client"

export function ScrollButton({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`hidden md:flex absolute z-40 ${direction === "left" ? "-left-2" : "-right-2"} top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center bg-black/70 backdrop-blur-md border border-white/15 rounded-full text-white hover:text-white hover:bg-zinc-800 hover:border-accent/50 active:scale-90 transition-all duration-300 shadow-2xl shadow-black/60`}
    >
      <span className="text-lg drop-shadow-md">{direction === "left" ? "◀" : "▶"}</span>
    </button>
  )
}
