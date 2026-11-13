// Guffhead tables without a database: the house plays at once, forced moves are made, the idle timer plays an
// absent player's go, and nobody sees anybody else's hand.
import assert from "node:assert/strict";
import { newTable, runHouse, perform, autopilot, viewFor, required, summary } from "../src/game.js";
import * as R from "../public/rules.js";
import { choose, chooseUp } from "../public/bot.js";

let seed = 3; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let checks = 0;

// a human against both bots: whole games played by a stand-in for the human
for (let k = 0; k < 150; k++) {
  const st = newTable(["carl", "guffbot", "msguffbot"], { carl: "Carl", guffbot: "GuffBot", msguffbot: "Ms GuffBot" }, k % 2 ? {} : { seven: "reverse", eight: "skip" }, rnd);
  st.id = "abcdef";
  runHouse(st, rnd);
  assert.deepEqual(required(st), ["carl"], "only Carl to swap");
  const v0 = viewFor(st, "carl");
  assert.equal(v0.six.length, 6);
  perform(st, "carl", { act: "ready", up: chooseUp(v0.six, st.settings) }, rnd, new Set());
  let decisions = 0;
  while (st.status === "playing") {
    assert.deepEqual(required(st), ["carl"], "the house never keeps you waiting");
    const v = viewFor(st, "carl");
    assert.ok(v.myGo && v.options, "Carl has options");
    assert.equal(R.forcedMove(st.g), null, "a forced move is never left for you");
    const others = v.g.seats.filter((p) => p.id !== "carl");
    assert.ok(others.every((p) => typeof p.hand === "number"), "others' hands hidden");
    // Carl's phone is away from the table between goes, so forced moves are played for him
    perform(st, "carl", { ...choose(st.g, "guffbot", rnd), seq: st.g.seq }, rnd, new Set());
    decisions++;
  }
  assert.ok(st.loser);
  checks++;
}

// two humans: stale moves are refused, the idle timer plays for the absent one
{
  const st = newTable(["carl", "nick"], { carl: "Carl", nick: "Nick" }, { idleHours: 4 }, rnd);
  st.id = "ghijkm";
  runHouse(st, rnd);
  assert.deepEqual(required(st).sort(), ["carl", "nick"]);
  perform(st, "carl", { act: "ready" }, rnd);
  assert.deepEqual(required(st), ["nick"]);
  assert.deepEqual(autopilot(st, st.lastAct + 3 * 3600000, rnd), [], "not yet");
  assert.deepEqual(autopilot(st, st.lastAct + 5 * 3600000, rnd), ["nick"], "GuffBot sorts Nick's cards");
  assert.equal(st.g.phase, "play");
  assert.ok(st.g.events.find((e) => e.k === "ready" && e.p === "nick").autopilot);
  const who = required(st)[0];
  const t = st.lastAct + 5 * 3600000;
  const before = st.g.seq;
  assert.deepEqual(autopilot(st, t, rnd), [who]);
  assert.ok(st.g.events.some((e) => e.seq > before && e.autopilot), "marked as played by GuffBot");
  const stale = st.g.seq - 1;
  const nowWho = required(st)[0];
  if (st.status === "playing") assert.throws(() => perform(st, nowWho, { act: "pickup", seq: stale }, rnd), /moved on/);
  assert.throws(() => perform(st, "steve", { act: "pickup" }, rnd), /not at this table/);
  const s = summary(st, "carl");
  assert.ok(s.last, "lobby line");
  checks++;
}

// live at the table: a forced move is left for you to make, and played for you once you've gone
{
  let held = 0, played = 0;
  for (let k = 0; k < 60; k++) {
    const st = newTable(["carl", "guffbot"], { carl: "Carl", guffbot: "GuffBot" }, {}, rnd);
    runHouse(st, rnd);
    perform(st, "carl", { act: "ready" }, rnd);           // Carl's here (he just acted)
    while (st.status === "playing") {
      if (st.held) {
        assert.equal(st.held, "carl"); assert.ok(R.forcedMove(st.g), "held only when forced");
        held++;
        if (held % 2) { perform(st, "carl", { ...R.forcedMove(st.g), seq: st.g.seq }, rnd); continue; }   // he taps it himself
        runHouse(st, rnd, new Set()); played++;            // he's left: played for him
        assert.ok(!st.held || st.held === undefined);
        continue;
      }
      if (st.status !== "playing") break;
      perform(st, "carl", { ...choose(st.g, "guffbot", rnd), seq: st.g.seq }, rnd);
    }
  }
  assert.ok(held > 20 && played > 5, `held ${held}, played after leaving ${played}`);
  checks++;
}

// resign: you're the Guffhead
{
  const st = newTable(["carl", "nick", "guffbot"], { carl: "Carl", nick: "Nick", guffbot: "GuffBot" }, {}, rnd);
  runHouse(st, rnd);
  perform(st, "nick", { act: "resign" }, rnd);
  assert.equal(st.status, "finished"); assert.equal(st.loser, "nick");
  checks++;
}
// idle timer off
{
  const st = newTable(["carl", "nick"], { carl: "Carl", nick: "Nick" }, { idleHours: 0 }, rnd);
  assert.deepEqual(autopilot(st, st.lastAct + 1000 * 3600000, rnd), []);
  checks++;
}
// AutoPlay (13 Nov 2026): one go, three goes, until you're back; playing a card yourself switches it off
for (let k = 0; k < 40; k++) {
  const st = newTable(["carl", "nick"], { carl: "Carl", nick: "Nick" }, { idleHours: 0 }, rnd);
  st.id = "autopl";
  runHouse(st, rnd);
  for (const id of ["carl", "nick"]) { const v = viewFor(st, id); perform(st, id, { act: "ready", up: chooseUp(v.six, st.settings) }, rnd, new Set()); }
  const n = k % 3 === 0 ? 1 : k % 3 === 1 ? 3 : "back";
  perform(st, "carl", { act: "autoplay", n }, rnd, new Set(["carl", "nick"]));
  const carlGoes = () => st.g.events.filter((e) => e.p === "carl" && e.autopilot && ["play", "pickup", "flip"].includes(e.k)).length;
  // Nick plays for himself; every one of Carl's goes is GuffBot's until the AutoPlay runs out
  let guard = 0;
  while (st.status === "playing" && guard++ < 400) {
    const id = required(st)[0];
    if (id === "carl") break;   // AutoPlay's run out and it's Carl's own go again
    perform(st, "nick", { ...choose(st.g, "guffbot", rnd), seq: st.g.seq }, rnd, new Set(["carl", "nick"]));
  }
  if (st.status === "playing") {
    if (n === "back") assert.fail("until you're back never hands the go back by itself");
    assert.ok(carlGoes() >= 1 && carlGoes() <= n, `AutoPlay ${n}: GuffBot played ${carlGoes()} of Carl's goes`);
    assert.ok(!st.auto.carl, "and it's switched off");
  } else if (n === "back") assert.ok(carlGoes() >= 1, "GuffBot played for Carl until the end");
  checks++;
}
{
  // playing for yourself switches it off
  const st = newTable(["carl", "nick"], { carl: "Carl", nick: "Nick" }, { idleHours: 0 }, rnd);
  runHouse(st, rnd);
  for (const id of ["carl", "nick"]) { const v = viewFor(st, id); perform(st, id, { act: "ready", up: chooseUp(v.six, st.settings) }, rnd, new Set()); }
  const other = required(st)[0] === "carl" ? "nick" : "carl";
  perform(st, other, { act: "autoplay", n: "back" }, rnd, new Set(["carl", "nick"]));
  assert.ok(st.auto[other]);
  perform(st, other, { act: "autoplay", off: true }, rnd, new Set(["carl", "nick"]));
  assert.ok(!st.auto[other], "Stop switches it off");
  assert.throws(() => perform(st, other, { act: "autoplay", n: 7 }, rnd, new Set()), /three/);
  checks++;
}
console.log(`game: ${checks} checks ok (150 whole games against the house: never kept waiting, never left a forced move)`);
