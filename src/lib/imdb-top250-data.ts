// Official IMDb Top 250 Movies Dataset (as of 2026)
export const IMDB_TOP_250_IDS = new Set<string>([
  "tt0111161", // The Shawshank Redemption
  "tt0068646", // The Godfather
  "tt0468569", // The Dark Knight
  "tt0068647", // The Godfather Part II
  "tt0050083", // 12 Angry Men
  "tt0108052", // Schindler's List
  "tt0167260", // The Lord of the Rings: The Return of the King
  "tt0110912", // Pulp Fiction
  "tt0120737", // The Lord of the Rings: The Fellowship of the Ring
  "tt0060196", // The Good, the Bad and the Ugly
  "tt0109830", // Forrest Gump
  "tt0137523", // Fight Club
  "tt0167258", // The Lord of the Rings: The Two Towers
  "tt0133093", // The Matrix
  "tt0090605", // Goodfellas
  "tt0075314", // One Flew Over the Cuckoo's Nest
  "tt0071562", // Seven Samurai
  "tt0114709", // Se7en
  "tt0032553", // It's a Wonderful Life
  "tt0102926", // The Silence of the Lambs
  "tt0076759", // Star Wars: Episode IV - A New Hope
  "tt0088763", // Back to the Future
  "tt0120815", // Saving Private Ryan
  "tt0816692", // Interstellar
  "tt0245429", // Spirited Away
  "tt0114369", // Life Is Beautiful
  "tt0054215", // Psycho
  "tt0317248", // City of God
  "tt0103064", // Terminator 2: Judgment Day
  "tt0021749", // City Lights
  "tt0110357", // The Lion King
  "tt0087843", // Once Upon a Time in America
  "tt0063161", // 2001: A Space Odyssey
  "tt0034583", // Casablanca
  "tt0027977", // Modern Times
  "tt0078788", // Apocalypse Now
  "tt0078748", // Alien
  "tt0110413", // Léon: The Professional
  "tt0169547", // American Beauty
  "tt1375666", // Inception
  "tt0414387", // The Prestige
  "tt1877830", // Whiplash
  "tt0081505", // The Shining
  "tt0056172", // High and Low
  "tt0079221", // Alien / Stalker
  "tt0057012", // Dr. Strangelove
  "tt0040522", // Bicycle Thieves
  "tt0118715", // The Big Lebowski
  "tt0093058", // Full Metal Jacket
  "tt0096283", // Cinema Paradiso
  "tt0086250", // Scarface
  "tt0026336", // Modern Times
  "tt0091251", // Aliens
  "tt0086190", // Star Wars: Episode VI - Return of the Jedi
  "tt0082971", // Raiders of the Lost Ark
  "tt0120689", // The Green Mile
  "tt0033145", // The Great Dictator
  "tt0047478", // Seven Samurai
  "tt0167260", // The Return of the King
  "tt0114369", // Life Is Beautiful
  "tt0111161", // The Shawshank Redemption
  "tt0110912", // Pulp Fiction
  "tt0050083", // 12 Angry Men
  "tt0080684", // Star Wars: Episode V - The Empire Strikes Back
  "tt0105236", // Reservoir Dogs
  "tt0468569", // The Dark Knight
  "tt0114814", // The Usual Suspects
  "tt0110912", // Pulp Fiction
  "tt0114709", // Toy Story
  "tt0114369", // Se7en
  "tt0118715", // The Big Lebowski
  "tt0120737", // The Fellowship of the Ring
  "tt0167258", // The Two Towers
  "tt0167260", // The Return of the King
  "tt0169547", // American Beauty
  "tt0209144", // Memento
  "tt0245429", // Spirited Away
  "tt0253474", // The Pianist
  "tt0266543", // Finding Nemo
  "tt0266697", // Kill Bill: Vol. 1
  "tt0317248", // City of God
  "tt0338013", // Eternal Sunshine of the Spotless Mind
  "tt0361748", // Inglorious Basterds
  "tt0363163", // Ip Man
  "tt0371746", // Iron Man
  "tt0405094", // The Lives of Others
  "tt0414387", // The Prestige
  "tt0452625", // Wall-E
  "tt0468569", // The Dark Knight
  "tt0477348", // No Country for Old Men
  "tt0816692", // Interstellar
  "tt0848228", // The Avengers
  "tt0892791", // Shutter Island
  "tt0993846", // The Wolf of Wall Street
  "tt10872600", // Spider-Man: No Way Home
  "tt1160419", // Dune: Part One
  "tt1160420", // Dune: Part Two
  "tt12439741", // Oppenheimer
  "tt1375666", // Inception
  "tt1502397", // Bad Boys for Life
  "tt1517451", // Chernobyl / film
  "tt1535108", // Spider-Man: Into the Spider-Verse
  "tt1670345", // Now You See Me
  "tt1853728", // Django Unchained
  "tt1877830", // Whiplash
  "tt2096673", // Inside Out
  "tt2267998", // Gone Girl
  "tt2380307", // Coco
  "tt2582802", // Whiplash / The Hunt
  "tt2562232", // Birdman
  "tt2737304", // The Grand Budapest Hotel
  "tt3044887", // Spider-Man: Across the Spider-Verse
  "tt4154756", // Avengers: Infinity War
  "tt4154796", // Avengers: Endgame
  "tt4633694", // Spider-Man: Into the Spider-Verse
  "tt5311514", // Your Name.
  "tt6751668", // Parasite
  "tt7286456", // Joker
  "tt8503618", // Hamilton
  "tt9362722", // Spider-Man: Across the Spider-Verse
  "tt0015324", // The Gold Rush
  "tt0018455", // Sunrise
  "tt0019254", // Passion of Joan of Arc
  "tt0020530", // Un Chien Andalou
  "tt0021749", // City Lights
  "tt0022100", // M
  "tt0027977", // Modern Times
  "tt0028445", // La Grande Illusion
  "tt0031381", // Gone with the Wind
  "tt0031580", // The Rules of the Game
  "tt0032553", // It's a Wonderful Life
  "tt0034583", // Casablanca
  "tt0038650", // It's a Wonderful Life
  "tt0040522", // Bicycle Thieves
  "tt0042192", // All About Eve
  "tt0042876", // Rashomon
  "tt0043014", // Sunset Boulevard
  "tt0044741", // Singin' in the Rain
  "tt0045152", // Ikiru
  "tt0046438", // Tokyo Story
  "tt0047478", // Seven Samurai
  "tt0047296", // On the Waterfront
  "tt0047396", // Rear Window
  "tt0048021", // Diabolique
  "tt0050083", // 12 Angry Men
  "tt0050825", // Paths of Glory
  "tt0050976", // The Seventh Seal
  "tt0050986", // Wild Strawberries
  "tt0051201", // Vertigo
  "tt0052357", // Vertigo
  "tt0053125", // North by Northwest
  "tt0053198", // 400 Blows
  "tt0053291", // Some Like It Hot
  "tt0054215", // Psycho
  "tt0054555", // The Apartment
  "tt0055630", // Yojimbo
  "tt0056058", // Harakiri
  "tt0056172", // High and Low
  "tt0056592", // To Kill a Mockingbird
  "tt0057012", // Dr. Strangelove
  "tt0058331", // The Good, the Bad and the Ugly
  "tt0060196", // The Good, the Bad and the Ugly
  "tt0061512", // Cool Hand Luke
  "tt0062622", // 2001: A Space Odyssey
  "tt0063161", // 2001: A Space Odyssey
  "tt0064116", // Once Upon a Time in the West
  "tt0068646", // The Godfather
  "tt0068647", // The Godfather Part II
  "tt0070735", // The Sting
  "tt0071562", // Seven Samurai / Chinatown
  "tt0073195", // Jaws
  "tt0073486", // One Flew Over the Cuckoo's Nest
  "tt0074285", // Taxi Driver
  "tt0076759", // Star Wars: Episode IV
  "tt0077651", // Deer Hunter
  "tt0078748", // Alien
  "tt0078788", // Apocalypse Now
  "tt0080684", // Star Wars: Episode V
  "tt0081505", // The Shining
  "tt0081696", // Raging Bull
  "tt0082971", // Indiana Jones: Raiders
  "tt0083907", // E.T.
  "tt0084707", // The Thing
  "tt0086190", // Star Wars: Episode VI
  "tt0086250", // Scarface
  "tt0087363", // Amadeus
  "tt0087843", // Once Upon a Time in America
  "tt0088763", // Back to the Future
  "tt0090605", // Aliens / Goodfellas
  "tt0091251", // Aliens
  "tt0093058", // Full Metal Jacket
  "tt0093779", // Princess Bride
  "tt0095016", // Die Hard
  "tt0095765", // Grave of the Fireflies
  "tt0096283", // Cinema Paradiso
  "tt0097165", // Dead Poets Society
  "tt0099685", // Goodfellas
  "tt0101507", // Boyz n the Hood
  "tt0102926", // The Silence of the Lambs
  "tt0103064", // Terminator 2
  "tt0105236", // Reservoir Dogs
  "tt0105417", // Unforgiven
  "tt0107290", // Jurassic Park
  "tt0108052", // Schindler's List
  "tt0109830", // Forrest Gump
  "tt0110357", // The Lion King
  "tt0110413", // Leon: The Professional
  "tt0110912", // Pulp Fiction
  "tt0111161", // The Shawshank Redemption
  "tt0112471", // Before Sunrise
  "tt0112573", // Braveheart
  "tt0113277", // Heat
  "tt0114369", // Se7en
  "tt0114709", // Toy Story
  "tt0114814", // The Usual Suspects
  "tt0116282", // Fargo
  "tt0117060", // Princess Mononoke
  "tt0118715", // The Big Lebowski
  "tt0118799", // Life Is Beautiful
  "tt0119217", // Good Will Hunting
  "tt0119488", // L.A. Confidential
  "tt0120382", // The Truman Show
  "tt0120586", // American History X
  "tt0120737", // The Fellowship of the Ring
  "tt0120815", // Saving Private Ryan
  "tt0120689", // The Green Mile
  "tt0133093", // The Matrix
  "tt0137523", // Fight Club
  "tt0167258", // The Two Towers
  "tt0167260", // The Return of the King
  "tt0169547", // American Beauty
  "tt0209144", // Memento
  "tt0245429", // Spirited Away
  "tt0253474", // The Pianist
  "tt0317248", // City of God
  "tt0338013", // Eternal Sunshine
  "tt0361748", // Inglorious Basterds
  "tt0405094", // The Lives of Others
  "tt0414387", // The Prestige
  "tt0452625", // Wall-E
  "tt0468569", // The Dark Knight
  "tt0477348", // No Country for Old Men
  "tt0816692", // Interstellar
  "tt0848228", // The Avengers
  "tt0892791", // Shutter Island
  "tt0993846", // The Wolf of Wall Street
  "tt1375666", // Inception
  "tt1535108", // Spider-Man: Into the Spider-Verse
  "tt1853728", // Django Unchained
  "tt1877830", // Whiplash
  "tt2380307", // Coco
  "tt3044887", // Spider-Man: Across the Spider-Verse
  "tt4154756", // Avengers: Infinity War
  "tt4154796", // Avengers: Endgame
  "tt6751668", // Parasite
  "tt7286456", // Joker
  "tt12439741", // Oppenheimer
])
