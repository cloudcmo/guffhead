// Guffhead: the rules, shared by the page and the Worker. Pure functions on a plain state object, no clocks,
// no randomness of its own (the caller passes rnd), so every turn can be checked on the server and replayed.
//
// The game (known in the pub by a ruder name): everyone has three cards face down, three face up on top of
// them and three in hand. Play a card (or several of the same rank) at least as high as the top of the pile, or
// pick the whole pile up. Draw back up to three while the pack lasts. When your hand is empty you play your
// face-up cards, then your face-down cards blind. The last player left holding cards is the Guffhead.
//
// House rules are per game (Carl, 10 Nov 2026). Defaults: a 2 goes on anything and resets the pile; a 10 burns
// it; four of a kind burns it. 7 reverses play is OFF by default and can be switched on for a game.

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
export const SUITS = ["S", "H", "D", "C"];
export const RANK_NAME = { 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "jack", 12: "queen", 13: "king", 14: "ace" };
export const RANK_PLURAL = { 2: "2s", 3: "3s", 4: "4s", 5: "5s", 6: "6s", 7: "7s", 8: "8s", 9: "9s", 10: "10s", 11: "jacks", 12: "queens", 13: "kings", 14: "aces" };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const HAND = 3;
export const TURN_LIMIT = 900;   // a safety net: no real game gets near this

/** The house rules, with Carl's defaults. Every game stores its own copy. */
export const DEFAULTS = Object.freeze({
  twoReset: true,          // a 2 goes on anything and the next player can play anything
  tenBurn: true,           // a 10 goes on anything and burns the pile; the burner goes again
  fourBurn: true,          // four of the same rank on top of the pile burns it
  seven: "off",            // off | reverse (7 reverses the direction of play) | lower (next player plays 7 or lower)
  eight: "off",            // off | skip (each 8 skips the next player)
  three: "off",            // off | invisible (a 3 goes on anything and the pile plays as if it wasn't there)
  pickUpAnyTime: false,    // you may pick up the pile even when you could play
  idleHours: 12,           // GuffBot plays your go if you've left it this long (0 = never)
});
export const IDLE_CHOICES = [0, 4, 12, 24, 48];

/** The settings a game is allowed to have, tidied: anything unknown falls back to the default. */
export function tidySettings(s) {
  const o = { ...DEFAULTS };
  if (!s || typeof s !== "object") return o;
  for (const k of ["twoReset", "tenBurn", "fourBurn", "pickUpAnyTime"]) if (typeof s[k] === "boolean") o[k] = s[k];
  if (["off", "reverse", "lower"].includes(s.seven)) o.seven = s.seven;
  if (["off", "skip"].includes(s.eight)) o.eight = s.eight;
  if (["off", "invisible"].includes(s.three)) o.three = s.three;
  if (IDLE_CHOICES.includes(Number(s.idleHours))) o.idleHours = Number(s.idleHours);
  return o;
}

/** The house rules in words, for the game page: [[label, words], ...] with only what's switched on. */
export function describeRules(s) {
  const out = [];
  out.push(["2", s.twoReset ? "Goes on anything. The next player can play anything." : "Just a 2, the lowest card."]);
  if (s.three === "invisible") out.push(["3", "Invisible: goes on anything, and the next player plays to the card underneath."]);
  if (s.seven === "reverse") out.push(["7", "Reverses the direction of play."]);
  if (s.seven === "lower") out.push(["7", "The next player must play a 7 or lower."]);
  if (s.eight === "skip") out.push(["8", "Skips the next player (two 8s skip two)."]);
  out.push(["10", s.tenBurn ? "Goes on anything and burns the pile. You go again." : "Just a 10."]);
  if (s.fourBurn) out.push(["4 of a kind", "Four the same on top of the pile burns it. You go again."]);
  if (s.pickUpAnyTime) out.push(["Pick up", "You can pick up the pile instead of playing, any time."]);
  return out;
}

/* ---------- cards ---------- */

export const rankOf = (c) => RANKS.indexOf(c[0]) + 2;            // 2..14 (ace high)
export const suitOf = (c) => c[1];
export function deck() { const d = []; for (const r of RANKS) for (const s of SUITS) d.push(r + s); return d; }
export function shuffle(a, rnd) { const d = a.slice(); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
export const sortCards = (cs, s = DEFAULTS) => cs.slice().sort((a, b) => sortKey(a, s) - sortKey(b, s) || SUITS.indexOf(a[1]) - SUITS.indexOf(b[1]));
/** Hand order: ordinary cards low to high, then the magic ones (they're the ones you're saving). */
export function sortKey(c, s = DEFAULTS) { const r = rankOf(c); return isMagic(r, s) ? 100 + magicWorth(r, s) : r; }

/** Ranks that go on anything under these house rules. */
export function isMagic(r, s) { return (r === 2 && s.twoReset) || (r === 10 && s.tenBurn) || (r === 3 && s.three === "invisible"); }
const magicWorth = (r, s) => (r === 10 ? 3 : r === 2 ? 2 : 1);

/* ---------- the pile ---------- */

/** What the next play must beat: { kind: 'any' } | { kind: 'atLeast', rank } | { kind: 'atMost', rank } */
export function needOf(pile, s) {
  for (let i = pile.length - 1; i >= 0; i--) {
    const r = rankOf(pile[i]);
    if (r === 3 && s.three === "invisible") continue;           // see straight through it
    if (r === 2 && s.twoReset) return { kind: "any", rank: 2 };
    if (r === 7 && s.seven === "lower") return { kind: "atMost", rank: 7 };
    return { kind: "atLeast", rank: r };
  }
  return { kind: "any", rank: 0 };
}
export function canPlayRank(r, pile, s) {
  if (isMagic(r, s)) return true;
  const n = needOf(pile, s);
  if (n.kind === "any") return true;
  if (n.kind === "atMost") return r <= n.rank;
  return r >= n.rank;
}
export function needWords(pile, s) {
  const n = needOf(pile, s);
  if (n.kind === "any") return pile.length ? "Anything goes" : "Empty pile: anything goes";
  if (n.kind === "atMost") return "7 or lower";
  if (n.rank === 14) return "Aces only";
  return `${RANK_NAME[n.rank] === String(n.rank) ? n.rank : cap(RANK_NAME[n.rank])} or higher`;
}
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);

/** How many of the same rank sit on top of the pile, straight run. */
function topRun(pile) {
  if (!pile.length) return 0;
  const r = rankOf(pile[pile.length - 1]);
  let n = 0;
  for (let i = pile.length - 1; i >= 0 && rankOf(pile[i]) === r; i--) n++;
  return n;
}

/* ---------- a new game ---------- */

/**
 * players: ids in seat order. Returns the state at the swap: everyone may swap cards between hand and face-up,
 * then says they're ready. Nobody plays until everyone is ready.
 */
export function newGame(players, settings, rnd) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error("Two to four players");
  const s = tidySettings(settings);
  const d = shuffle(deck(), rnd);
  const seats = players.map((id) => ({ id, down: d.splice(0, HAND), up: d.splice(0, HAND), hand: d.splice(0, HAND), ready: false, out: 0, known: [] }));
  for (const p of seats) p.hand = sortCards(p.hand, s);
  const st = { settings: s, seats, draw: d, pile: [], gone: [], burned: 0, burns: 0, turn: -1, dir: 1, phase: "swap", finished: [], loser: null, turns: 0, seq: 0, events: [] };
  ev(st, { k: "deal", n: players.length });
  return st;
}

const EVENTS_KEEP = 1500;   // enough for a whole game, so a finished game can be replayed from the deal
function ev(st, e) {
  st.seq++;
  st.events.push({ seq: st.seq, ...e });
  if (st.events.length > EVENTS_KEEP) st.events.splice(0, st.events.length - EVENTS_KEEP);
  return e;
}

export const seatOf = (st, id) => st.seats.findIndex((p) => p.id === id);
const live = (st) => st.seats.filter((p) => !p.out);
export const cardsLeft = (p) => p.hand.length + p.up.length + p.down.length;

/** Where a player plays from right now: hand, then face-up, then face-down. */
export function zoneOf(st, p) {
  if (p.hand.length) return "hand";
  if (p.up.length) return "up";
  if (p.down.length) return "down";
  return null;
}

/* ---------- the swap ---------- */

/** Swap one hand card with one face-up card during the swap. */
export function swapCards(st, id, handCard, upCard) {
  if (st.phase !== "swap") throw new Error("The swap is over");
  const p = st.seats[seatOf(st, id)];
  if (!p) throw new Error("You're not at this table");
  if (p.ready) throw new Error("You've said you're ready");
  const hi = p.hand.indexOf(handCard), ui = p.up.indexOf(upCard);
  if (hi < 0 || ui < 0) throw new Error("Those cards aren't yours to swap");
  p.hand[hi] = upCard; p.up[ui] = handCard;
  p.hand = sortCards(p.hand, st.settings);
}
/** Set the face-up three directly (from the six cards you hold during the swap). */
export function setUp(st, id, up) {
  if (st.phase !== "swap") throw new Error("The swap is over");
  const p = st.seats[seatOf(st, id)];
  if (!p) throw new Error("You're not at this table");
  if (p.ready) throw new Error("You've said you're ready");
  const six = [...p.hand, ...p.up];
  if (!Array.isArray(up) || up.length !== HAND || new Set(up).size !== HAND || up.some((c) => !six.includes(c))) throw new Error("Pick three of your six cards to go face up");
  p.up = up.slice();
  p.hand = sortCards(six.filter((c) => !up.includes(c)), st.settings);
}

export function ready(st, id) {
  if (st.phase !== "swap") throw new Error("The swap is over");
  const p = st.seats[seatOf(st, id)];
  if (!p) throw new Error("You're not at this table");
  if (p.ready) return;
  p.ready = true;
  ev(st, { k: "ready", p: id, up: p.up.slice() });
  if (st.seats.every((x) => x.ready)) begin(st);
}

/** Everyone's ready: the lowest ordinary card in anyone's hand starts (ties go round the table from the dealer). */
function begin(st) {
  st.phase = "play";
  let best = null;
  st.seats.forEach((p, i) => {
    for (const c of p.hand) {
      const r = rankOf(c);
      if (isMagic(r, st.settings)) continue;
      if (!best || r < best.r) best = { i, r, c };
    }
  });
  st.turn = best ? best.i : 0;
  // the deal as play begins, for the replay of a finished game (hidden from phones until it's over: viewFor)
  const deal = st.seats.map((p) => ({ id: p.id, hand: p.hand.slice(), up: p.up.slice(), down: p.down.slice() }));
  ev(st, { k: "start", p: st.seats[st.turn].id, card: best ? best.c : null, deal, draw: st.draw.slice() });
}

/* ---------- what can be done ---------- */

/**
 * The legal moves for whoever's go it is: { zone, plays: [{ rank, cards: [...] }], flip: n, pickUp: bool }.
 * plays lists each legal rank with every card of it you could play from that zone (you choose how many).
 */
export function options(st) {
  if (st.phase !== "play") return null;
  const p = st.seats[st.turn];
  const s = st.settings;
  const zone = zoneOf(st, p);
  const out = { p: p.id, zone, plays: [], flip: 0, pickUp: false };
  if (zone === "down") { out.flip = p.down.length; return out; }
  const cards = p[zone];
  const by = {};
  for (const c of cards) (by[rankOf(c)] = by[rankOf(c)] || []).push(c);
  for (const r of Object.keys(by).map(Number).sort((a, b) => sortKey(RANKS[a - 2] + "S", s) - sortKey(RANKS[b - 2] + "S", s))) {
    if (canPlayRank(r, st.pile, s)) out.plays.push({ rank: r, cards: by[r] });
  }
  out.pickUp = st.pile.length > 0 && (!out.plays.length || s.pickUpAnyTime);
  return out;
}

/**
 * A move with no real choice in it, made for you (Carl, 10 Nov 2026: forced moves shouldn't cost a turn's wait):
 * nothing you can play (pick up), a blind flip (any face-down card is as good as another), or exactly one card
 * that can go. Returns the action, or null when there's a decision to make.
 */
export function forcedMove(st) {
  const o = options(st);
  if (!o) return null;
  // Face-down cards: only forced when there's one left. With two or more it's your pick, even blind (Carl and Nick,
  // 12 Nov 2026: Nick lost a game the page flipped for him; turning them in a different order would have won it).
  if (o.zone === "down") return st.seats[st.turn].down.length === 1 ? { act: "flip", index: 0, forced: true } : null;
  if (!o.plays.length) return o.pickUp ? { act: "pickup", forced: true } : null;
  if (o.plays.length === 1 && o.plays[0].cards.length === 1 && !(o.pickUp && st.settings.pickUpAnyTime)) return { act: "play", cards: o.plays[0].cards.slice(), forced: true };
  return null;
}

/* ---------- doing it ---------- */

/**
 * Do something on your go. act: { act: 'play', cards } | { act: 'pickup' } | { act: 'flip', index }.
 * tags (forced, autopilot) are copied onto the events so the replay can say so. Returns the events added.
 */
export function perform(st, id, act, tags = {}) {
  if (st.phase !== "play") throw new Error(st.phase === "swap" ? "Everyone's still sorting their cards" : "It's all over");
  const p = st.seats[st.turn];
  if (!p || p.id !== id) throw new Error("It isn't your go");
  const before = st.seq;
  const mark = {};
  if (tags.forced) mark.auto = 1;
  if (tags.autopilot) mark.autopilot = 1;
  const a = act && act.act;
  if (a === "pickup") {
    const o = options(st);
    if (!o.pickUp) throw new Error(st.pile.length ? "You can play, so you must" : "There's nothing to pick up");
    pickUp(st, p, mark);
    advance(st, 1);
  } else if (a === "play") {
    playCards(st, p, act.cards, mark);
  } else if (a === "flip") {
    if (zoneOf(st, p) !== "down") throw new Error("You still have cards you can see");
    const i = Number(act.index);
    if (!Number.isInteger(i) || i < 0 || i >= p.down.length) throw new Error("Pick one of your face-down cards");
    const c = p.down.splice(i, 1)[0];
    const ok = canPlayRank(rankOf(c), st.pile, st.settings);
    ev(st, { k: "flip", p: p.id, card: c, ok, ...mark });
    if (ok) land(st, p, [c], "down", mark);
    else {
      st.pile.push(c);
      pickUp(st, p, mark);
      advance(st, 1);
    }
  } else throw new Error("Play, pick up or flip");
  st.turns++;
  if (st.phase === "play" && st.turns >= TURN_LIMIT) endByLimit(st);
  return st.events.filter((e) => e.seq > before);
}

function playCards(st, p, cards, mark) {
  const zone = zoneOf(st, p);
  if (zone === "down") throw new Error("Flip one of your face-down cards");
  if (!Array.isArray(cards) || !cards.length) throw new Error("Pick a card to play");
  const src = p[zone];
  if (new Set(cards).size !== cards.length || cards.some((c) => !src.includes(c))) throw new Error(zone === "up" ? "Play from your face-up cards" : "Those cards aren't in your hand");
  const r = rankOf(cards[0]);
  if (cards.some((c) => rankOf(c) !== r)) throw new Error("Cards played together must be the same rank");
  if (!canPlayRank(r, st.pile, st.settings)) throw new Error(`That won't go: ${needWords(st.pile, st.settings).toLowerCase()}`);
  p[zone] = src.filter((c) => !cards.includes(c));
  land(st, p, cards, zone, mark);
}

/** Cards have gone on the pile: burns, draws, going out, then whose go it is. */
function land(st, p, cards, zone, mark) {
  const s = st.settings;
  st.pile.push(...cards);
  const r = rankOf(cards[0]);
  p.known = removeKnown(p.known, cards);
  let burn = null;
  if (r === 10 && s.tenBurn) burn = "ten";
  else if (s.fourBurn && topRun(st.pile) >= 4) burn = "four";
  let reverse = false;
  if (r === 7 && s.seven === "reverse" && cards.length % 2 === 1 && live(st).length > 2) { st.dir = -st.dir; reverse = true; }
  const skips = r === 8 && s.eight === "skip" && !burn ? cards.length : 0;
  const e = { k: "play", p: p.id, cards: cards.slice(), from: zone, pile: st.pile.length, ...mark };
  if (burn) e.burn = burn;
  if (reverse) e.reverse = st.dir;
  ev(st, e);
  if (burn) {
    st.burned += st.pile.length; st.burns++; st.gone.push(...st.pile);
    st.burnsBy = st.burnsBy || {}; st.burnBest = st.burnBest || {};
    st.burnsBy[p.id] = (st.burnsBy[p.id] || 0) + 1;
    st.burnBest[p.id] = Math.max(st.burnBest[p.id] || 0, st.pile.length);
    st.pile = [];
  }
  // back up to three while the pack lasts
  if (zone === "hand" && st.draw.length && p.hand.length < HAND) {
    const n = Math.min(HAND - p.hand.length, st.draw.length);
    const drawn = st.draw.splice(0, n);
    p.hand = sortCards(p.hand.concat(drawn), s);
    ev(st, { k: "draw", p: p.id, n, left: st.draw.length, cards: drawn });   // cards: the drawer's eyes only (viewFor)
  }
  if (!cardsLeft(p)) goOut(st, p);
  if (st.phase !== "play") return;
  if (burn && !p.out) return;              // the burner goes again
  if (skips) {
    const skipped = [];
    let i = st.turn;
    for (let k = 0; k < skips; k++) { i = nextLive(st, i); skipped.push(st.seats[i].id); }
    ev(st, { k: "skip", p: p.id, skipped });
    st.turn = i;
    advance(st, 1);
    return;
  }
  advance(st, 1);
}

function pickUp(st, p, mark) {
  const n = st.pile.length;
  const cards = st.pile.slice();
  p.hand = sortCards(p.hand.concat(cards), st.settings);
  p.known = p.known.concat(cards);
  st.pile = [];
  ev(st, { k: "pickup", p: p.id, n, cards, ...mark });
}

function removeKnown(known, cards) {
  const k = known.slice();
  for (const c of cards) { const i = k.indexOf(c); if (i >= 0) k.splice(i, 1); }
  return k;
}

function goOut(st, p) {
  st.finished.push(p.id);
  p.out = st.finished.length;
  ev(st, { k: "out", p: p.id, place: p.out });
  const left = live(st);
  if (left.length <= 1) {
    st.phase = "over";
    st.loser = left.length ? left[0].id : null;
    ev(st, { k: "over", loser: st.loser });
  }
}

function nextLive(st, i) {
  const n = st.seats.length;
  for (let k = 1; k <= n; k++) {
    const j = (((i + st.dir * k) % n) + n) % n;
    if (!st.seats[j].out) return j;
  }
  return i;
}
function advance(st, steps) {
  if (st.phase !== "play") return;
  let i = st.turn;
  for (let k = 0; k < steps; k++) i = nextLive(st, i);
  // the player whose go it was may have just gone out: start from them anyway, nextLive skips the out
  st.turn = i;
}

function endByLimit(st) {
  const left = live(st).sort((a, b) => cardsLeft(b) - cardsLeft(a));
  st.phase = "over";
  st.loser = left[0].id;
  for (const p of left.slice(1)) { st.finished.push(p.id); p.out = st.finished.length; }
  ev(st, { k: "over", loser: st.loser, limit: true });
}

/** Leave the table: you're the Guffhead, and that's the end of it. */
export function resign(st, id) {
  if (st.phase === "over") throw new Error("It's all over");
  const i = seatOf(st, id);
  if (i < 0) throw new Error("You're not at this table");
  for (const p of live(st)) if (p.id !== id) { st.finished.push(p.id); p.out = st.finished.length; }
  st.phase = "over";
  st.loser = id;
  ev(st, { k: "over", loser: id, resigned: true });
}

/* ---------- what each player may see ---------- */

/** The state as one player (or a watcher, id null) may see it: other people's hands and every face-down card hidden. */
export function viewFor(st, id) {
  const over = st.phase === "over";
  return {
    settings: st.settings, phase: st.phase, turn: st.turn, dir: st.dir, pile: st.pile.slice(), burned: st.burned, burns: st.burns,
    draw: st.draw.length, finished: st.finished.slice(), loser: st.loser, turns: st.turns, seq: st.seq,
    seats: st.seats.map((p) => {
      const mine = p.id === id;
      return {
        id: p.id, up: p.up.slice(), down: p.down.length, out: p.out, ready: p.ready,
        hand: mine || over ? p.hand.slice() : p.hand.length,
        known: mine ? [] : p.known.slice(),
        downCards: over ? p.down.slice() : undefined,
      };
    }),
    events: st.events.map((e) => privateOut(e, id, over)),
  };
}
/** What a phone may see of an event: the deal and drawn cards stay hidden until the game's over (your own draws excepted). */
function privateOut(e, id, over) {
  if (over) return e;
  if (e.k === "start" && e.deal) { const { deal, draw, ...rest } = e; return rest; }
  if (e.k === "draw" && e.cards && e.p !== id) { const { cards, ...rest } = e; return rest; }
  return e;
}

/** Cards a player hasn't seen anywhere (for Ms GuffBot's sums and the hints): the rest of the deck. */
export function unseenBy(st, id) {
  const seen = new Set(st.pile);
  for (const p of st.seats) {
    for (const c of p.up) seen.add(c);
    if (p.id === id) for (const c of p.hand) seen.add(c);
    else for (const c of p.known) seen.add(c);
  }
  for (const c of st.gone || []) seen.add(c);
  return deck().filter((c) => !seen.has(c));
}
