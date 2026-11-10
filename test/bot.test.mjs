// Guffhead's house: Ms GuffBot should leave GuffBot holding the cards more often than not, both should beat a
// player who picks at random, and a go should take no time at all.
import assert from "node:assert/strict";
import * as R from "../public/rules.js";
import { choose, chooseUp } from "../public/bot.js";

const N = Number(process.argv[2] || 400);
let seed = 99; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
function randomPlayer(st) { const o = R.options(st); if (o.zone === "down") return { act: "flip", index: 0 }; if (!o.plays.length) return { act: "pickup" }; const p = o.plays[Math.floor(rnd() * o.plays.length)]; return { act: "play", cards: p.cards.slice(0, 1 + Math.floor(rnd() * p.cards.length)) }; }
function duel(a, b, settings = {}) {
  let aLost = 0, slow = 0;
  for (let g = 0; g < N; g++) {
    const ids = g % 2 ? [a, b] : [b, a];
    const st = R.newGame(ids, settings, rnd);
    for (const p of st.seats) R.setUp(st, p.id, p.id === "random" ? [...p.up] : chooseUp([...p.hand, ...p.up], st.settings));
    for (const p of st.seats) R.ready(st, p.id);
    while (st.phase === "play") {
      const id = st.seats[st.turn].id;
      const t0 = performance.now();
      const act = R.forcedMove(st) || (id === "random" ? randomPlayer(st) : choose(st, id, rnd));
      slow = Math.max(slow, performance.now() - t0);
      R.perform(st, id, act);
    }
    if (st.loser === a) aLost++;
  }
  return { rate: aLost / N, slow };
}
const r1 = duel("msguffbot", "guffbot");
const r2 = duel("guffbot", "random");
const r3 = duel("msguffbot", "random");
const r4 = duel("msguffbot", "guffbot", { seven: "reverse", eight: "skip", three: "invisible" });
console.log(`Ms GuffBot is the Guffhead in ${(100 * r1.rate).toFixed(0)}% of games against GuffBot (house rules: ${(100 * r4.rate).toFixed(0)}%); GuffBot ${(100 * r2.rate).toFixed(0)}% against random; Ms GuffBot ${(100 * r3.rate).toFixed(0)}% against random. Slowest go ${Math.max(r1.slow, r2.slow, r3.slow).toFixed(1)} ms.`);
assert.ok(r1.rate < 0.45, "Ms GuffBot beats GuffBot");
assert.ok(r2.rate < 0.4, "GuffBot beats random");
assert.ok(r3.rate < 0.3, "Ms GuffBot beats random");
