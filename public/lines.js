// Guffhead: the talk at The Guff's Head. GuffBot's commentary on the moments that matter (burns, big pick-ups,
// someone going out, the Guffhead), switchable off; and the back room's goings-on now and then. Every line is
// picked from the event's number, so every phone shows the same words. Story only: none of it touches the game.

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ""));

export const LINES = {
  hello: [
    "Evening, {name}. Back room's free. Mind the carpet, it bites.",
    "{name}! Pull up a stool. The cards are only slightly sticky.",
    "Ah, {name}. Pam's put the good beer mats out for you.",
    "Evening, {name}. Someone's going home as the Guffhead tonight. Let's hope it's not you.",
    "{name}, welcome back. The dartboard's been moved, after last time.",
  ],
  yourGo: [
    "Your go, {name}.", "Over to you, {name}.", "You're up, {name}. No pressure. Some pressure.",
    "Your go. The whole back room is watching. Well, Biscuit is.", "Your turn, {name}. Pam's gone quiet.",
  ],
  waiting: [
    "Waiting for {name}.", "{name} is thinking. Or at the bar.", "Over to {name}. Get a round in while you wait.",
    "{name}'s go. The fruit machine fills the silence.", "Waiting on {name}. Biscuit has fallen asleep.",
  ],
  swap: [
    "Sort your cards: pick the three you want face up. Strong ones, ideally.",
    "Choose your face-up three. They're your safety net when your hand runs out.",
  ],
  burnTen: [
    "WHOOMPH. {name} burns the lot with a 10.", "{name} torches the pile. Pam reaches for the fire blanket.",
    "A 10 from {name}. Up in smoke it goes.", "{name} sets fire to {n} cards. The smoke alarm has seen worse.",
    "Burn! {name} goes again, looking unbearable.",
  ],
  burnFour: [
    "Four of a kind! {name} burns the pile.", "Four the same: {name} sends the pile up in smoke.",
    "{name} completes the set. Four {plural}, one bonfire.",
  ],
  bigPickup: [
    "{name} picks up {n} cards. That's a handful.", "Oof. {name} scoops up {n}. Needs a bigger hand.",
    "{n} cards for {name}. Someone fetch a tray.", "{name} takes the whole pile. All {n} of it. Brave face.",
    "{name} picks up {n}. Pam winces from behind the bar.",
  ],
  flipFail: [
    "{name} flips {acard} and it won't go. Pick it all up.", "Blind luck? Not this time, {name}. {Acard}. The pile's yours.",
    "{name} turns over {acard}. Oh dear.",
  ],
  flipGood: [
    "{name} flips {acard}, sight unseen, and it goes!", "{Acard} from the dark. {name} lives to fight on.",
  ],
  reverse: ["{name} plays a 7: round the other way we go.", "Reverse! {name} sends it back the way it came."],
  skip: ["{name} plays an 8: {skipped} misses a go.", "Skipped! {skipped} sits that one out."],
  out: [
    "{name} is out! Safe.", "{name} goes out and orders a celebratory crisp.", "{name} is out of cards and out of danger.",
    "{name} is safe. Smug, but safe.",
  ],
  outFirst: ["{name} is out first. Untouchable tonight.", "First out: {name}. Takes a bow. Knocks over a pint."],
  guffhead: [
    "{name} is the Guffhead.", "And the Guffhead is... {name}.", "{name} is left holding the cards. Guffhead!",
  ],
  youGuffhead: ["You're the Guffhead. Wear the cone with pride.", "You're the Guffhead. It could happen to anyone. It happened to you."],
  forced: ["(No choice there, so it was played for you.)"],
};

/** GuffBot's line on one event, or null if it isn't worth a word. names: id -> display name ("You" for the viewer). */
export function comment(e, names, viewer) {
  const nm = (id) => names[id] || id;
  const seed = e.seq * 7919;
  const o = { name: nm(e.p) };
  if (e.k === "play" && e.burn === "ten") return fill(pick(LINES.burnTen, seed), { ...o, n: e.pile });
  if (e.k === "play" && e.burn === "four") return fill(pick(LINES.burnFour, seed), { ...o, plural: pluralOf(e.cards[0]) });
  if (e.k === "play" && e.reverse) return fill(pick(LINES.reverse, seed), o);
  if (e.k === "skip") return fill(pick(LINES.skip, seed), { ...o, skipped: e.skipped.map(nm).join(" and ") });
  if (e.k === "pickup" && e.n >= 6) return fill(pick(LINES.bigPickup, seed), { ...o, n: e.n });
  if (e.k === "flip") return fill(pick(e.ok ? LINES.flipGood : LINES.flipFail, seed), { ...o, acard: aCard(e.card), Acard: cap(aCard(e.card)) });
  if (e.k === "out") return fill(pick(e.place === 1 ? LINES.outFirst : LINES.out, seed), o);
  if (e.k === "over" && e.loser) return e.loser === viewer ? pick(LINES.youGuffhead, seed) : fill(pick(LINES.guffhead, seed), { name: nm(e.loser) });
  return null;
}

/** The plain account of an event, for the log and the catch-up replay. */
export function describe(e, names, viewer) {
  const nm = (id) => names[id] || id;
  const you = e.p === viewer;
  const who = nm(e.p);
  const s = (a, b) => (you ? a : b);
  switch (e.k) {
    case "deal": return "Cards dealt.";
    case "ready": return `${who} ${s("are", "is")} ready.`;
    case "start": return e.card ? `${who} ${s("start", "starts")} (lowest card: ${aCard(e.card).replace(/^an? /, "")}).` : `${who} ${s("start", "starts")}.`;
    case "play": {
      const n = e.cards.length;
      const what = n === 1 ? aCard(e.cards[0]) : `${numWord(n)} ${pluralOf(e.cards[0])}`;
      const from = e.from === "up" ? " from face up" : e.from === "down" ? "" : "";
      let t = `${who} ${s("play", "plays")} ${what}${from}.`;
      if (e.burn === "ten") t += " Burned!";
      if (e.burn === "four") t += " Four of a kind: burned!";
      if (e.reverse) t += " Reverse!";
      return t;
    }
    case "pickup": return `${who} ${s("pick", "picks")} up ${e.n === 1 ? "the one card" : `${e.n} cards`}.`;
    case "flip": return `${who} ${s("flip", "flips")} ${aCard(e.card)}${e.ok ? "" : " and it won't go"}.`;
    case "draw": return null;
    case "skip": return `${e.skipped.map(nm).join(" and ")} ${e.skipped.length > 1 ? "are" : e.skipped[0] === viewer ? "are" : "is"} skipped.`;
    case "out": return `${who} ${s("are", "is")} out${e.place === 1 ? " first" : ""}!`;
    case "over": return e.loser ? `${nm(e.loser)} ${e.loser === viewer ? "are" : "is"} the Guffhead${e.resigned ? " (left the table)" : e.limit ? " (most cards when time was called)" : ""}.` : "Game over.";
    default: return null;
  }
}

/** How a catch-up should feel: 'big' for burns, the Guffhead, big pick-ups; 'mid' for most plays. */
export function weight(e) {
  if ((e.k === "play" && e.burn) || e.k === "over" || e.k === "out" || (e.k === "pickup" && e.n >= 6) || (e.k === "flip")) return "big";
  if (e.k === "play" || e.k === "pickup" || e.k === "skip") return "mid";
  return "small";
}

/* ---------- the back room ---------- */
export const ROOM = [
  "Pam rings the bell for last orders. Nobody moves.",
  "Biscuit the pub dog takes up a position under the table, hoping for crisps.",
  "Someone has won the meat raffle. It's a single pork chop.",
  "The fruit machine plays a jaunty tune to nobody.",
  "Tony at the bar explains the offside rule to a man who didn't ask.",
  "The darts team arrives, sees the card game, and backs away.",
  "A pickled egg is ordered. A hush falls.",
  "The jukebox plays Come On Eileen. Again.",
  "Pam wipes the same bit of bar for the ninth time, listening in.",
  "GuffBot orders a pint of mild and a bag of scampi fries. Puts them on Tony's tab.",
  "Ms GuffBot sips her Babycham and says nothing. She's counting.",
  "The quiz machine asks the capital of Peru. Tony says 'Spain'.",
  "A draught from the door. Everyone holds their cards tighter.",
  "Someone's left a beer mat tower on the windowsill. It's magnificent.",
];
/** A back-room line on roughly one event in twenty-five, the same on every phone. */
export function room(e) {
  if (e.k !== "play" && e.k !== "pickup") return null;
  const h = (e.seq * 2654435761) >>> 0;
  if (h % 25 !== 0) return null;
  return ROOM[(h >>> 8) % ROOM.length];
}

export function say(key, seed, o = {}) { return fill(pick(LINES[key], seed), o); }

const NAMES = { 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", T: "10", J: "jack", Q: "queen", K: "king", A: "ace" };
const PLURAL = { 2: "2s", 3: "3s", 4: "4s", 5: "5s", 6: "6s", 7: "7s", 8: "8s", 9: "9s", T: "10s", J: "jacks", Q: "queens", K: "kings", A: "aces" };
export const cardName = (c) => NAMES[c[0]];
export const aCard = (c) => `${c[0] === "A" || c[0] === "8" ? "an" : "a"} ${NAMES[c[0]]}`;
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
export const pluralOf = (c) => PLURAL[c[0]];
const numWord = (n) => ["", "one", "two", "three", "four", "five", "six", "seven", "eight"][n] || String(n);
