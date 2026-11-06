export interface Card {
  id: string;
  front: string;
  back: string;
  note?: string;
}

export interface LessonImage {
  src: string;
  alt: string;
  /** Shown under the image — corrections / fan-study disclosure */
  caption?: string;
}

export interface Lesson {
  id: string;
  title: string;
  body: string;
  cardIds: string[];
  image?: LessonImage;
}

export interface Deck {
  id: string;
  title: string;
  emoji: string;
  color: string; // tailwind gradient classes
  blurb: string;
  cards: Card[];
  lessons: Lesson[];
  /** Soft-launch content bank revision for Bomb Pops etc. */
  sourceVersion?: string;
}

const mk = (prefix: string, rows: [string, string, string?][]): Card[] =>
  rows.map(([front, back, note], i) => ({ id: `${prefix}-${i + 1}`, front, back, note }));

const crypto = mk("cr", [
  ["Blockchain", "A shared ledger of transactions grouped into linked blocks", "Each block references the one before it."],
  ["Private key", "The secret that proves you own a wallet — never share it", "Anyone with it controls the funds."],
  ["Public address", "The shareable ID people send funds to", "Safe to post; derived from the public key."],
  ["Seed phrase", "12–24 words that can restore a wallet", "Treat it exactly like a private key."],
  ["Gas fee", "What you pay the network to process a transaction", ""],
  ["Stablecoin", "A token designed to track a stable asset like the US dollar", ""],
  ["Smart contract", "Code on a blockchain that runs automatically when called", ""],
  ["Proof of stake", "Consensus where validators lock tokens to secure the chain", ""],
  ["Proof of work", "Consensus where miners spend computing power to add blocks", ""],
  ["NFT", "A unique token that represents one specific item", "Non-fungible: not interchangeable 1:1."],
  ["DEX", "An exchange run by smart contracts instead of a company", ""],
  ["Rug pull", "When a project's creators drain funds and disappear", "Red flag: anonymous team + locked-in liquidity they control."],
  ["Devnet", "A test network where coins are free and have no value", ""],
  ["Cold wallet", "A wallet whose keys are kept offline", ""],
  ["Market cap", "Token price × circulating supply", ""],
  ["Airdrop", "Free tokens distributed to wallets", "Unknown airdrops can be scams."],
]);

const capitals = mk("wc", [
  ["France", "Paris"], ["Japan", "Tokyo"], ["Brazil", "Brasília"], ["Canada", "Ottawa"],
  ["Australia", "Canberra"], ["Kenya", "Nairobi"], ["Egypt", "Cairo"], ["Germany", "Berlin"],
  ["Argentina", "Buenos Aires"], ["South Korea", "Seoul"], ["Turkey", "Ankara"], ["Mexico", "Mexico City"],
  ["Nigeria", "Abuja"], ["Vietnam", "Hanoi"], ["Peru", "Lima"], ["Norway", "Oslo"],
  ["Thailand", "Bangkok"], ["Portugal", "Lisbon"], ["Morocco", "Rabat"], ["New Zealand", "Wellington"],
]);

const hsk = mk("hsk", [
  ["你好", "nǐ hǎo — hello"], ["谢谢", "xièxie — thank you"], ["我", "wǒ — I, me"],
  ["你", "nǐ — you"], ["是", "shì — to be"], ["不", "bù — not, no"], ["人", "rén — person"],
  ["大", "dà — big"], ["小", "xiǎo — small"], ["水", "shuǐ — water"], ["火", "huǒ — fire"],
  ["山", "shān — mountain"], ["中国", "Zhōngguó — China"], ["朋友", "péngyou — friend"],
  ["学习", "xuéxí — to study"], ["龙", "lóng — dragon"], ["八", "bā — eight"], ["吃", "chī — to eat"],
]);

const pops = mk("pop", [
  // Legacy pop-1..3: general ice-pop context (kept for progress mapping)
  ["Who is credited with inventing the ice pop?", "An 11-year-old boy in 1905", "Frank Epperson; decades before the Bomb Pop brand."],
  ["What froze into the very first ice pop?", "Powdered soda mix and water with a stick in it", ""],
  ["When was the ice pop patented?", "1923", "Nearly two decades after the accidental first pop."],
  // Classic stripes — legacy pop-4..6
  ["Classic red-white-and-blue rocket pop: red layer flavor", "Cherry", "Top stripe on the Original Bomb Pop."],
  ["Classic rocket pop: white layer flavor", "Lime", "Surprise — the white layer is lime, not vanilla or coconut."],
  ["Classic rocket pop: blue layer flavor", "Blue raspberry", "Bottom stripe on the Original Bomb Pop."],
  // Rocket era — rewrite wrong Oklahoma City lore
  ["Why is the Bomb Pop shaped like a rocket?", "1950s Cold War and Space Race culture", "Six fins and a patriotic stack matched the era."],
  ["In which decade did the striped Bomb Pop debut?", "The 1950s", "Commonly dated to 1955."],
  ["When do fans celebrate National Bomb Pop Day?", "The last Thursday of June", "A fan/summer calendar day promoted with the brand."],
  // Science — legacy pop-10..18 kept
  ["How are the three color layers made?", "Each layer is poured and partly frozen in stages", ""],
  ["Why does sugar matter in an ice pop?", "It lowers the freezing point, keeping the pop softer", ""],
  ["Why do fast-frozen pops taste smoother?", "Fast freezing makes smaller ice crystals", ""],
  ["What is 'brain freeze'?", "A quick headache from cold hitting the roof of your mouth", "Pressing your tongue to the roof of your mouth helps."],
  ["Is blue raspberry a real fruit color?", "No — raspberries aren't blue; the color was chosen to stand out", ""],
  ["What is a paleta?", "A Mexican ice pop often made with fresh fruit", ""],
  ["What do people in the UK call an ice pop?", "An ice lolly", ""],
  ["Ice pop vs. ice cream bar: the key difference", "Ice pops are water-based; ice cream bars are dairy-based", ""],
  ["What wood are ice pop sticks usually made from?", "Birch", ""],
  // Brand facts — FIXED birthplace (was wrongly Oklahoma City)
  ["Brand name of the original red-white-and-blue rocket pop", "Bomb Pop", "Educational fan study of a Wells Enterprises brand — not an official brand partner."],
  ["Which city and state gave birth to the Bomb Pop?", "Kansas City, Missouri", "Invented at Merritt Foods (earlier soft-launch draft had the wrong city)."],
  ["Bomb Pop launch year", "1955", "Press and brand histories commonly cite 1955 (often July 30)."],
  ["Why does a pop melt faster in the sun than shade?", "Sunlight adds radiant heat on top of the warm air", ""],
  ["What gives blue raspberry its color?", "Food dye Brilliant Blue FCF (Blue 1)", ""],
  ["Why does salt help freeze homemade pops faster?", "Salt lowers ice's melting point, making an ice bath colder", ""],
  // New verified cards pop-25+
  ["Who co-invented the Bomb Pop?", "D.S. “Doc” Abernethy and James S. Merritt", "Spellings vary slightly in press (Abernethy / Abernathy)."],
  ["Which company first made the Bomb Pop?", "Merritt Foods", "Kansas City manufacturer that later closed in 1991."],
  ["How many fins are on the classic Bomb Pop rocket shape?", "Six", ""],
  ["What three flavors make the Original Bomb Pop stack?", "Cherry, lime, and blue raspberry", "In red, white, and blue order."],
  ["Which company bought Bomb Pop after Merritt Foods closed in 1991?", "Wells Dairy (now Wells Enterprises)", "Scaled distribution nationwide from Le Mars, Iowa."],
  ["Where is Wells Enterprises headquartered?", "Le Mars, Iowa", "Often nicknamed the Ice Cream Capital of the World."],
  ["In what year was Bomb Pop trademarked?", "1971", "Widely cited in brand/press histories."],
  ["In what year was a Bomb Pop production patent secured?", "1975", "Cited in brand/press histories; not a full legal opinion."],
  ["Which group completed buying Wells Enterprises (Bomb Pop’s maker)?", "The Ferrero Group", "Deal announced December 2022; completed January 2023. Wells stayed a standalone business."],
  ["What are Bomb Pop Extremes known for?", "Super-sour flavor variations", ""],
  ["Name branded mashup partners in the Bomb Pop lineup", "Nerds, Crush, and Hawaiian Punch", "Licensed cross-brand flavors sold alongside Original."],
  ["Does an Original Bomb Pop sugar-free option exist?", "Yes — Original Sugar Free is part of the lineup", "Listed among active Bomb Pop varieties."],
]);

const crocs = mk("croc", [
  ["Largest living reptile", "The saltwater crocodile", "Big males can top 6 m (20 ft) and 1,000 kg."],
  ["Crocodile vs. alligator: the snout", "Crocs have a narrow V-shaped snout; alligators a wide U-shape", ""],
  ["Crocodile vs. alligator: the teeth", "A croc's lower teeth show when its mouth is closed", "An alligator's lower teeth hide."],
  ["Bite force champion", "The saltwater crocodile — about 3,700 psi measured", "Strongest bite ever recorded in a living animal."],
  ["Why do crocs open their mouths while basking?", "To cool off — it's called gaping", ""],
  ["What decides a baby croc's sex?", "Nest temperature", "Temperature-dependent sex determination."],
  ["How long have crocodilians been around?", "Over 200 million years — they lived alongside dinosaurs", ""],
  ["'Crocodile tears' — real or myth?", "Real: crocs tear up while eating, but not from sadness", ""],
  ["How long can a croc hold its breath?", "Usually 15–30 minutes, much longer when resting", ""],
  ["What is the 'death roll'?", "Spinning in water to tear off pieces of prey", ""],
  ["Only place both crocs and alligators live together", "South Florida", ""],
  ["Do crocodiles have a stomach stone habit?", "Yes — they swallow stones (gastroliths) to help digest and balance", ""],
  ["What does a mother croc do with hatchlings?", "Carries them gently in her mouth to the water", ""],
  ["How many times can a croc replace each tooth?", "Up to about 50 times", ""],
]);

const news = mk("news", [
  ["What does 'breaking news' mean?", "A major story still developing in real time", "Early details often change — wait for confirmation."],
  ["Primary vs. secondary source", "Primary = firsthand (document, video, witness); secondary = reporting about it", ""],
  ["What is a 'paywall'?", "A barrier that requires a subscription to read an article", ""],
  ["Op-ed vs. news story", "Op-eds are opinion; news stories report facts", ""],
  ["What is 'lateral reading'?", "Checking other sources about a claim before trusting it", "How pro fact-checkers work."],
  ["What does 'embargo' mean in news?", "An agreement not to publish until a set time", ""],
  ["How often are US presidential elections held?", "Every 4 years", ""],
  ["How often are US midterm elections held?", "Every 2 years, halfway through a presidential term", ""],
  ["What is the G7?", "A group of seven major advanced economies that meet yearly", ""],
  ["What is inflation?", "A general rise in prices over time", ""],
  ["What does the Federal Reserve set that moves markets?", "The federal funds interest rate target", ""],
  ["How often are the Summer Olympics held?", "Every 4 years", ""],
  ["What is a 'deepfake'?", "AI-generated media that fakes a real person's face or voice", ""],
  ["Red flag for a fake headline", "No source, all-caps outrage, and no other outlet reporting it", ""],
]);


const music = mk("mu", [
  ["What does OVO stand for?", "October's Very Own", "Drake's Toronto-based label and lifestyle brand."],
  ["Which city is Drake most associated with?", "Toronto", "OVO and the Raptors era cemented the link."],
  ["Cash Money Records was founded in which city?", "New Orleans", "Birdman and Slim founded the label in the 1990s."],
  ["B.G. is best known as a member of which Cash Money group?", "Hot Boys", "With Juvenile, Lil Wayne, and Turk."],
  ["Lil Wayne's longtime label home through the 2000s was", "Cash Money / Young Money", "Young Money is the imprint he launched under Cash Money."],
  ["Taylor Swift's album Folklore was released in which year?", "2020", "A surprise indie-folk pivot during the pandemic."],
  ["Which Taylor Swift album shares its name with a NYC radio station year?", "1989", "Named for her birth year and a pop-city sound."],
  ["Kanye West's Graduation (2007) is known for shifting hip-hop toward", "Arena / stadium pop-rap production", "Less backpack, more big synths and samples."],
  ["What footwear / fashion line is Kanye West famously tied to?", "Yeezy", "Sneakers and apparel collaborations."],
  ["Billie Eilish's debut album title starts with", "When We All Fall Asleep", "Full title: When We All Fall Asleep, Where Do We Go?"],
  ["Who is Billie Eilish's primary producer and brother?", "Finneas", "Finneas O'Connell co-writes and produces much of her catalog."],
  ["Sabrina Carpenter broke into wider pop stardom after starring on which Disney Channel show?", "Girl Meets World", "A later music push led to Short n' Sweet-era hits."],
  ["What kind of company is ASCAP / BMI in the music business?", "Performing rights organizations", "They collect public-performance royalties for songwriters."],
  ["A 'feature' on a track usually means", "A guest artist appears on the song", "Often credited as 'feat.' in the title."],
  ["What is a 'mixtape' in hip-hop culture?", "A freer / promo-style project, often outside a major album cycle", "Historically street-distributed; now often digital."],
  ["What does an 'A&R' person do at a label?", "Find and develop artists and repertoire", "Artists & Repertoire."],
]);

const fashion = mk("fa", [
  ["Chanel No. 5 is famous as", "A landmark 20th-century perfume", "Launched in 1921; abstract floral aldehydic scent."],
  ["What is a 'fragrance note'?", "A scent character that appears as a perfume develops", "Top, heart (middle), and base notes."],
  ["Haute couture traditionally means", "Custom-fitted high fashion made to order", "Strict rules govern who may use the label in France."],
  ["Ready-to-wear (prêt-à-porter) means", "Clothes made in standard sizes for retail", "Opposite of one-off couture."],
  ["Fashion Week seasons are usually", "Spring/Summer and Fall/Winter", "Shown months before clothes hit stores."],
  ["What is a 'capsule collection'?", "A small, tightly themed drop of pieces", "Often collaborative or limited."],
  ["Christian Dior's New Look (1947) emphasized", "A cinched waist and full skirt silhouette", "Post-war luxury volume after wartime rationing."],
  ["What does 'olfactory family' mean in fragrance?", "A grouping by scent type (floral, woody, oriental, fresh…)", "Helps shoppers compare bottles."],
  ["A 'sillage' in perfume talk is", "The trail of scent left behind a wearer", "From the French for wake (as behind a ship)."],
  ["What is fast fashion?", "Quickly produced, trend-chasing, low-cost clothing", "Criticized for waste and labor issues."],
  ["A logo tote or monogram bag is an example of", "Brand signaling / logo-driven accessories", "Visibility is part of the product."],
  ["What is a 'lookbook'?", "A visual catalog of an outfit lineup for a collection", "Used by buyers, press, and fans."],
  ["Streetwear culture often blends", "Sportswear, skate, hip-hop, and limited drops", "Hype releases and collaborations are common."],
  ["What is 'sustainable fashion' aiming to reduce?", "Waste, overproduction, and harmful materials / labor practices", "Includes repair, resale, and better fibers."],
]);

const movies = mk("mv", [
  ["What does the Academy Award (Oscar) recognize?", "Excellence in cinematic arts as voted by the Academy", "Categories cover acting, directing, crafts, and more."],
  ["A film's 'box office' usually means", "Ticket sales revenue", "Domestic vs. worldwide totals are often reported separately."],
  ["Who directed Jurassic Park (1993)?", "Steven Spielberg", "Adapted from Michael Crichton's novel."],
  ["What is a 'auteur' director?", "A filmmaker with a strong personal stylistic signature", "Common lens in film criticism."],
  ["The Golden Age of Hollywood roughly refers to", "Studio-system decades ~1920s–1960s", "Contract stars and vertically integrated studios."],
  ["What is CGI?", "Computer-generated imagery", "Digital visual effects in live-action and animation."],
  ["A 'rotten' vs 'fresh' score on Rotten Tomatoes aggregates", "Critics' review scores into a percentage", "Audience scores are tracked separately."],
  ["What is a film's 'runtime'?", "How long the movie lasts from start to end credits", "Often listed in minutes."],
  ["The Cannes Film Festival is held in which country?", "France", "On the Côte d'Azur."],
  ["What does 'indie film' usually mean?", "A film produced outside the major studio system", "Budgets and distribution can still vary widely."],
  ["A 'sequel' is", "A follow-up story set after an earlier film", "Prequels happen before; spin-offs focus on side characters."],
  ["What is the MPAA / MPA rating system for?", "Age-guidance labels for theatrical films in the US", "G, PG, PG-13, R, NC-17."],
  ["Who composed many iconic John Williams film scores?", "John Williams", "Star Wars, Indiana Jones, Jurassic Park, and more."],
  ["What is a 'cold open'?", "A scene before the title sequence", "Common in TV; also used in some films."],
  ["Black Panther (2018) was notable at the Oscars for", "Breaking barriers as a major Marvel Best Picture nominee era hit", "Also won awards for score, production design, costume."],
]);

const sports = mk("sp", [
  ["In sports betting slang, a 'prop' (proposition) bet is", "A wager on a specific event inside a game, not just the winner", "Examples: points, yards, or first scorer — here we quiz the concept only."],
  ["What does 'over/under' usually refer to?", "A predicted total (points, runs, goals) that can finish over or under a line", "The line is set by oddsmakers; we teach the idea, not wagering."],
  ["A 'spread' in matchup terms is", "A point handicap meant to level two uneven teams", "Favorite 'gives' points; underdog 'gets' them."],
  ["March Madness is the nickname for", "The NCAA men's (and women's) basketball tournament", "Single-elimination bracket drama."],
  ["Super Bowl is the championship of which league?", "The NFL", "American football's season finale."],
  ["What is a 'triple-double' in basketball?", "Double digits in three statistical categories in one game", "Usually points, rebounds, assists."],
  ["FIFA World Cup is held how often?", "Every 4 years", "National teams compete for the title."],
  ["What does ERA measure in baseball?", "Earned run average — earned runs allowed per 9 innings", "Lower is better for pitchers."],
  ["A 'bye week' means", "A scheduled week off with no game", "Common in NFL seasons."],
  ["What is home-field advantage?", "The statistical edge teams often get playing in their own venue", "Crowd, travel, and familiarity matter."],
  ["Olympic Games (Summer) occur every", "4 years", "Winter Games are also on a 4-year cycle, offset by 2 years."],
  ["In tennis, a 'Grand Slam' tournament refers to", "One of the four majors (AO, French, Wimbledon, US Open)", "Winning all four in a year is a Calendar Slam."],
  ["What is a 'power ranking'?", "An opinionated ordering of teams by current strength", "Not the same as official standings."],
  ["A 'lock' in casual prediction talk means", "A pick someone feels is very likely", "Still not a guarantee — upsets happen."],
  ["What does 'ATS' stand for in sports-line culture?", "Against the spread", "How a team performs relative to the handicap."],
  ["Salary-cap leagues limit", "How much teams can spend on player salaries", "Designed to keep competition more balanced."],
]);


const lessonsFrom = (cards: Card[], titles: string[], bodies: string[], sizes?: number[]): Lesson[] => {
  const per = Math.ceil(cards.length / titles.length);
  let start = 0;
  return titles.map((title, i) => {
    const n = sizes?.[i] ?? per;
    const ids = cards.slice(start, i === titles.length - 1 ? cards.length : start + n).map((c) => c.id);
    start += n;
    return { id: `l${i + 1}`, title, body: bodies[i], cardIds: ids };
  });
};

export const DECKS: Deck[] = [
  {
    id: "bomb-pops",
    title: "Bomb Pops 101",
    emoji: "🚀",
    color: "from-red-500 via-slate-100 to-blue-500",
    blurb: "Fan educational study of the rocket pop: Kansas City origins, classic stripes, Wells & Ferrero, plus frozen-treat science. Not an official Bomb Pop / Wells / Ferrero partner.",
    sourceVersion: "bomb-pops-v0.02-csv-2026-11-05",
    cards: pops,
    lessons: [
      {
        id: "l1",
        title: "Birth of the Bomb Pop",
        body: "Kansas City, 1955: Merritt Foods, Doc Abernethy & James Merritt, and a six-fin rocket built for a Cold War / Space Race summer.",
        cardIds: ["pop-19", "pop-20", "pop-21", "pop-25", "pop-26", "pop-27", "pop-7", "pop-8"],
      },
      {
        id: "l2",
        title: "Stripes & flavors",
        body: "Cherry, lime, blue raspberry in red-white-blue — the Original stack and how layered pops are poured.",
        cardIds: ["pop-4", "pop-5", "pop-6", "pop-28", "pop-10", "pop-14"],
      },
      {
        id: "l3",
        title: "Trademark, rescue & ownership",
        body: "1971 trademark, 1975 production patent, 1991 Wells rescue in Le Mars, then Ferrero’s completed Wells acquisition — Wells stays standalone.",
        cardIds: ["pop-29", "pop-30", "pop-31", "pop-32", "pop-33", "pop-9"],
      },
      {
        id: "l4",
        title: "Lineup, summer day & frozen science",
        body: "Extremes, mashups, sugar-free Original, National Bomb Pop Day, plus ice-pop science and cousins around the world.",
        cardIds: ["pop-34", "pop-35", "pop-36", "pop-1", "pop-2", "pop-3", "pop-11", "pop-12", "pop-13", "pop-15", "pop-16", "pop-17", "pop-18", "pop-22", "pop-23", "pop-24"],
      },
    ],
  },
  {
    id: "crocodiles",
    title: "Crocodiles & Killer Reptiles",
    emoji: "🐊",
    color: "from-emerald-500 via-lime-400 to-teal-600",
    blurb: "Death rolls, record bites and dinosaur-era survivors — the wildest reptiles on Earth.",
    cards: crocs,
    lessons: lessonsFrom(
      crocs,
      ["Croc or gator?", "Built to hunt", "Ancient survivors"],
      [
        "Snouts, teeth and where to tell them apart.",
        "Bite force, the death roll and breath-holding.",
        "200 million years, tooth replacement and devoted mothers.",
      ],
    ),
  },
  {
    id: "news-iq",
    title: "News IQ: Current Events",
    emoji: "📰",
    color: "from-blue-600 via-slate-200 to-red-500",
    blurb: "How the news works, the calendar behind the headlines, and spotting fakes fast.",
    cards: news,
    lessons: lessonsFrom(
      news,
      ["Reading the news", "The headline calendar", "Spot the fake"],
      [
        "Breaking news, sources, op-eds and embargoes.",
        "Elections, the Fed, the G7 and the Olympics.",
        "Deepfakes, lateral reading and red-flag headlines.",
      ],
      [6, 6, 2],
    ),
  },
  {
    id: "crypto-basics",
    title: "Crypto Basics",
    emoji: "🪙",
    color: "from-amber-400 via-orange-500 to-rose-500",
    blurb: "Wallets, keys, chains and the red flags every player should know.",
    cards: crypto,
    lessons: lessonsFrom(
      crypto,
      ["Keys & wallets", "How chains agree", "Markets & red flags"],
      [
        "Your keys are your wallet. Learn what is safe to share and what never is.",
        "Blockchains stay honest through consensus. Compare proof of work and proof of stake.",
        "Tokens, exchanges and the classic warning signs of a scam.",
      ],
    ),
  },
  {
    id: "world-capitals",
    title: "World Capitals",
    emoji: "🌍",
    color: "from-sky-400 via-cyan-500 to-emerald-500",
    blurb: "Twenty capitals across six continents. Some are trickier than you think.",
    cards: capitals,
    lessons: lessonsFrom(
      capitals,
      ["Warm-up", "Trick questions", "Around the globe", "Final lap"],
      [
        "Start with capitals you probably know already.",
        "Many countries' biggest city is NOT the capital. Watch out.",
        "From Africa to South America.",
        "Lock it in before the exam.",
      ],
    ),
  },
  {
    id: "hsk-basics",
    title: "HSK 1 Basics",
    emoji: "🐉",
    color: "from-rose-500 via-red-500 to-amber-400",
    blurb: "Eighteen starter Chinese characters with pinyin and meaning.",
    cards: hsk,
    lessons: lessonsFrom(
      hsk,
      ["Greetings & people", "Nature words", "Everyday words"],
      [
        "Say hello, thank you, and talk about yourself.",
        "Simple pictographs: water, fire, mountain.",
        "Friends, study, food — and the lucky number eight.",
      ],
    ),
  },

  {
    id: "music-hits",
    title: "Music / Rap Hits",
    emoji: "🎤",
    color: "from-fuchsia-500 via-rose-400 to-amber-300",
    blurb: "Artists, labels, eras and album facts — Taylor, Drake, B.G., Ye, Sabrina, Cash Money, OVO, Billie. No lyrics.",
    cards: music,
    lessons: lessonsFrom(
      music,
      ["Labels & cities", "Pop eras", "Industry basics"],
      [
        "Cash Money, OVO, Hot Boys and where the scenes grew.",
        "Swift eras, Billie & Finneas, Sabrina, Ye's stadium turn.",
        "A&R, features, mixtapes and performing rights.",
      ],
    ),
  },
  {
    id: "fashion-fragrance",
    title: "Fashion & Fragrance",
    emoji: "👗",
    color: "from-pink-400 via-violet-400 to-sky-400",
    blurb: "Houses, runway seasons, logo culture and how perfume notes work.",
    cards: fashion,
    lessons: lessonsFrom(
      fashion,
      ["Fragrance 101", "Runway & houses", "Street & sustainability"],
      [
        "Notes, sillage, olfactory families and Chanel No. 5.",
        "Couture vs ready-to-wear, New Look, Fashion Week.",
        "Streetwear drops, lookbooks and sustainable fashion.",
      ],
    ),
  },
  {
    id: "movies-101",
    title: "Movies 101",
    emoji: "🎬",
    color: "from-indigo-500 via-slate-300 to-rose-500",
    blurb: "Oscars, directors, box office, festivals and film-nerd vocabulary.",
    cards: movies,
    lessons: lessonsFrom(
      movies,
      ["How Hollywood scores", "Craft & critics", "Festivals & hits"],
      [
        "Oscars, box office, ratings and runtimes.",
        "Auteurs, CGI, cold opens and composer legends.",
        "Cannes, indies, sequels and modern blockbusters.",
      ],
    ),
  },
  {
    id: "sports-props",
    title: "Sports Props IQ",
    emoji: "🏟️",
    color: "from-emerald-500 via-lime-300 to-cyan-500",
    blurb: "Matchups, records and props-style concepts — prediction-market energy without real gambling rails.",
    cards: sports,
    lessons: lessonsFrom(
      sports,
      ["Lines & lingo", "Big events", "Stats that matter"],
      [
        "Props, spreads, over/unders and ATS — concepts only.",
        "Super Bowl, March Madness, World Cup, Olympics.",
        "Triple-doubles, ERA, power rankings and salary caps.",
      ],
    ),
  },

];

export const getDeck = (id: string, extra: Deck[] = []): Deck | undefined =>
  [...DECKS, ...extra].find((d) => d.id === id);

/** Validate and normalize an imported deck JSON. Throws on invalid input. */
export function parseDeck(raw: unknown): Deck {
  if (!raw || typeof raw !== "object") throw new Error("Deck must be an object");
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" && o.title.trim() ? o.title.trim().slice(0, 60) : "";
  if (!title) throw new Error("Deck needs a title");
  if (!Array.isArray(o.cards) || o.cards.length < 4) throw new Error("Deck needs at least 4 cards");
  if (o.cards.length > 500) throw new Error("Deck is limited to 500 cards");
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "deck";
  const id = typeof o.id === "string" && /^[a-z0-9-]{1,40}$/.test(o.id) ? o.id : `custom-${slug}`;
  const cards: Card[] = o.cards.map((c, i) => {
    const r = (c ?? {}) as Record<string, unknown>;
    const front = String(r.front ?? "").trim().slice(0, 200);
    const back = String(r.back ?? "").trim().slice(0, 300);
    if (!front || !back) throw new Error(`Card ${i + 1} needs a front and a back`);
    return { id: `${id}-${i + 1}`, front, back, note: r.note ? String(r.note).slice(0, 300) : undefined };
  });
  return {
    id,
    title,
    emoji: typeof o.emoji === "string" ? o.emoji.slice(0, 4) : "🃏",
    color: "from-fuchsia-500 via-purple-500 to-indigo-500",
    blurb: typeof o.blurb === "string" ? o.blurb.slice(0, 140) : "Custom deck",
    cards,
    lessons: lessonsFrom(cards, ["All cards"], ["Your imported deck."]),
  };
}

export function exportDeck(deck: Deck) {
  return {
    id: deck.id,
    title: deck.title,
    emoji: deck.emoji,
    blurb: deck.blurb,
    cards: deck.cards.map(({ front, back, note }) => ({ front, back, ...(note ? { note } : {}) })),
  };
}
