// Guffhead's Worker over HTTP (run under `npx wrangler dev --port 8799` after `npm run db:local`):
// logins, a game against the house played to the end, a two-person game with presence and stale-move refusal,
// the league, and the 💩 carried into the next game.
import assert from "node:assert/strict";
import { choose, chooseUp } from "../public/bot.js";

const BASE = process.env.BASE || "http://127.0.0.1:8799";
async function call(path, { token, method = "GET", body } = {}) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}
const login = async (name, pin) => { const r = await call("/api/login", { method: "POST", body: { name, pin } }); assert.ok(r.token, `${name} logs in: ${r.error}`); return r.token; };

assert.equal((await call("/api/login", { method: "POST", body: { name: "carl", pin: "9999" } })).status, 401);
const carl = await login("carl", "1234"), nick = await login("nick", "2345"), kate = await login("Kate", "4567");
const me = await call("/api/me", { token: carl });
assert.ok(me.opponents.find((o) => o.id === "kate"), "Kate is on Carl's list");
assert.equal(me.house.length, 2);

// play a game for a phone: the swap, then the stand-in's choices until it's over (or it's someone else's go)
function stateFor(view) {
  // rebuild enough of a rules state from what I can see to let the bot choose: my hand is real, others are counts
  const g = view.g;
  return { settings: view.settings, seats: g.seats.map((p) => ({ ...p, hand: Array.isArray(p.hand) ? p.hand : Array(p.hand).fill("2X"), down: Array(p.down).fill("2X"), known: p.known || [] })), pile: g.pile, draw: Array(g.draw).fill("2X"), gone: [], turn: g.turn, dir: g.dir, phase: g.phase, turns: g.turns };
}
async function playOn(token, id, pid, untilOther = true) {
  for (let i = 0; i < 400; i++) {
    const { game } = await call(`/api/games/${id}?here=1`, { token });
    if (game.status !== "playing") return game;
    if (!game.myGo) { if (untilOther) return game; continue; }
    let body;
    if (game.g.phase === "swap") body = { act: "ready", up: chooseUp(game.six, game.settings) };
    else {
      const o = game.options;
      if (o.zone === "down") body = { act: "flip", index: 0 };
      else if (!o.plays.length) body = { act: "pickup" };
      else body = { act: "play", cards: o.plays[0].cards };
      body.seq = game.g.seq;
    }
    const r = await call(`/api/games/${id}/act`, { token, method: "POST", body });
    assert.ok(r.game, `act ok: ${r.error}`);
  }
  throw new Error("didn't finish");
}

// against the house: Carl never waits on GuffBot
const g1 = await call("/api/games", { token: carl, method: "POST", body: { players: ["guffbot", "msguffbot"], settings: { seven: "reverse" } } });
assert.ok(g1.game.id); assert.equal(g1.game.settings.seven, "reverse"); assert.equal(g1.game.settings.tenBurn, true);
assert.deepEqual(g1.game.required, ["carl"]);
const end1 = await playOn(carl, g1.game.id, "carl", false);
assert.equal(end1.status, "finished"); assert.ok(end1.loser);
assert.ok(end1.g.seats.every((p) => Array.isArray(p.hand)), "hands shown at the end");

// Carl v Nick: the swap waits for both; Nick's phone sees Carl at the table
const g2 = await call("/api/games", { token: carl, method: "POST", body: { players: ["nick"], settings: {} } });
const id2 = g2.game.id;
assert.deepEqual(g2.game.required.sort(), ["carl", "nick"]);
assert.equal(typeof g2.game.g.seats.find((p) => p.id === "nick").hand, "number", "Nick's hand hidden from Carl");
await call(`/api/games/${id2}?here=1`, { token: carl });
const nv = await call(`/api/games/${id2}?here=1`, { token: nick });
assert.deepEqual(nv.here, ["carl"], "presence");
assert.equal((await call(`/api/games/${id2}`, { token: kate })).status, 403, "Kate can't look");
// both ready, then play it out turn by turn between the two phones
let game;
for (let k = 0; k < 2000; k++) {
  const a = await playOn(carl, id2, "carl");
  if (a.status !== "playing") { game = a; break; }
  const b = await playOn(nick, id2, "nick");
  if (b.status !== "playing") { game = b; break; }
}
assert.equal(game.status, "finished");
const loser = game.loser;
assert.equal(game.wearer, loser, "the loser wears the 💩");
// a stale move is refused
assert.equal((await call(`/api/games/${id2}/act`, { token: carl, method: "POST", body: { act: "pickup", seq: 1 } })).status, 400);

// deal again: the 💩 stays on the loser's head into the next game
const ag = await call(`/api/games/${id2}/again`, { token: nick, method: "POST" });
assert.ok(ag.id);
const g3 = await call(`/api/games/${ag.id}`, { token: carl });
assert.equal(g3.game.reigning, loser); assert.equal(g3.game.wearer, loser);
assert.equal(g3.game.players[0], loser, "the Guffhead deals");
const again2 = await call(`/api/games/${id2}/again`, { token: carl, method: "POST" });
assert.equal(again2.id, ag.id, "a second 'again' follows the first");
// a fresh game between the same two (not via again) also knows who's wearing it
const g4 = await call("/api/games", { token: kate, method: "POST", body: { players: ["carl"] } });
assert.equal(g4.game.reigning, null, "Kate and Carl haven't played");
const g5 = await call("/api/games", { token: carl, method: "POST", body: { players: ["nick"] } });
assert.equal(g5.game.reigning, loser);

// the league: only friends' games count, the score is 💩
const lg = await call("/api/league", { token: kate });
const row = lg.table.find((x) => x.id === loser);
assert.equal(row.poos, 1); assert.equal(lg.current, loser);
assert.ok(!lg.table.find((x) => x.id === "guffbot"), "the house isn't in the league");
const rec = await call("/api/record", { token: carl });
assert.ok(rec.record.length >= 2);

// resign: you're the Guffhead
const r6 = await call(`/api/games/${g4.game.id}/act`, { token: kate, method: "POST", body: { act: "resign" } });
assert.equal(r6.game.loser, "kate");
// chat only where there are people to chat to
assert.equal((await call(`/api/games/${g1.game.id}/chat`, { token: carl, method: "POST", body: { text: "hello" } })).status, 400);
assert.equal((await call(`/api/games/${id2}/chat`, { token: carl, method: "POST", body: { text: "Unlucky" } })).ok, true);
// 10 Nov additions: replay data, watching, the logbook, nudges, "picking cards…", the stat line
const fin = await call(`/api/games/${id2}`, { token: carl });
assert.ok(fin.game.g.events.find((e) => e.k === "start" && e.deal), "a finished game carries its deal, for the replay");
assert.ok(Array.isArray(fin.game.fuss), "fusses worked out at the end");
const watch = await call(`/api/games/${id2}`, { token: kate });
assert.equal(watch.status, 200, "Kate, who plays Carl and Nick, can watch their finished game");
assert.equal(watch.game.watching, true); assert.deepEqual(watch.chat, [], "but never the chat");
const live = await call("/api/games", { token: carl, method: "POST", body: { players: ["nick"] } });
assert.equal((await call(`/api/games/${live.game.id}`, { token: kate })).status, 403, "a game in progress stays private");
const mid = await call(`/api/games/${live.game.id}`, { token: nick });
assert.ok(!mid.game.g.events.find((e) => e.k === "start" && e.deal), "no deal on show mid-game");
const lb = await call("/api/logbook", { token: carl });
assert.ok(lb.games.find((g) => g.id === id2), "logbook has the friends' game");
const nd = await call(`/api/games/${live.game.id}/nudge`, { token: carl, method: "POST" });
assert.equal(nd.status, 400, "no nudging straight away"); assert.match(nd.error, /couple of hours|Nobody/);
await call(`/api/games/${live.game.id}?here=1&doing=picking`, { token: nick });
const seenBy = await call(`/api/games/${live.game.id}?here=1`, { token: carl });
assert.equal(seenBy.doing.nick, "picking", "Carl sees Nick picking cards");
const me2 = await call("/api/me", { token: carl });
assert.ok(Array.isArray(me2.news), "the stat line");
assert.ok(me2.games.every((g) => Array.isArray(g.looking) || g.status !== "playing"), "who's looking, per table");
// invites: anyone can play you with a link
const inv = await call("/api/invites", { token: carl, method: "POST", body: { players: ["guffbot"], settings: { seven: "reverse" } } });
assert.match(inv.url, /#\/join\/[a-z0-9]{8}$/);
const info = await call(`/api/invites/${inv.code}`);
assert.equal(info.invite.hostName, "Carl"); assert.equal(info.invite.status, "open"); assert.deepEqual(info.invite.bots, ["guffbot"]);
assert.equal((await call(`/api/invites/${inv.code}/join`, { method: "POST", body: { name: "x" } })).status, 400, "a name is needed");
const dave = await call(`/api/invites/${inv.code}/join`, { method: "POST", body: { name: "Dave" } });
assert.ok(dave.token && dave.game && dave.me.guest, "Dave's in as a guest");
const dg = await call(`/api/games/${dave.game}`, { token: dave.token });
assert.deepEqual(dg.game.players.slice().sort(), ["carl", dave.me.id, "guffbot"].sort()); assert.equal(dg.game.settings.seven, "reverse");
assert.equal(dg.game.players[0], "carl", "the host sits first");
assert.equal((await call(`/api/invites/${inv.code}/join`, { method: "POST", body: { name: "Eve" } })).status, 400, "one link, one guest");
const back = await call(`/api/invites/${inv.code}/join`, { token: dave.token, method: "POST", body: {} });
assert.equal(back.game, dave.game, "the guest's phone gets back to the same game");
const dme = await call("/api/me", { token: dave.token });
assert.equal(dme.me.guest, true); assert.equal(dme.me.hostName, "Carl"); assert.deepEqual(dme.opponents.map((o) => o.id), ["carl"]);
assert.ok((await call("/api/invites", { token: dave.token, method: "POST", body: {} })).code, "guests can invite their own friends now (14 Nov 2026)");
const cme = await call("/api/me", { token: carl });
assert.ok(cme.opponents.find((o) => o.id === dave.me.id && o.guest), "Carl can deal Dave in again");
const inv2 = await call("/api/invites", { token: carl, method: "POST", body: {} });
const kj = await call(`/api/invites/${inv2.code}/join`, { token: kate, method: "POST", body: {} });
assert.ok(kj.game && !kj.token, "a Guff player joins as themselves");
assert.equal((await call(`/api/invites/${inv2.code}/join`, { token: carl, method: "POST", body: {} })).game, kj.game, "the host can follow the link to the game");
const g3c = await call(`/api/games/${dave.game}/act`, { token: dave.token, method: "POST", body: { act: "resign" } });
assert.equal(g3c.game.loser, dave.me.id);
const lg2 = await call("/api/league", { token: carl });
assert.ok(!lg2.table.find((x) => x.id === dave.me.id), "guest games stay out of the league");
const lb2 = await call("/api/logbook", { token: carl });
assert.ok(!lb2.games.find((g) => g.id === dave.game), "and out of the logbook");
const ag2 = await call(`/api/games/${dave.game}/again`, { token: dave.token, method: "POST" });
assert.ok(ag2.id, "the guest can deal again with the host");
console.log(`worker: ok. Loser of the friends' game: ${loser}, carried into the next game and top of the 💩 league.`);
