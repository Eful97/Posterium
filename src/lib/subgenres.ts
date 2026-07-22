/**
 * Sub-genre badge detection from TMDB keywords and tags.
 */

export interface SubGenreRule {
  key: string
  keywords: string[]
  labels: Record<string, string>
}

const SUB_GENRES: SubGenreRule[] = [
  {
    key: "cyberpunk",
    keywords: ["cyberpunk", "android", "cybernetics", "dystopia", "dystopian", "virtual reality", "ai", "artificial intelligence"],
    labels: { it: "🚀 Cyberpunk", en: "🚀 Cyberpunk", fr: "🚀 Cyberpunk", de: "🚀 Cyberpunk", es: "🚀 Cyberpunk" },
  },
  {
    key: "slasher",
    keywords: ["slasher", "serial killer", "masked killer", "teen horror"],
    labels: { it: "🔪 Slasher", en: "🔪 Slasher", fr: "🔪 Slasher", de: "🔪 Slasher", es: "🔪 Slasher" },
  },
  {
    key: "timetravel",
    keywords: ["time travel", "time loop", "timeline", "time machine", "wormhole", "time manipulation"],
    labels: { it: "⏳ Viaggi nel Tempo", en: "⏳ Time Travel", fr: "⏳ Voyage temporel", de: "⏳ Zeitreise", es: "⏳ Viajes en el tiempo" },
  },
  {
    key: "whodunit",
    keywords: ["whodunit", "murder mystery", "detective", "investigation", "private investigator", "sleuth"],
    labels: { it: "🕵️ Whodunit", en: "🕵️ Whodunit", fr: "🕵️ Whodunit", de: "🕵️ Whodunit", es: "🕵️ Whodunit" },
  },
  {
    key: "heist",
    keywords: ["heist", "bank robbery", "caper", "robbery", "thief", "master thief"],
    labels: { it: "💰 Heist", en: "💰 Heist", fr: "💰 Heist", de: "💰 Heist", es: "💰 Heist" },
  },
  {
    key: "zombie",
    keywords: ["zombie", "zombies", "undead", "infected", "apocalypse zombie"],
    labels: { it: "🧟 Zombie", en: "🧟 Zombie", fr: "🧟 Zombie", de: "🧟 Zombie", es: "🧟 Zombi" },
  },
  {
    key: "vampire",
    keywords: ["vampire", "vampires", "dracula", "blood drinker"],
    labels: { it: "🦇 Vampiri", en: "🦇 Vampires", fr: "🦇 Vampires", de: "🦇 Vampire", es: "🦇 Vampiros" },
  },
  {
    key: "paranormal",
    keywords: ["haunted house", "ghost", "demonic possession", "exorcism", "poltergeist", "supernatural horror", "paranormal"],
    labels: { it: "👻 Paranormale", en: "👻 Paranormal", fr: "👻 Paranormal", de: "👻 Paranormal", es: "👻 Paranormal" },
  },
  {
    key: "superhero",
    keywords: ["superhero", "marvel comics", "dc comics", "vigilante", "comic book"],
    labels: { it: "🦸 Supereroi", en: "🦸 Superhero", fr: "🦸 Super-héros", de: "🦸 Superhelden", es: "🦸 Superhéroes" },
  },
  {
    key: "kaiju",
    keywords: ["kaiju", "giant monster", "godzilla", "king kong"],
    labels: { it: "👹 Kaiju", en: "👹 Kaiju", fr: "👹 Kaiju", de: "👹 Kaiju", es: "👹 Kaiju" },
  },
  {
    key: "postapocalyptic",
    keywords: ["post-apocalyptic", "wasteland", "nuclear winter", "survival horror"],
    labels: { it: "☣️ Post-Apocalittico", en: "☣️ Post-Apocalyptic", fr: "☣️ Post-apocalyptique", de: "☣️ Postapokalyptisch", es: "☣️ Postapocalíptico" },
  },
  {
    key: "foundfootage",
    keywords: ["found footage", "mockumentary", "handheld camera"],
    labels: { it: "📹 Found Footage", en: "📹 Found Footage", fr: "📹 Found Footage", de: "📹 Found Footage", es: "📹 Metraje encontrado" },
  },
  {
    key: "noir",
    keywords: ["neo-noir", "film noir", "hardboiled", "femme fatale"],
    labels: { it: "🕵️ Noir", en: "🕵️ Noir", fr: "🕵️ Noir", de: "🕵️ Noir", es: "🕵️ Noir" },
  },
  {
    key: "spaghettiwestern",
    keywords: ["spaghetti western", "bounty hunter", "outlaw", "gunslinger", "wild west"],
    labels: { it: "🤠 Spaghetti Western", en: "🤠 Western", fr: "🤠 Western", de: "🤠 Western", es: "🤠 Western" },
  },
  {
    key: "martialarts",
    keywords: ["martial arts", "kung fu", "karate", "samurai", "ninja"],
    labels: { it: "🥋 Arti Marziali", en: "🥋 Martial Arts", fr: "🥋 Arts martiaux", de: "🥋 Kampfsport", es: "🥋 Artes marciales" },
  },
  {
    key: "spaceopera",
    keywords: ["space opera", "space travel", "intergalactic", "alien invasion", "spacecraft"],
    labels: { it: "🌌 Space Opera", en: "🌌 Space Opera", fr: "🌌 Space Opera", de: "🌌 Space Opera", es: "🌌 Space Opera" },
  },
]

export function getSubGenreLabel(keywords: string[], locale = "it"): string | null {
  if (!keywords || !keywords.length) return null
  const normalized = keywords.map((k) => k.toLowerCase().trim())
  for (const sub of SUB_GENRES) {
    if (sub.keywords.some((kw) => normalized.some((nk) => nk.includes(kw)))) {
      const lang = (locale || "it").slice(0, 2)
      return sub.labels[lang] || sub.labels.it
    }
  }
  return null
}
