// Guffhead: the house. GuffBot (plays his lowest card, keeps his 10s for a big moment, and fancies himself) and
// Ms GuffBot (counts what's gone, weighs every option, and makes the pile horrible for whoever's next).
// Both use only what a player at the table could know: their own hand, everyone's face-up cards, the pile,
// what's been burned and what each player has been seen picking up. They move the moment it's their go.
//
// Ms GuffBot's brain also plays for anyone who leaves their go too long (the idle timer), so nobody is punished
// for being busy; the replay says "GuffBot played for Nick".

import { rankOf, isMagic, canPlayRank, needOf, options, unseenBy, cardsLeft, zoneOf, sortKey, HAND } from "./rules.js";

export const BOTS = {
  guffbot: { id: "guffbot", name: "GuffBot", blurb: "Plays his lowest card. Saves his 10s for a big moment. Blames the shuffle." },
  msguffbot: { id: "msguffbot", name: "Ms GuffBot", blurb: "Counts every card. Leaves the pile horrible for whoever's next." },
};
export const isBot = (id) => Object.prototype.hasOwnProperty.call(BOTS, id);

/** How much a card is worth keeping, roughly 0 (a low card you want rid of) to 9 (a 10 that burns). */
export function keepValue(r, s) {
  if (r === 10 && s.tenBurn) return 9;
  if (r === 2 && s.twoReset) return 8;
  if (r === 3 && s.three === "invisible") return 6;
  let v = ((r - 2) / 12) * 6;
  if (r === 7 && s.seven === "lower") v += 1.5;
  return v;
}

/** The swap: put the three best of your six face up (they're the cards you'll need when your hand runs out). */
export function chooseUp(six, s) {
  return six.slice().sort((a, b) => keepValue(rankOf(b), s) - keepValue(rankOf(a), s) || sortKey(b, s) - sortKey(a, s)).slice(0, HAND);
}

/** The house's go: an action for rules.perform. brain: 'guffbot' | 'msguffbot'. */
export function choose(st, brain, rnd = Math.random) {
  const o = options(st);
  if (!o) return null;
  if (o.zone === "down") return { act: "flip", index: Math.floor(rnd() * o.flip) };
  if (!o.plays.length) return { act: "pickup" };
  return brain === "msguffbot" ? sharp(st, o, rnd) : simple(st, o, rnd);
}

function simple(st, o, rnd) {
  const s = st.settings;
  const plain = o.plays.filter((p) => !isMagic(p.rank, s));
  // now and then he just plays something (he says it's a bluff)
  if (rnd() < 0.25) { const p = o.plays[Math.floor(rnd() * o.plays.length)]; return { act: "play", cards: p.cards }; }
  // a big pile and a 10 in hand: he can't resist
  const ten = o.plays.find((p) => p.rank === 10 && s.tenBurn);
  if (ten && st.pile.length >= 7) return { act: "play", cards: ten.cards.slice(0, 1) };
  if (plain.length) return { act: "play", cards: plain[0].cards };
  const cheapest = o.plays.slice().sort((a, b) => keepValue(a.rank, s) - keepValue(b.rank, s))[0];
  return { act: "play", cards: cheapest.cards.slice(0, 1) };
}

/**
 * Ms GuffBot: GuffBot's sound habit (get rid of your lowest cards, all of a rank at once, keep the magic) without
 * his lapses, plus the tricks: finish four of a kind for a free burn, burn a big pile when the alternative is
 * spending a high card, and when the next player is close to going out, leave them the pile they're least
 * likely to beat (worked out from the cards she hasn't seen).
 */
export const MS = { burnPile: 14, burnAbove: 11, pressureAt: 3, pressureEdge: 0.15 };   // tuned over thousands of games against GuffBot
function sharp(st, o, rnd) {
  const s = st.settings;
  const me = st.seats[st.turn];
  const plain = o.plays.filter((p) => !isMagic(p.rank, s));
  // four of a kind on the pile, free: take it (you go again)
  if (s.fourBurn) {
    const top = st.pile.length ? rankOf(st.pile[st.pile.length - 1]) : 0;
    let run = 0; for (let i = st.pile.length - 1; i >= 0 && rankOf(st.pile[i]) === top; i--) run++;
    const four = plain.find((p) => p.rank === top && run + p.cards.length >= 4);
    if (four) return { act: "play", cards: four.cards };
  }
  const ten = o.plays.find((p) => p.rank === 10 && s.tenBurn);
  if (ten && st.pile.length >= MS.burnPile && (!plain.length || plain[0].rank >= MS.burnAbove)) return { act: "play", cards: ten.cards.slice(0, 1) };
  // the next player is nearly out: make it hard
  const next = st.seats[nextSeat(st, st.turn)];
  if (plain.length > 1 && cardsLeft(next) <= MS.pressureAt) {
    const unseen = unseenBy(st, me.id);
    const stuck = (p) => stuckChance(st, next, unseen, st.pile.concat(p.cards));
    const base = stuck(plain[0]);
    const tough = plain.map((p) => ({ p, v: stuck(p) })).sort((a, b) => b.v - a.v)[0];
    if (tough.v > base + MS.pressureEdge) return { act: "play", cards: tough.p.cards };
  }
  if (o.pickUp && s.pickUpAnyTime && !plain.length && st.pile.length <= 2 && cardsLeft(me) > 3) return { act: "pickup" };
  if (plain.length) return { act: "play", cards: plain[0].cards };
  const cheapest = o.plays.slice().sort((a, b) => keepValue(a.rank, s) - keepValue(b.rank, s))[0];
  return { act: "play", cards: cheapest.cards.slice(0, 1) };
}

/** The chance the next player can't play on this pile, from what's visible to the player thinking about it. */
export function stuckChance(st, next, unseen, pile) {
  const s = st.settings;
  const unable = unseen.filter((c) => !canPlayRank(rankOf(c), pile, s)).length / Math.max(1, unseen.length);
  const nz = zoneOf(st, next);
  if (nz === "up" && !(Array.isArray(next.hand) ? next.hand.length : next.hand)) return next.up.every((c) => !canPlayRank(rankOf(c), pile, s)) ? 1 : 0;
  if (nz === "down") return unable;
  const h = Array.isArray(next.hand) ? next.hand.length : next.hand;
  const known = next.known || [];
  if (known.some((c) => canPlayRank(rankOf(c), pile, s))) return 0;
  return Math.pow(unable, Math.max(1, h - known.length));
}

const rankChar = (r) => ({ 10: "T", 11: "J", 12: "Q", 13: "K", 14: "A" }[r] || String(r)) + "X";

function nextSeat(st, i) {
  const n = st.seats.length;
  for (let k = 1; k <= n; k++) { const j = (((i + st.dir * k) % n) + n) % n; if (!st.seats[j].out) return j; }
  return i;
}

/** A plain-English nudge for players who want one (the 🎓 Tips), never saying which play is best. */
export function hint(st, id) {
  const o = options(st);
  if (!o || o.p !== id) return null;
  const s = st.settings;
  const need = needOf(st.pile, s);
  if (o.zone === "down") return "Your hand and face-up cards are gone: flip a face-down card and hope.";
  if (!o.plays.length) return "Nothing you hold will go. You'll have to pick the pile up.";
  const magic = o.plays.filter((p) => isMagic(p.rank, s)).map((p) => p.rank);
  const parts = [];
  if (o.plays.length === 1) parts.push("Only one rank of yours will go.");
  else parts.push(`${o.plays.length} of your ranks will go.`);
  if (magic.length && o.plays.length > magic.length) parts.push("Your magic cards can wait for a tougher pile.");
  if (st.draw.length && o.plays.some((p) => p.cards.length > 1)) parts.push("Playing a pair or more gets you fresh cards from the pack.");
  if (need.kind === "atLeast" && need.rank >= 12) parts.push("It's a high pile: whoever can't beat it picks the lot up.");
  if (st.pile.length >= 8 && o.plays.some((p) => p.rank === 10 && s.tenBurn)) parts.push(`That's ${st.pile.length} cards. A 10 would burn the lot.`);
  return parts.join(" ");
}
