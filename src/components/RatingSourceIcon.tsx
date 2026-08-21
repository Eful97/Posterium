import {
  Star, Globe, BarChart2, Flame, Clapperboard, Eye, Target, Users,
  Tv, Zap, Video, PenTool, Award, Bookmark, Sparkles, Heart
} from "lucide-react"

export function RatingSourceIcon({ id, className = "w-3 h-3" }: { id: string; className?: string }) {
  switch (id) {
    case "imdb":
      return <Star className={`${className} text-amber-400`} />
    case "tmdb":
      return <Globe className={`${className} text-sky-400`} />
    case "mdblist":
      return <BarChart2 className={`${className} text-blue-400`} />
    case "tomatoes":
      return <Flame className={`${className} text-rose-500`} />
    case "popcorntime":
      return <Clapperboard className={`${className} text-amber-500`} />
    case "letterboxd":
      return <Eye className={`${className} text-emerald-400`} />
    case "metacritic":
      return <Target className={`${className} text-yellow-400`} />
    case "metacriticuser":
      return <Users className={`${className} text-cyan-400`} />
    case "trakt":
      return <Tv className={`${className} text-red-500`} />
    case "simkl":
      return <Zap className={`${className} text-indigo-400`} />
    case "filmweb":
      return <Video className={`${className} text-amber-300`} />
    case "filmwebcritics":
      return <PenTool className={`${className} text-purple-400`} />
    case "rogerebert":
      return <Award className={`${className} text-amber-400`} />
    case "mal":
      return <Bookmark className={`${className} text-blue-500`} />
    case "anilist":
      return <Sparkles className={`${className} text-sky-300`} />
    case "kitsu":
      return <Heart className={`${className} text-orange-400`} />
    default:
      return <Star className={className} />
  }
}
