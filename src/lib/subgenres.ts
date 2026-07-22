/**
 * Sub-genre badge detection from TMDB keywords and tags.
 * Labels use clean typography (no emoji glyphs) to ensure 100% vector-crisp Resvg rendering.
 */

export interface SubGenreRule {
  key: string
  keywords: string[]
  labels: Record<string, string>
}

const SUB_GENRES: SubGenreRule[] = [
  {
    key: "timetravel",
    keywords: ["time travel", "time loop", "timeline", "time machine", "wormhole", "time manipulation"],
    labels: { it: "Viaggi nel Tempo", en: "Time Travel", fr: "Voyage temporel", de: "Zeitreise", es: "Viajes en el tiempo" },
  },
  {
    key: "cyberpunk",
    keywords: ["cyberpunk", "android", "cybernetics", "dystopia", "dystopian", "virtual reality", "artificial intelligence"],
    labels: { it: "Cyberpunk", en: "Cyberpunk", fr: "Cyberpunk", de: "Cyberpunk", es: "Cyberpunk" },
  },
  {
    key: "slasher",
    keywords: ["slasher", "serial killer", "masked killer", "teen horror"],
    labels: { it: "Horror Slasher", en: "Slasher", fr: "Slasher", de: "Slasher", es: "Slasher" },
  },
  {
    key: "whodunit",
    keywords: ["whodunit", "murder mystery", "detective", "investigation", "private investigator", "sleuth"],
    labels: { it: "Giallo col Delitto", en: "Whodunit", fr: "Whodunit", de: "Whodunit", es: "Whodunit" },
  },
  {
    key: "heist",
    keywords: ["heist", "bank robbery", "caper", "robbery", "master thief"],
    labels: { it: "Film di Rapina", en: "Heist", fr: "Film de braquage", de: "Heist", es: "Robos" },
  },
  {
    key: "zombie",
    keywords: ["zombie", "zombies", "undead", "infected", "apocalypse zombie"],
    labels: { it: "Film di Zombie", en: "Zombie", fr: "Film de zombies", de: "Zombie", es: "Zombis" },
  },
  {
    key: "vampire",
    keywords: ["vampire", "vampires", "dracula", "blood drinker"],
    labels: { it: "Vampiri", en: "Vampires", fr: "Vampires", de: "Vampire", es: "Vampiros" },
  },
  {
    key: "paranormal",
    keywords: ["haunted house", "ghost", "demonic possession", "exorcism", "poltergeist", "supernatural horror", "paranormal"],
    labels: { it: "Paranormale", en: "Paranormal", fr: "Paranormal", de: "Paranormal", es: "Paranormal" },
  },
  {
    key: "superhero",
    keywords: ["superhero", "marvel comics", "dc comics", "vigilante", "comic book"],
    labels: { it: "Supereroi", en: "Superhero", fr: "Super-héros", de: "Superhelden", es: "Superhéroes" },
  },
  {
    key: "kaiju",
    keywords: ["kaiju", "giant monster", "godzilla", "king kong"],
    labels: { it: "Kaiju & Mostri", en: "Kaiju & Monsters", fr: "Kaiju", de: "Kaiju", es: "Kaiju" },
  },
  {
    key: "postapocalyptic",
    keywords: ["post-apocalyptic", "wasteland", "nuclear winter", "survival horror"],
    labels: { it: "Post-Apocalittico", en: "Post-Apocalyptic", fr: "Post-apocalyptique", de: "Postapokalyptisch", es: "Postapocalíptico" },
  },
  {
    key: "foundfootage",
    keywords: ["found footage", "mockumentary", "handheld camera"],
    labels: { it: "Found Footage", en: "Found Footage", fr: "Found Footage", de: "Found Footage", es: "Metraje encontrado" },
  },
  {
    key: "noir",
    keywords: ["neo-noir", "film noir", "hardboiled", "femme fatale"],
    labels: { it: "Film Noir", en: "Film Noir", fr: "Film Noir", de: "Film Noir", es: "Cine Negro" },
  },
  {
    key: "spaghettiwestern",
    keywords: ["spaghetti western", "bounty hunter", "gunslinger", "wild west"],
    labels: { it: "Spaghetti Western", en: "Western", fr: "Western", de: "Western", es: "Western" },
  },
  {
    key: "martialarts",
    keywords: ["martial arts", "kung fu", "karate", "samurai", "ninja"],
    labels: { it: "Arti Marziali", en: "Martial Arts", fr: "Arts martiaux", de: "Kampfsport", es: "Artes marciales" },
  },
  {
    key: "spaceopera",
    keywords: ["space opera", "space travel", "intergalactic", "alien invasion", "spacecraft"],
    labels: { it: "Space Opera", en: "Space Opera", fr: "Space Opera", de: "Space Opera", es: "Space Opera" },
  },
]

function matchKeywordPattern(keyword: string, kwPattern: string): boolean {
  if (kwPattern.length <= 3) {
    const regex = new RegExp(`\\b${kwPattern}\\b`, "i")
    return regex.test(keyword)
  }
  return keyword.includes(kwPattern)
}

export function getSubGenreLabel(keywords: string[], locale = "it"): string | null {
  if (!keywords || !keywords.length) return null
  const normalized = keywords.map((k) => k.toLowerCase().trim())
  for (const sub of SUB_GENRES) {
    if (sub.keywords.some((kwPattern) => normalized.some((nk) => matchKeywordPattern(nk, kwPattern)))) {
      const lang = (locale || "it").slice(0, 2)
      return sub.labels[lang] || sub.labels.it
    }
  }
  return null
}
