// Guffhead rules: the house rules one by one, then thousands of whole games played out with every setting.
import assert from "node:assert/strict";
import * as R from "../public/rules.js";
import { choose, chooseUp } from "../public/bot.js";

let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let n = 0;
const t = (name, f) => { f(); n++; };

function table(settings, hands) {
  // a rigged table: hands = [{ hand, up, down }], pile/draw set by caller
  const st = R.newGame(hands.map((_, i) => `p${i}`), settings, rnd);
  st.phase = "play"; st.turn = 0; st.draw = [];
  hands.forEach((h, i) => Object.assign(st.seats[i], { hand: h.hand || [], up: h.up || [], down: h.down || [], ready: true }));
  return st;
}

t("defaults are Carl's", () => {
  const s = R.tidySettings();
  assert.equal(s.twoReset, true); assert.equal(s.tenBurn, true); assert.equal(s.seven, "off"); assert.equal(s.fourBurn, true);
});
t("must beat the pile", () => {
  const st = table({}, [{ hand: ["5S", "9H"] }, { hand: ["4C"] }]);
  st.pile = ["8D"];
  assert.throws(() => R.perform(st, "p0", { act: "play", cards: ["5S"] }));
  R.perform(st, "p0", { act: "play", cards: ["9H"] });
  assert.equal(st.turn, 1);
});
t("equal rank goes", () => { const st = table({}, [{ hand: ["8S", "3C"] }, { hand: ["4C"] }]); st.pile = ["8D"]; R.perform(st, "p0", { act: "play", cards: ["8S"] }); });
t("2 goes on anything and resets", () => {
  const st = table({}, [{ hand: ["2S", "KH"] }, { hand: ["3C", "4D"] }]);
  st.pile = ["AD"];
  R.perform(st, "p0", { act: "play", cards: ["2S"] });
  assert.deepEqual(R.needOf(st.pile, st.settings), { kind: "any", rank: 2 });
  R.perform(st, "p1", { act: "play", cards: ["3C"] });
});
t("2 off: a 2 is just low", () => {
  const st = table({ twoReset: false }, [{ hand: ["2S", "KH"] }, { hand: ["3C"] }]);
  st.pile = ["5D"];
  assert.throws(() => R.perform(st, "p0", { act: "play", cards: ["2S"] }));
});
t("10 burns and you go again", () => {
  const st = table({}, [{ hand: ["TS", "4H", "5H"] }, { hand: ["3C"] }]);
  st.pile = ["AD", "KD"];
  const evs = R.perform(st, "p0", { act: "play", cards: ["TS"] });
  assert.equal(st.pile.length, 0); assert.equal(st.turn, 0); assert.equal(evs[0].burn, "ten");
});
t("four of a kind burns, across plays", () => {
  const st = table({}, [{ hand: ["6S", "6H", "KH"] }, { hand: ["3C"] }]);
  st.pile = ["4D", "6D", "6C"];
  const evs = R.perform(st, "p0", { act: "play", cards: ["6S", "6H"] });
  assert.equal(evs[0].burn, "four"); assert.equal(st.turn, 0); assert.equal(st.pile.length, 0);
});
t("can't pick up when you can play (by default)", () => {
  const st = table({}, [{ hand: ["9S", "KH"] }, { hand: ["3C"] }]);
  st.pile = ["5D"];
  assert.throws(() => R.perform(st, "p0", { act: "pickup" }));
  const st2 = table({ pickUpAnyTime: true }, [{ hand: ["9S", "KH"] }, { hand: ["3C"] }]);
  st2.pile = ["5D"];
  R.perform(st2, "p0", { act: "pickup" });
  assert.equal(st2.seats[0].hand.length, 3);
});
t("stuck: pick up, and the others know what you took", () => {
  const st = table({}, [{ hand: ["4S"] }, { hand: ["3C"] }]);
  st.pile = ["9D", "QH"];
  assert.deepEqual(R.forcedMove(st), { act: "pickup", forced: true });
  R.perform(st, "p0", { act: "pickup" });
  assert.deepEqual(st.seats[0].known.sort(), ["9D", "QH"]);
  assert.deepEqual(R.viewFor(st, "p1").seats[0].known.sort(), ["9D", "QH"]);
  assert.equal(R.viewFor(st, "p1").seats[0].hand, 3);
});
t("7 reverse: off by default, on when asked", () => {
  const st = table({}, [{ hand: ["7S", "KH"] }, { hand: ["8C"] }, { hand: ["9C"] }]);
  R.perform(st, "p0", { act: "play", cards: ["7S"] });
  assert.equal(st.turn, 1);
  const st2 = table({ seven: "reverse" }, [{ hand: ["7S", "KH"] }, { hand: ["8C"] }, { hand: ["9C"] }]);
  R.perform(st2, "p0", { act: "play", cards: ["7S"] });
  assert.equal(st2.turn, 2); assert.equal(st2.dir, -1);
});
t("two 7s reverse twice (no change)", () => {
  const st = table({ seven: "reverse" }, [{ hand: ["7S", "7H", "KH"] }, { hand: ["8C"] }, { hand: ["9C"] }]);
  R.perform(st, "p0", { act: "play", cards: ["7S", "7H"] });
  assert.equal(st.turn, 1);
});
t("7 lower", () => {
  const st = table({ seven: "lower" }, [{ hand: ["7S", "KH"] }, { hand: ["8C", "5D"] }]);
  R.perform(st, "p0", { act: "play", cards: ["7S"] });
  assert.throws(() => R.perform(st, "p1", { act: "play", cards: ["8C"] }));
  R.perform(st, "p1", { act: "play", cards: ["5D"] });
});
t("8 skip", () => {
  const st = table({ eight: "skip" }, [{ hand: ["8S", "KH"] }, { hand: ["9C"] }, { hand: ["9D"] }]);
  R.perform(st, "p0", { act: "play", cards: ["8S"] });
  assert.equal(st.turn, 2);
});
t("invisible 3", () => {
  const st = table({ three: "invisible" }, [{ hand: ["3S", "KH"] }, { hand: ["9C", "QD"] }]);
  st.pile = ["JD"];
  R.perform(st, "p0", { act: "play", cards: ["3S"] });
  assert.throws(() => R.perform(st, "p1", { act: "play", cards: ["9C"] }));
  R.perform(st, "p1", { act: "play", cards: ["QD"] });
});
t("draw back up to three", () => {
  const st = table({}, [{ hand: ["5S", "6S", "7S"] }, { hand: ["3C"] }]);
  st.draw = ["2C", "KD", "AS"];
  R.perform(st, "p0", { act: "play", cards: ["5S"] });
  assert.equal(st.seats[0].hand.length, 3); assert.equal(st.draw.length, 2);
});
t("face up, then blind", () => {
  const st = table({}, [{ hand: [], up: ["9S"], down: ["4C"] }, { hand: ["3C", "3D"] }]);
  st.pile = ["5D"];
  R.perform(st, "p0", { act: "play", cards: ["9S"] });
  assert.throws(() => R.perform(st, "p1", { act: "play", cards: ["3C"] }));
  R.perform(st, "p1", { act: "pickup" });
  assert.equal(R.zoneOf(st, st.seats[0]), "down");
  // pile is empty after the pickup, so the blind 4 goes and p0 is out: game over, p1 the Guffhead
  R.perform(st, "p0", { act: "flip", index: 0 });
  assert.equal(st.phase, "over"); assert.equal(st.loser, "p1");
});
t("a blind card that won't go: pick it all up", () => {
  const st = table({}, [{ hand: [], up: [], down: ["4C", "5C"] }, { hand: ["3C", "8D"] }]);
  st.pile = ["KD"];
  const evs = R.perform(st, "p0", { act: "flip", index: 0 });
  assert.equal(evs[0].k, "flip"); assert.equal(evs[0].ok, false);
  assert.deepEqual(st.seats[0].hand.sort(), ["4C", "KD"]);
});
t("forced: one card that goes is played for you", () => {
  const st = table({}, [{ hand: ["4S", "QH"] }, { hand: ["3C"] }]);
  st.pile = ["JD"];
  assert.deepEqual(R.forcedMove(st), { act: "play", cards: ["QH"], forced: true });
  st.seats[0].hand = ["4S", "QH", "KH"];
  assert.equal(R.forcedMove(st), null);
});
t("forced: face-down cards are only flipped for you when there's one left", () => {
  // Nick, 12 Nov 2026: the page flipped JS, 7D, 5D for him and he lost; 5D, 7D, JS would have won it
  const st = table({}, [{ hand: [], up: [], down: ["JS", "7D", "5D"] }, { hand: ["3C"] }]);
  st.pile = ["5H", "5C"];
  assert.equal(R.forcedMove(st), null, "three face-down: their pick");
  st.seats[0].down = ["JS", "7D"];
  assert.equal(R.forcedMove(st), null, "two face-down: their pick");
  st.seats[0].down = ["JS"];
  assert.deepEqual(R.forcedMove(st), { act: "flip", index: 0, forced: true }, "one face-down: no choice");
});
t("start: lowest ordinary card", () => {
  const st = R.newGame(["a", "b"], {}, rnd);
  st.seats[0].hand = ["2S", "TS", "9S"]; st.seats[1].hand = ["4C", "KH", "AD"];
  R.ready(st, "a"); R.ready(st, "b");
  assert.equal(st.turn, 1);
});
t("swap", () => {
  const st = R.newGame(["a", "b"], {}, rnd);
  const six = [...st.seats[0].hand, ...st.seats[0].up];
  R.setUp(st, "a", six.slice(0, 3));
  assert.deepEqual(st.seats[0].up, six.slice(0, 3));
  assert.throws(() => R.setUp(st, "a", ["XX", "YY", "ZZ"]));
});
t("views hide what they should", () => {
  const st = R.newGame(["a", "b", "c"], {}, rnd);
  const v = R.viewFor(st, "a");
  assert.ok(Array.isArray(v.seats[0].hand)); assert.equal(typeof v.seats[1].hand, "number"); assert.equal(typeof v.seats[0].down, "number");
  assert.equal(typeof v.draw, "number");
  assert.ok(!JSON.stringify(v).includes(JSON.stringify(st.seats[1].hand)));
});

// whole games, every combination of house rules, 2 to 4 players, cards conserved, always ends
const combos = [];
for (const seven of ["off", "reverse", "lower"]) for (const eight of ["off", "skip"]) for (const three of ["off", "invisible"]) for (const twoReset of [true, false]) for (const tenBurn of [true, false]) combos.push({ seven, eight, three, twoReset, tenBurn, fourBurn: rnd() < 0.7, pickUpAnyTime: rnd() < 0.3 });
let games = 0, maxTurns = 0, totalTurns = 0, forcedShare = 0, decisions = 0;
for (const s of combos) for (let k = 0; k < 25; k++) {
  const np = 2 + (k % 3);
  const ids = Array.from({ length: np }, (_, i) => (i % 2 ? "msguffbot" : "guffbot") + i);
  const st = R.newGame(ids, s, rnd);
  for (const p of st.seats) R.setUp(st, p.id, chooseUp([...p.hand, ...p.up], st.settings));
  for (const p of st.seats) R.ready(st, p.id);
  let guard = 0;
  while (st.phase === "play") {
    const id = st.seats[st.turn].id;
    const f = R.forcedMove(st);
    decisions++;
    if (f) forcedShare++;
    const a = f || choose(st, id.startsWith("ms") ? "msguffbot" : "guffbot", rnd);
    R.perform(st, id, a, { forced: !!f });
    const total = st.pile.length + st.draw.length + st.gone.length + st.seats.reduce((a, p) => a + R.cardsLeft(p), 0);
    assert.equal(total, 52, "cards conserved");
    assert.ok(++guard < 2000, "ends");
  }
  assert.equal(st.phase, "over"); assert.ok(st.loser);
  assert.equal(st.finished.length, np - 1);
  games++; maxTurns = Math.max(maxTurns, st.turns); totalTurns += st.turns;
}
console.log(`rules: ${n} checks, ${games} whole games over ${combos.length} rule sets ok. Turns per game: average ${(totalTurns / games).toFixed(0)}, most ${maxTurns}. Forced (played for you): ${(100 * forcedShare / decisions).toFixed(0)}% of goes.`);

// the replay rebuilds every finished game exactly: hands, pile and burned count at the end match the real game
import { at, steps, canReplay } from "../public/replay.js";
let replayed = 0;
for (let k = 0; k < 300; k++) {
  const s = combos[k % combos.length];
  const ids = ["a", "b", "c", "d"].slice(0, 2 + (k % 3));
  const st = R.newGame(ids, s, rnd);
  for (const p of st.seats) R.setUp(st, p.id, chooseUp([...p.hand, ...p.up], st.settings));
  for (const p of st.seats) R.ready(st, p.id);
  while (st.phase === "play") { const id = st.seats[st.turn].id; R.perform(st, id, R.forcedMove(st) || choose(st, k % 2 ? "msguffbot" : "guffbot", rnd)); }
  if (st.turns >= R.TURN_LIMIT) continue;
  const v = R.viewFor(st, "a");
  assert.ok(canReplay(v.events));
  const end = at(v.events, steps(v.events).length, st.settings);
  for (const p of st.seats) {
    const r = end.seats.find((x) => x.id === p.id);
    assert.deepEqual(r.hand.slice().sort(), p.hand.slice().sort(), "hand matches");
    assert.deepEqual(r.up.slice().sort(), p.up.slice().sort());
    assert.equal(r.down.length, p.down.length);
  }
  assert.deepEqual(end.pile, st.pile); assert.equal(end.burned, st.burned);
  // mid-game view hides the deal from phones
  replayed++;
}
{
  const st = R.newGame(["a", "b"], {}, rnd);
  for (const p of st.seats) R.ready(st, p.id);
  const v = R.viewFor(st, "a");
  assert.ok(!v.events.find((e) => e.k === "start").deal, "deal hidden mid-game");
}
console.log(`replay: ${replayed} finished games rebuilt exactly from the deal`);

