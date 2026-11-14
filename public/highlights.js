// Guffhead: the highlights (Carl, 14 Nov 2026: "a slow-mo replay of the key moves, like a sports TV show"). Picks the
// moments worth a replay from a finished game's events: the big pick-ups (and whose card caused them), the bonfires,
// the blind flips that went wrong, everyone going out, and the Guffhead. Every line is picked from the event's number,
// so every phone (and anyone the link is shared with) sees the same show. Tongue in cheek, never nasty.
//
//   reel(events, names)  -> [{ kind, e, step, title, line, by? }] in the order they happened

import { steps } from "./replay.js";

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ""));
const NAMES = { 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", T: "10", J: "jack", Q: "queen", K: "king", A: "ace" };
const aCard = (c) => `${c[0] === "A" || c[0] === "8" ? "an" : "a"} ${NAMES[c[0]]}`;
const what = (cards) => (cards.length === 1 ? aCard(cards[0]) : `${["", "", "two", "three", "four"][cards.length] || cards.length} ${NAMES[cards[0][0]]}s`);

export const TITLES = {
  pickup: ["THE BIG PICK-UP", "HANDFUL", "TAKE THE LOT", "SCOOPED"],
  burn: ["BONFIRE NIGHT", "UP IN SMOKE", "THE TORCHING", "FIRE IN THE HOLE"],
  flip: ["BLIND PANIC", "SIGHT UNSEEN", "NOT LIKE THIS"],
  first: ["FIRST ONE HOME"],
  out: ["SAFE", "OUT OF DANGER", "GOT AWAY WITH IT"],
  over: ["THE GUFFHEAD"],
};
const LINES = {
  pickup: [
    "Let's see that again. {by}'s {card} and {name} has nowhere to go. {n} cards. Oof.",
    "Watch {name}'s face here. {n} cards coming their way, courtesy of {by}.",
    "Slow it down. {by} plays {card}, and {name} reaches for the lot. All {n} of them.",
    "{n} cards. {n}! You simply cannot defend like that, {name}.",
    "{name} picks up {n}. The back room goes quiet. Somebody fetch a tray.",
  ],
  pickupSolo: [
    "{name} takes the pile. {n} cards. Brave, or no choice? No choice.",
    "Let's look again. {name} scoops up {n}. That's not a hand, that's a deck.",
  ],
  burn: [
    "Look at this from {name}. {card}, and {n} cards go up in smoke. Pam's reaching for the fire blanket.",
    "Lovely technique. {name} waits, waits, and torches {n} cards. Goes again, looking unbearable.",
    "There it is. {card} from {name}. {n} cards, gone. You don't see that at this level.",
    "Slow motion shows it all: {name} sets fire to {n} cards and doesn't even smile. Cold.",
  ],
  flip: [
    "{name} turns over {card} with the whole table watching. It won't go. Oh dear, oh dear.",
    "Pure guesswork from {name}. {card}. Wrong card, wrong time, and the pile comes back to them.",
    "Watch the hand go out... and it's {card}. Agony for {name}.",
  ],
  first: [
    "First one home: {name}. Barely broke a sweat. Orders a celebratory scampi fries.",
    "{name} is out first, and you have to say, never looked in danger.",
    "And {name} is out! Free to heckle for the rest of the game.",
  ],
  out: [
    "{name} is out! Safe. Smug, but safe.",
    "{name} gets over the line. Not pretty, but they all count.",
    "Out goes {name}, and look at that relief.",
  ],
  comeback: [
    "Remember the {n}-card pick-up? Look at {name} now. Out. Remarkable scenes.",
    "From {n} cards in hand to safety. {name}, take a bow.",
  ],
  over: [
    "And there it is. {name} is the Guffhead. The 💩 is theirs to wear until somebody else loses.",
    "Heartbreak for {name}. Last one holding cards, and the 💩 lands. Wear it with pride.",
    "It had to be someone. Tonight, it's {name}. The Guffhead.",
    "{name} is the Guffhead. They'll want to watch this one back. Actually, they won't.",
  ],
  resigned: ["{name} has left the table, which makes them the Guffhead. Bold strategy."],
};

/** The highlights of a finished game: the best moments, plus everyone going out and the Guffhead. */
export function reel(events, names, max = 5) {
  const nm = (id) => names[id] || id;
  const st = steps(events);
  const stepOf = new Map(st.map((e, i) => [e.seq, i]));
  // the step just before an event (for out and over, which aren't steps themselves)
  const stepAt = (seq) => { let n = -1; for (const e of st) { if (e.seq > seq) break; n = stepOf.get(e.seq); } return n; };
  const cands = [];
  const bigPick = {};
  for (let i = 0; i < st.length; i++) {
    const e = st[i];
    if (e.k === "pickup" && e.n >= 5) {
      bigPick[e.p] = Math.max(bigPick[e.p] || 0, e.n);
      const prev = st[i - 1];
      if (prev && prev.k === "flip" && !prev.ok && prev.p === e.p) {
        cands.push({ kind: "flip", e: prev, then: e, step: i - 1, score: 12 + e.n });
        continue;
      }
      const by = prev && prev.k === "play" && prev.p !== e.p ? prev : null;
      cands.push({ kind: "pickup", e, by, step: by ? i - 1 : i, score: 10 + e.n });
    } else if (e.k === "play" && e.burn && e.pile >= 5) {
      cands.push({ kind: "burn", e, step: i, score: 8 + e.pile });
    }
  }
  const best = cands.sort((a, b) => b.score - a.score).slice(0, max);
  const must = events.filter((e) => e.k === "out" || e.k === "over").map((e) => ({ kind: e.k === "over" ? "over" : e.place === 1 ? "first" : "out", e, step: stepAt(e.seq) }));
  const all = [...best, ...must].sort((a, b) => (a.e.seq - b.e.seq));
  return all.map((m) => {
    const e = m.e;
    const seed = e.seq * 7919;
    const who = m.kind === "over" ? e.loser : e.p;
    const o = { name: nm(who) };
    let line;
    if (m.kind === "pickup") line = fill(pick(m.by ? LINES.pickup : LINES.pickupSolo, seed), { ...o, n: e.n, by: m.by ? nm(m.by.p) : "", card: m.by ? what(m.by.cards) : "" });
    else if (m.kind === "burn") line = fill(pick(LINES.burn, seed), { ...o, n: e.pile, card: e.burn === "ten" ? "A 10" : "Four of a kind" });
    else if (m.kind === "flip") line = fill(pick(LINES.flip, seed), { ...o, card: aCard(e.card) });
    else if (m.kind === "over") line = fill(pick(e.resigned ? LINES.resigned : LINES.over, seed), o);
    else if (bigPick[e.p] >= 6) line = fill(pick(LINES.comeback, seed), { ...o, n: bigPick[e.p] });
    else line = fill(pick(m.kind === "first" ? LINES.first : LINES.out, seed), o);
    return { ...m, who, title: pick(TITLES[m.kind], seed >> 3), line };
  });
}
